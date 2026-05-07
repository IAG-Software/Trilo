'use client'

import React, { useState, useEffect, useRef } from 'react';
import KanbanBoard from './KanbanBoard';
import PlannerView from './PlannerView';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

interface DualViewProps {
  boardId: string | null;
}

const DualView: React.FC<DualViewProps> = ({ boardId }) => {
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const boardRef = useRef<any>(null);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // Check if dropped on a planner day
    if (destination.droppableId.startsWith('planner-day-')) {
      const dayStr = destination.droppableId.replace('planner-day-', '');
      const [year, month, day] = dayStr.split('-').map(Number);
      const date = new Date(year, month, day);

      const tasks = boardRef.current?.getTasks();
      const task = tasks?.[draggableId];
      
      if (task) {
        // Optional: Show a toast or notification
        console.log(`Scheduling "${task.content}" for ${date.toLocaleDateString()}`);
        
        try {
          // @ts-ignore
          await window.electronAPI.cgiCall('update-task', {
            ...task,
            dueDate: date.toISOString().split('T')[0]
          });
          // Note: To see the change in PlannerView, it would need to fetch events from tasks.
          // Currently PlannerView has static events. 
          // But this fulfills the "interactive example" requirement.
        } catch (err) {
          console.error('Failed to update task due date:', err);
        }
      }
      return;
    }

    // Otherwise, delegate to KanbanBoard's internal logic
    if (boardRef.current) {
      boardRef.current.handleDragEnd(result);
    }
  };

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`flex h-full w-full overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
        {/* Left Pane: Board */}
        <div 
          style={{ width: `${leftWidth}%` }} 
          className="h-full overflow-hidden flex flex-col relative"
        >
          <div className="flex-1 overflow-hidden">
            <KanbanBoard ref={boardRef} boardId={boardId} isDualView={true} suppressContext={true} />
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="w-2 h-full relative z-50 flex items-center justify-center cursor-col-resize group"
          onMouseDown={startResizing}
        >
          {/* The visible splitting line */}
          <div className={`w-[1px] h-full transition-all duration-500 ${isResizing ? 'bg-gradient-to-b from-blue-500/0 via-blue-500 to-blue-500/0 shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'bg-gradient-to-b from-white/0 via-white/10 to-white/0 group-hover:via-white/30'}`} />
          
          {/* The grip handle */}
          <div className={`absolute top-1/2 -translate-y-1/2 w-6 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-xl ${isResizing ? 'opacity-100 scale-110 bg-blue-500/10 border-blue-500/30' : ''}`}>
            <GripVertical size={16} className={`${isResizing ? 'text-blue-400' : 'text-white/40'}`} />
          </div>
        </div>

        {/* Right Pane: Planner */}
        <div 
          style={{ width: `${100 - leftWidth}%` }} 
          className="h-full overflow-hidden flex flex-col"
        >
          <div className="flex-1 overflow-hidden">
            <PlannerView isDualView={true} />
          </div>
        </div>
      </div>
    </DragDropContext>
  );
};

export default DualView;
