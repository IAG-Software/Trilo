'use client'

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal, Plus, Sparkles, ExternalLink, Loader2, Edit2, Trash2, Copy, ArrowRight, Flag, ChevronRight } from 'lucide-react';
import { Button, Card, CardBody, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip, Select, SelectItem, Textarea, Progress } from '@nextui-org/react';
import ContextMenu from './ContextMenu';

import { createPortal } from 'react-dom';

interface Task {
  id: string;
  content: string;
  priorityColor: string;
  description?: string;
  tags?: string[];
  checklist?: { id: string; content: string; isCompleted: boolean }[];
  dueDate?: string;
}

interface Column {
  id: string;
  title: string;
  dotColor: string;
  taskIds: string[];
}

interface BoardData {
  id: string;
  title: string;
  tasks: { [key: string]: Task };
  columns: { [key: string]: Column };
  columnOrder: string[];
  customSettings?: {
    description?: string;
    columnWidth?: number;
    cardGap?: number;
    compactMode?: boolean;
    showPriority?: boolean;
    enableAISuggestions?: boolean;
  };
}

const KanbanBoard = forwardRef(({ boardId, isDualView = false, suppressContext = false }: { boardId: string | null, isDualView?: boolean, suppressContext?: boolean }, ref) => {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskContent, setEditingTaskContent] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [filterText, setFilterText] = useState('');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<{ [key: string]: boolean }>({});
  const [newTag, setNewTag] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Portal container for dragging items
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  const fetchBoard = async () => {
    try {
      const board = await window.electronAPI.cgiCall('get-board', { boardId });
      if (board && board.error) {
        console.error('Backend error:', board.error);
        return;
      }
      setData(board);
    } catch (err) {
      console.error('Failed to fetch board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;
    if (!destination || !data) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
      const newColumnOrder = Array.from(data.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);

      const newData = {
        ...data,
        columnOrder: newColumnOrder,
      };
      setData(newData);

      // Sync with backend
      try {
        // Update all positions or just the moved one? 
        // For simplicity, we can just sync the moved one's position, but backend might need re-positioning others.
        // Let's assume the backend handles position as an index.
          await window.electronAPI.cgiCall('update-column-pos', {
          columnId: draggableId,
          position: destination.index
        });
        // We might need to update other columns too if the backend doesn't handle shifts.
        // But usually, we just send the new order or the specific move.
      } catch (err) {
        console.error('Failed to sync column move:', err);
        fetchBoard();
      }
      return;
    }

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    // Update local state immediately for snappy feel
    const newData = { ...data };
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    newData.columns[start.id].taskIds = startTaskIds;

    const finishTaskIds = source.droppableId === destination.droppableId ? startTaskIds : Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    newData.columns[finish.id].taskIds = finishTaskIds;

    setData(newData);

    // Sync with backend
    try {
      await window.electronAPI.cgiCall('update-task-pos', {
        taskId: draggableId,
        columnId: destination.droppableId,
        position: destination.index
      });
    } catch (err) {
      console.error('Failed to sync drag end:', err);
      fetchBoard(); // Revert on failure
    }
  };

  useImperativeHandle(ref, () => ({
    handleDragEnd: onDragEnd,
    getData: () => data,
    getTasks: () => data?.tasks
  }));

  const handleAddTask = async (columnId: string) => {
    if (!newTaskContent.trim() || !data) return;

    const newId = `task-${Date.now()}`;
    const newTask: Task = {
      id: newId,
      content: newTaskContent,
      priorityColor: 'bg-blue-500' // Default
    };

    // Update local
    const newData = { ...data };
    newData.tasks[newId] = newTask;
    newData.columns[columnId].taskIds.push(newId);
    setData(newData);
    setNewTaskContent('');
    setAddingToCol(null);

    // Sync
    try {
      await window.electronAPI.cgiCall('add-task', {
        id: newId,
        columnId: columnId,
        content: newTaskContent,
        priorityColor: newTask.priorityColor,
        position: newData.columns[columnId].taskIds.length - 1
      });
    } catch (err) {
      console.error('Failed to add task:', err);
      fetchBoard();
    }
  };

  const handleAISuggest = async (columnId: string, columnName: string) => {
    try {
      const suggestions = await window.electronAPI.cgiCall('ai-generate-tasks', { columnName });
      
      for (const task of suggestions) {
          await window.electronAPI.cgiCall('add-task', {
          id: task.id,
          columnId: columnId,
          content: task.content,
          priorityColor: task.priorityColor,
          position: 99 // Backend can handle re-ordering or just append
        });
      }
      fetchBoard();
    } catch (err) {
      console.error('AI suggestion failed:', err);
    }
  };

  const handleDeleteTask = async (taskId: string, columnId: string) => {
    if (!data) return;
    // Update local
    const newData = { ...data };
    delete newData.tasks[taskId];
    newData.columns[columnId].taskIds = newData.columns[columnId].taskIds.filter(id => id !== taskId);
    setData(newData);

    // Sync
    try {
      await window.electronAPI.cgiCall('delete-task', { taskId });
    } catch (err) {
      console.error('Failed to delete task:', err);
      fetchBoard();
    }
  };

  const handleDuplicateTask = async (task: Task, columnId: string) => {
    if (!data) return;
    const newId = `task-${Date.now()}`;
    const newTask = { ...task, id: newId };
    
    // Update local
    const newData = { ...data };
    newData.tasks[newId] = newTask;
    newData.columns[columnId].taskIds.push(newId);
    setData(newData);

    // Sync
    try {
      await window.electronAPI.cgiCall('add-task', {
        id: newId,
        columnId: columnId,
        content: task.content,
        priorityColor: task.priorityColor,
        position: newData.columns[columnId].taskIds.length - 1
      });
    } catch (err) {
      console.error('Failed to duplicate task:', err);
      fetchBoard();
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditingTaskContent(task.content);
    onOpen();
  };

  const handleSaveEditTask = async () => {
    if (!selectedTask || !data) return;
    
    const newData = { ...data };
    newData.tasks[selectedTask.id] = { ...selectedTask, content: editingTaskContent };
    setData(newData);
    onOpenChange(); // Close modal

    try {
      await window.electronAPI.cgiCall('update-task', {
        id: selectedTask.id,
        content: editingTaskContent,
        priorityColor: selectedTask.priorityColor,
        dueDate: (selectedTask as any).dueDate,
        type: (selectedTask as any).type,
        priority: (selectedTask as any).priority,
        description: selectedTask.description || '',
        tags: selectedTask.tags || []
      });
    } catch (err) {
      console.error('Failed to update task:', err);
      fetchBoard();
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !selectedTask) return;
    const tags = [...(selectedTask.tags || []), newTag.trim()];
    setSelectedTask({ ...selectedTask, tags });
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedTask) return;
    const tags = (selectedTask.tags || []).filter(t => t !== tagToRemove);
    setSelectedTask({ ...selectedTask, tags });
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim() || !selectedTask) return;
    const newItem = {
      id: `check-${Date.now()}`,
      content: newChecklistItem.trim(),
      isCompleted: false
    };
    
    const updatedTask = {
      ...selectedTask,
      checklist: [...(selectedTask.checklist || []), newItem]
    };
    setSelectedTask(updatedTask);
    
    // Update data locally too
    if (data) {
      const newData = { ...data };
      newData.tasks[selectedTask.id] = updatedTask;
      setData(newData);
    }
    
    setNewChecklistItem('');
    
    try {
      await window.electronAPI.cgiCall('add-checklist-item', {
        id: newItem.id,
        taskId: selectedTask.id,
        content: newItem.content,
        position: (selectedTask.checklist || []).length
      });
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  };

  const toggleChecklistItem = async (itemId: string) => {
    if (!selectedTask || !data) return;
    
    const updatedChecklist = (selectedTask.checklist || []).map(item => 
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    
    const updatedTask = { ...selectedTask, checklist: updatedChecklist };
    setSelectedTask(updatedTask);
    
    const newData = { ...data };
    newData.tasks[selectedTask.id] = updatedTask;
    setData(newData);
    
    const item = updatedChecklist.find(i => i.id === itemId);
    try {
      await window.electronAPI.cgiCall('update-checklist-item', {
        id: itemId,
        isCompleted: item?.isCompleted
      });
    } catch (err) {
      console.error('Failed to update checklist item:', err);
    }
  };

  const toggleCollapse = (columnId: string) => {
    setCollapsedCols(prev => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const handleAddColumn = async () => {
    if (!newListTitle.trim() || !data) return;

    const newId = `col-${Date.now()}`;
    const newColumn: Column = {
      id: newId,
      title: newListTitle,
      dotColor: 'bg-blue-500',
      taskIds: []
    };

    const newData = {
      ...data,
      columns: { ...data.columns, [newId]: newColumn },
      columnOrder: [...data.columnOrder, newId]
    };
    setData(newData);
    setNewListTitle('');
    setIsAddingList(false);

    try {
      await window.electronAPI.cgiCall('add-column', {
        id: newId,
        boardId: data.id,
        title: newListTitle,
        dotColor: newColumn.dotColor,
        position: newData.columnOrder.length - 1
      });
    } catch (err) {
      console.error('Failed to add column:', err);
      fetchBoard();
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!data) return;
    const newData = { ...data };
    delete newData.columns[columnId];
    newData.columnOrder = newData.columnOrder.filter(id => id !== columnId);
    setData(newData);

    try {
      await window.electronAPI.cgiCall('delete-column', { columnId });
    } catch (err) {
      console.error('Failed to delete column:', err);
      fetchBoard();
    }
  };

  const handleRenameColumn = async (columnId: string, newTitle: string) => {
    if (!data || !newTitle.trim()) return;
    const newData = { ...data };
    newData.columns[columnId].title = newTitle;
    setData(newData);

    try {
      await window.electronAPI.cgiCall('update-column', {
        id: columnId,
        title: newTitle
      });
    } catch (err) {
      console.error('Failed to rename column:', err);
      fetchBoard();
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-white/20" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pt-2">
      {/* Board Header / Search Bar */}
      <div className={`${isDualView ? 'px-2' : 'px-6'} mb-6 flex flex-col gap-2`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">{data.title}</h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                {data.columnOrder.length} Lists • {Object.keys(data.tasks).length} Cards
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative group">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Search cards..."
                className="w-64 h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all backdrop-blur-md"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <Button size="sm" variant="flat" className="bg-white/5 text-white/60 h-10 font-bold rounded-2xl hover:bg-white/10 px-4">
              Activity
            </Button>
            <Button size="sm" variant="flat" className="bg-white/5 text-white/60 h-10 font-bold rounded-2xl hover:bg-white/10 px-4">
              Share
            </Button>
          </div>
        </div>
        {data.customSettings?.description && (
          <p className="text-sm text-white/40 max-w-2xl line-clamp-1">{data.customSettings.description}</p>
        )}
      </div>

      {suppressContext ? (
        <Droppable droppableId="all-columns" direction="horizontal" type="column">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`flex gap-3 overflow-x-auto h-full items-start pb-4 custom-scrollbar ${isDualView ? 'px-2' : 'px-6'}`}
            >
              {data.columnOrder.map((columnId, index) => {
                const column = data.columns[columnId];
                const tasks = column.taskIds
                  .map((taskId) => data.tasks[taskId])
                  .filter(task => 
                    task.content.toLowerCase().includes(filterText.toLowerCase())
                  );

                return (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(provided) => (
                      <div 
                        {...provided.draggableProps}
                        ref={provided.innerRef}
                        className={`${collapsedCols[column.id] ? 'w-[60px]' : 'w-[280px]'} transition-all duration-300 flex-shrink-0 flex flex-col max-h-full`}
                      >
                        <div className="glass-panel rounded-[28px] flex flex-col max-h-full overflow-hidden border border-white/5">
                          <ContextMenu
                            items={[
                              { label: 'Add Card', icon: <Plus size={14} />, onClick: () => setAddingToCol(column.id) },
                              { label: 'Rename List', icon: <Edit2 size={14} />, onClick: () => {
                                const newTitle = prompt('Enter new list title:', column.title);
                                if (newTitle) handleRenameColumn(column.id, newTitle);
                              }},
                              { label: 'Delete List', icon: <Trash2 size={14} />, onClick: () => {
                                if (confirm('Are you sure you want to delete this list and all its cards?')) handleDeleteColumn(column.id);
                              }, variant: 'danger' },
                            ]}
                          >
                            <div 
                              {...provided.dragHandleProps}
                              className={`flex items-center justify-between p-3 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors ${collapsedCols[column.id] ? 'flex-col gap-4' : ''}`}
                            >
                              <div className={`flex items-center gap-2 ${collapsedCols[column.id] ? 'rotate-90 origin-center my-8' : ''}`}>
                                <div className={`w-3 h-3 rounded-full ${column.dotColor}`} />
                                <h3 className="text-sm font-bold text-white/90 whitespace-nowrap">{column.title}</h3>
                                {!collapsedCols[column.id] && (
                                  <span className="text-[10px] text-white/30 font-medium px-1.5 py-0.5 rounded-full bg-white/5">
                                    {tasks.length}
                                  </span>
                                )}
                              </div>
                              <div className={`flex ${collapsedCols[column.id] ? 'flex-col' : ''} gap-1`}>
                                <Button 
                                  isIconOnly 
                                  size="sm" 
                                  variant="light" 
                                  className="text-white/40 h-6 w-6"
                                  onPress={() => toggleCollapse(column.id)}
                                >
                                  {collapsedCols[column.id] ? <ChevronRight size={14} /> : <ChevronRight size={14} className="rotate-180" />}
                                </Button>
                                {!collapsedCols[column.id] && (
                                  <Button 
                                    isIconOnly 
                                    size="sm" 
                                    variant="light" 
                                    className="text-white/40 h-6 w-6"
                                    onPress={() => handleAISuggest(column.id, column.title)}
                                  >
                                    <Sparkles size={12} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </ContextMenu>

                  {/* Task List */}
                        {!collapsedCols[column.id] && (
                          <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex-1 flex flex-col p-2 overflow-y-auto column-scrollbar min-h-[50px]"
                                style={{ gap: data.customSettings?.cardGap || 8 }}
                              >
                        {tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => {
                              const child = (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={provided.draggableProps.style}
                                  className={snapshot.isDragging ? 'z-[9999]' : ''}
                                >
                                  <ContextMenu
                                    items={[
                                      { label: 'Edit Card', icon: <Edit2 size={14} />, onClick: () => handleEditTask(task) },
                                      { label: 'Copy Card', icon: <Copy size={14} />, onClick: () => handleDuplicateTask(task, column.id) },
                                      { label: 'Move to Next List', icon: <ArrowRight size={14} />, onClick: () => {
                                        const currentIndex = data.columnOrder.indexOf(column.id);
                                        const nextColumnId = data.columnOrder[currentIndex + 1];
                                        if (nextColumnId) {
                                          onDragEnd({
                                            draggableId: task.id,
                                            source: { droppableId: column.id, index },
                                            destination: { droppableId: nextColumnId, index: 0 },
                                            reason: 'DROP'
                                          } as any);
                                        }
                                      }},
                                      { label: 'Change Priority', icon: <Flag size={14} />, onClick: () => {
                                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500'];
                                        const currentIndex = colors.indexOf(task.priorityColor);
                                        const nextColor = colors[(currentIndex + 1) % colors.length];
                                        const newData = { ...data };
                                        newData.tasks[task.id].priorityColor = nextColor;
                                        setData(newData);
                                        // Sync update
                                        // @ts-ignore
                                        window.electronAPI.cgiCall('update-task', { ...task, priorityColor: nextColor });
                                      }},
                                      { label: 'Delete Card', icon: <Trash2 size={14} />, onClick: () => handleDeleteTask(task.id, column.id), variant: 'danger' },
                                    ]}
                                  >
                                    <Card
                                      className={`glass-card shadow-none rounded-2xl border-white/5 cursor-grab active:cursor-grabbing transition-all hover:border-white/20 ${
                                        snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 scale-105' : ''
                                      }`}
                                    >
                                      <CardBody className="p-3 gap-2">
                                        <div className={`w-8 h-1.5 rounded-full ${task.priorityColor} opacity-80`} />
                                          <div className="flex flex-col gap-2">
                                            <p className="text-[13px] font-medium text-white/80 leading-snug">{task.content}</p>
                                            
                                            {/* Tags Preview */}
                                            {task.tags && task.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {task.tags.map(tag => (
                                                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/40 font-bold uppercase tracking-wider">
                                                    {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            )}

                                            {/* Checklist Progress */}
                                            {task.checklist && task.checklist.length > 0 && (
                                              <div className="mt-2 space-y-1">
                                                <div className="flex items-center justify-between text-[9px] text-white/30 font-bold uppercase tracking-widest">
                                                  <span>Progress</span>
                                                  <span>{task.checklist.filter(i => i.isCompleted).length}/{task.checklist.length}</span>
                                                </div>
                                                <Progress 
                                                  size="sm" 
                                                  value={(task.checklist.filter(i => i.isCompleted).length / task.checklist.length) * 100}
                                                  className="max-w-md"
                                                  classNames={{
                                                    indicator: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
                                                    track: "bg-white/5"
                                                  }}
                                                />
                                              </div>
                                            )}
                                          </div>
                                      </CardBody>
                                    </Card>
                                  </ContextMenu>
                                </div>
                              );

                              if (snapshot.isDragging && portalNode) {
                                return createPortal(child, portalNode);
                              }
                              return child;
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {addingToCol === column.id && (
                          <div className="flex flex-col gap-2 p-1">
                            <textarea
                              autoFocus
                              className="w-full glass-card p-3 rounded-2xl text-xs text-white outline-none border-blue-500/50"
                              placeholder="Enter a title for this card..."
                              value={newTaskContent}
                              onChange={(e) => setNewTaskContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddTask(column.id);
                                }
                                if (e.key === 'Escape') setAddingToCol(null);
                              }}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" color="primary" className="h-8 font-bold rounded-xl" onPress={() => handleAddTask(column.id)}>
                                Add card
                              </Button>
                              <Button size="sm" variant="light" className="h-8 text-white/60 rounded-xl" onPress={() => setAddingToCol(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                        )}

                  {/* Add Card Button */}
                  {addingToCol !== column.id && !collapsedCols[column.id] && (
                    <div className="p-2 flex items-center justify-between">
                      <Button 
                        variant="light" 
                        size="sm"
                        startContent={<Plus size={16} />}
                        className="text-xs text-white/60 hover:text-white hover:bg-white/5 h-8 flex-1 justify-start px-2"
                        onPress={() => setAddingToCol(column.id)}
                      >
                        Add a card
                      </Button>
                    </div>
                  )}
                </div>
              </div>
                    )}
                  </Draggable>
                );
              })}
              
              <div className="w-[280px] flex-shrink-0">
                {isAddingList ? (
                  <div className="glass-panel rounded-[28px] p-3 flex flex-col gap-2 border border-blue-500/30">
                    <Input
                      autoFocus
                      placeholder="Enter list title..."
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddColumn();
                        if (e.key === 'Escape') setIsAddingList(false);
                      }}
                      variant="flat"
                      className="bg-white/5"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" color="primary" className="h-8 font-bold rounded-xl" onPress={handleAddColumn}>
                        Add List
                      </Button>
                      <Button size="sm" variant="light" className="h-8 text-white/60 rounded-xl" onPress={() => setIsAddingList(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    fullWidth
                    className="bg-white/10 hover:bg-white/20 text-white/80 font-bold h-12 rounded-2xl justify-start px-4 border border-white/10 backdrop-blur-md"
                    startContent={<Plus size={18} />}
                    onPress={() => setIsAddingList(true)}
                  >
                    Add another list
                  </Button>
                )}
              </div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="all-columns" direction="horizontal" type="column">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`flex gap-3 overflow-x-auto h-full items-start pb-4 custom-scrollbar ${isDualView ? 'px-2' : 'px-6'}`}
              >
                {data.columnOrder.map((columnId, index) => {
                  const column = data.columns[columnId];
                  const tasks = column.taskIds
                    .map((taskId) => data.tasks[taskId])
                    .filter(task => 
                      task.content.toLowerCase().includes(filterText.toLowerCase())
                    );

                  return (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided) => (
                        <div 
                          {...provided.draggableProps}
                          ref={provided.innerRef}
                          className={`${collapsedCols[column.id] ? 'w-[60px]' : 'w-[280px]'} transition-all duration-300 flex-shrink-0 flex flex-col max-h-full`}
                        >
                          <div className="glass-panel rounded-[28px] flex flex-col max-h-full overflow-hidden border border-white/5">
                            <ContextMenu
                              items={[
                                { label: 'Add Card', icon: <Plus size={14} />, onClick: () => setAddingToCol(column.id) },
                                { label: 'Rename List', icon: <Edit2 size={14} />, onClick: () => {
                                  const newTitle = prompt('Enter new list title:', column.title);
                                  if (newTitle) handleRenameColumn(column.id, newTitle);
                                }},
                                { label: 'Delete List', icon: <Trash2 size={14} />, onClick: () => {
                                  if (confirm('Are you sure you want to delete this list and all its cards?')) handleDeleteColumn(column.id);
                                }, variant: 'danger' },
                              ]}
                            >
                              <div 
                                {...provided.dragHandleProps}
                                className={`flex items-center justify-between p-3 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors ${collapsedCols[column.id] ? 'flex-col gap-4' : ''}`}
                              >
                                <div className={`flex items-center gap-2 ${collapsedCols[column.id] ? 'rotate-90 origin-center my-8' : ''}`}>
                                  <div className={`w-3 h-3 rounded-full ${column.dotColor}`} />
                                  <h3 className="text-sm font-bold text-white/90 whitespace-nowrap">{column.title}</h3>
                                  {!collapsedCols[column.id] && (
                                    <span className="text-[10px] text-white/30 font-medium px-1.5 py-0.5 rounded-full bg-white/5">
                                      {tasks.length}
                                    </span>
                                  )}
                                </div>
                                <div className={`flex ${collapsedCols[column.id] ? 'flex-col' : ''} gap-1`}>
                                  <Button 
                                    isIconOnly 
                                    size="sm" 
                                    variant="light" 
                                    className="text-white/40 h-6 w-6"
                                    onPress={() => toggleCollapse(column.id)}
                                  >
                                    {collapsedCols[column.id] ? <ChevronRight size={14} /> : <ChevronRight size={14} className="rotate-180" />}
                                  </Button>
                                  {!collapsedCols[column.id] && (
                                    <Button 
                                      isIconOnly 
                                      size="sm" 
                                      variant="light" 
                                      className="text-white/40 h-6 w-6"
                                      onPress={() => handleAISuggest(column.id, column.title)}
                                    >
                                      <Sparkles size={12} />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </ContextMenu>

                    {/* Task List */}
                          {!collapsedCols[column.id] && (
                            <Droppable droppableId={column.id}>
                              {(provided, snapshot) => (
                                <div
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                  className="flex-1 flex flex-col p-2 overflow-y-auto column-scrollbar min-h-[50px]"
                                  style={{ gap: data.customSettings?.cardGap || 8 }}
                                >
                          {tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => {
                                const child = (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                    className={snapshot.isDragging ? 'z-[9999]' : ''}
                                  >
                                    <ContextMenu
                                      items={[
                                        { label: 'Edit Card', icon: <Edit2 size={14} />, onClick: () => handleEditTask(task) },
                                        { label: 'Copy Card', icon: <Copy size={14} />, onClick: () => handleDuplicateTask(task, column.id) },
                                        { label: 'Move to Next List', icon: <ArrowRight size={14} />, onClick: () => {
                                          const currentIndex = data.columnOrder.indexOf(column.id);
                                          const nextColumnId = data.columnOrder[currentIndex + 1];
                                          if (nextColumnId) {
                                            onDragEnd({
                                              draggableId: task.id,
                                              source: { droppableId: column.id, index },
                                              destination: { droppableId: nextColumnId, index: 0 },
                                              reason: 'DROP'
                                            } as any);
                                          }
                                        }},
                                        { label: 'Change Priority', icon: <Flag size={14} />, onClick: () => {
                                          const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500'];
                                          const currentIndex = colors.indexOf(task.priorityColor);
                                          const nextColor = colors[(currentIndex + 1) % colors.length];
                                          const newData = { ...data };
                                          newData.tasks[task.id].priorityColor = nextColor;
                                          setData(newData);
                                          // Sync update
                                          window.electronAPI.cgiCall('update-task', { ...task, priorityColor: nextColor });
                                        }},
                                        { label: 'Delete Card', icon: <Trash2 size={14} />, onClick: () => handleDeleteTask(task.id, column.id), variant: 'danger' },
                                      ]}
                                    >
                                      <Card
                                        className={`glass-card shadow-none rounded-2xl border-white/5 cursor-grab active:cursor-grabbing transition-all hover:border-white/20 ${
                                          snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 scale-105' : ''
                                        }`}
                                      >
                                        <CardBody className="p-3 gap-2">
                                          <div className={`w-8 h-1.5 rounded-full ${task.priorityColor} opacity-80`} />
                                            <div className="flex flex-col gap-2">
                                              <p className="text-[13px] font-medium text-white/80 leading-snug">{task.content}</p>
                                              
                                              {/* Tags Preview */}
                                              {task.tags && task.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {task.tags.map(tag => (
                                                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/40 font-bold uppercase tracking-wider">
                                                      {tag}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}

                                              {/* Checklist Progress */}
                                              {task.checklist && task.checklist.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                  <div className="flex items-center justify-between text-[9px] text-white/30 font-bold uppercase tracking-widest">
                                                    <span>Progress</span>
                                                    <span>{task.checklist.filter(i => i.isCompleted).length}/{task.checklist.length}</span>
                                                  </div>
                                                  <Progress 
                                                    size="sm" 
                                                    value={(task.checklist.filter(i => i.isCompleted).length / task.checklist.length) * 100}
                                                    className="max-w-md"
                                                    classNames={{
                                                      indicator: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
                                                      track: "bg-white/5"
                                                    }}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                        </CardBody>
                                      </Card>
                                    </ContextMenu>
                                  </div>
                                );

                                if (snapshot.isDragging && portalNode) {
                                  return createPortal(child, portalNode);
                                }
                                return child;
                              }}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {addingToCol === column.id && (
                            <div className="flex flex-col gap-2 p-1">
                              <textarea
                                autoFocus
                                className="w-full glass-card p-3 rounded-2xl text-xs text-white outline-none border-blue-500/50"
                                placeholder="Enter a title for this card..."
                                value={newTaskContent}
                                onChange={(e) => setNewTaskContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddTask(column.id);
                                  }
                                  if (e.key === 'Escape') setAddingToCol(null);
                                }}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" color="primary" className="h-8 font-bold rounded-xl" onPress={() => handleAddTask(column.id)}>
                                  Add card
                                </Button>
                                <Button size="sm" variant="light" className="h-8 text-white/60 rounded-xl" onPress={() => setAddingToCol(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                          )}

                    {/* Add Card Button */}
                    {addingToCol !== column.id && !collapsedCols[column.id] && (
                      <div className="p-2 flex items-center justify-between">
                        <Button 
                          variant="light" 
                          size="sm"
                          startContent={<Plus size={16} />}
                          className="text-xs text-white/60 hover:text-white hover:bg-white/5 h-8 flex-1 justify-start px-2"
                          onPress={() => setAddingToCol(column.id)}
                        >
                          Add a card
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                      )}
                    </Draggable>
                  );
                })}
                
                <div className="w-[280px] flex-shrink-0">
                  {isAddingList ? (
                    <div className="glass-panel rounded-[28px] p-3 flex flex-col gap-2 border border-blue-500/30">
                      <Input
                        autoFocus
                        placeholder="Enter list title..."
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddColumn();
                          if (e.key === 'Escape') setIsAddingList(false);
                        }}
                        variant="flat"
                        className="bg-white/5"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" color="primary" className="h-8 font-bold rounded-xl" onPress={handleAddColumn}>
                          Add List
                        </Button>
                        <Button size="sm" variant="light" className="h-8 text-white/60 rounded-xl" onPress={() => setIsAddingList(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      fullWidth
                      className="bg-white/10 hover:bg-white/20 text-white/80 font-bold h-12 rounded-2xl justify-start px-4 border border-white/10 backdrop-blur-md"
                      startContent={<Plus size={18} />}
                      onPress={() => setIsAddingList(true)}
                    >
                      Add another list
                    </Button>
                  )}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        backdrop="blur"
        size="2xl"
        classNames={{
          base: "bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[32px]",
          header: "border-b border-white/5",
          footer: "border-t border-white/5",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedTask?.priorityColor}`} />
                  <span className="text-white/90 text-lg">Edit Card</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Card Title</label>
                    <Textarea
                      variant="flat"
                      className="bg-white/5"
                      value={editingTaskContent}
                      onChange={(e) => setEditingTaskContent(e.target.value)}
                      classNames={{
                        input: "text-white text-lg font-medium",
                        inputWrapper: "bg-white/5 hover:bg-white/10 border-white/5 transition-all rounded-2xl"
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Description</label>
                    <Textarea
                      placeholder="Add a more detailed description..."
                      variant="flat"
                      value={selectedTask?.description || ''}
                      onChange={(e) => {
                        if (selectedTask) setSelectedTask({ ...selectedTask, description: e.target.value });
                      }}
                      classNames={{
                        input: "text-white text-sm",
                        inputWrapper: "bg-white/5 hover:bg-white/10 border-white/5 transition-all rounded-2xl"
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Checklist</label>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {selectedTask?.checklist?.map(item => (
                            <div key={item.id} className="flex items-center gap-3 group">
                              <button 
                                onClick={() => toggleChecklistItem(item.id)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                  item.isCompleted ? 'bg-blue-500 border-blue-500' : 'bg-white/5 border-white/10 group-hover:border-white/30'
                                }`}
                              >
                                {item.isCompleted && <Plus size={14} className="rotate-45 text-white" />}
                              </button>
                              <span className={`text-sm ${item.isCompleted ? 'text-white/30 line-through' : 'text-white/80'}`}>
                                {item.content}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input
                            size="sm"
                            placeholder="Add item..."
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                            className="bg-white/5"
                          />
                          <Button size="sm" isIconOnly variant="flat" onPress={handleAddChecklistItem} className="bg-white/10">
                            <Plus size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Priority</label>
                        <Select 
                          variant="flat"
                          className="bg-white/5"
                          selectedKeys={[selectedTask?.priorityColor || 'bg-blue-500']}
                          onSelectionChange={(keys) => {
                            const key = Array.from(keys)[0] as string;
                            if (selectedTask) setSelectedTask({ ...selectedTask, priorityColor: key });
                          }}
                          classNames={{
                            trigger: "bg-white/5 hover:bg-white/10 rounded-xl",
                            value: "text-white/80"
                          }}
                        >
                          <SelectItem key="bg-blue-500" value="bg-blue-500" textValue="Low">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>Low</span>
                            </div>
                          </SelectItem>
                          <SelectItem key="bg-emerald-500" value="bg-emerald-500" textValue="Medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>Medium</span>
                            </div>
                          </SelectItem>
                          <SelectItem key="bg-amber-500" value="bg-amber-500" textValue="High">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>High</span>
                            </div>
                          </SelectItem>
                          <SelectItem key="bg-red-500" value="bg-red-500" textValue="Urgent">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span>Urgent</span>
                            </div>
                          </SelectItem>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedTask?.tags?.map(tag => (
                            <Chip 
                              key={tag} 
                              onClose={() => handleRemoveTag(tag)}
                              variant="flat"
                              className="bg-white/10 text-white/60 border-white/5"
                            >
                              {tag}
                            </Chip>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            size="sm"
                            placeholder="Add tag..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            className="bg-white/5"
                          />
                          <Button size="sm" isIconOnly variant="flat" onPress={handleAddTag} className="bg-white/10">
                            <Plus size={16} />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Due Date</label>
                        <Input
                          type="date"
                          variant="flat"
                          value={(selectedTask as any)?.dueDate || ''}
                          onChange={(e) => {
                            if (selectedTask) setSelectedTask({ ...selectedTask, dueDate: e.target.value } as any);
                          }}
                          classNames={{
                            input: "text-white/80",
                            inputWrapper: "bg-white/5 hover:bg-white/10 rounded-xl"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" className="text-white/40" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" className="rounded-xl font-bold px-8" onPress={handleSaveEditTask}>
                  Save Changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
  }
);

KanbanBoard.displayName = 'KanbanBoard';

export default KanbanBoard;
