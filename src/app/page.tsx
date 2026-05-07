'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import KanbanBoard from '@/components/KanbanBoard';
import SwitchBoardView from '@/components/SwitchBoardView';
import PlannerView from '@/components/PlannerView';
import SettingsView from '@/components/SettingsView';
import CommandPalette from '@/components/CommandPalette';
import BoardSettingsModal from '@/components/BoardSettingsModal';
import DualView from '@/components/DualView';
import WindowControls from '@/components/WindowControls';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Plus, 
  Sparkles, 
  Search, 
  Bell, 
  User, 
  MoreHorizontal,
  Layout,
  Menu,
  Clock,
  Star,
  Zap,
  TrendingUp,
  Brain,
  Grid,
  RotateCw,
  MessageSquare,
  Trash2,
  FileText,
  LogOut,
  Edit3,
  Sliders
} from 'lucide-react';
import { 
  Button, 
  Avatar, 
  Card, 
  CardBody, 
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Kbd
} from '@nextui-org/react';

import { BACKGROUNDS } from '@/lib/constants';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [bgIndex, setBgIndex] = useState(0);
  const [boardBgIndex, setBoardBgIndex] = useState<number | null>(null);
  const [userName, setUserName] = useState('Alexander');
  const [boards, setBoards] = useState<any[]>([]);
  const [currentBoardData, setCurrentBoardData] = useState<any>(null);
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const { 
    isOpen: isSettingsOpen, 
    onOpen: onSettingsOpen, 
    onOpenChange: onSettingsOpenChange 
  } = useDisclosure();
  const [newBoardTitle, setNewBoardTitle] = useState('');

  const [stats, setStats] = useState<any>(null);
  const [quickTaskContent, setQuickTaskContent] = useState('');
  const { 
    isOpen: isSearchOpen, 
    onOpen: onSearchOpen, 
    onOpenChange: onSearchOpenChange 
  } = useDisclosure();

  const fetchStats = async () => {
    try {
      // @ts-expect-error
      const data = await window.electronAPI?.cgiCall('get-home-stats', {});
      if (data && !data.error) setStats(data);
    } catch (err) {
      console.error('Failed to fetch home stats:', err);
    }
  };

  const fetchBoards = async () => {
    try {
      // @ts-expect-error
      const data = await window.electronAPI?.cgiCall('get-boards', {});
      if (data && !data.error) setBoards(data);
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    }
  };

  useEffect(() => {
    fetchBoards();
    fetchStats();
    const loadSettings = async () => {
      try {
        // @ts-expect-error
        const savedBg = await window.electronAPI?.cgiCall('get-setting', { key: 'bgIndex' });
        if (savedBg !== null && !savedBg.error) setBgIndex(parseInt(savedBg));
        
        // @ts-expect-error
        const savedName = await window.electronAPI?.cgiCall('get-setting', { key: 'userName' });
        if (savedName && !savedName.error) setUserName(savedName);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onSearchOpen();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const changeBackground = async () => {
    const currentIndex = activeTab === 'board' && boardBgIndex !== null ? boardBgIndex : bgIndex;
    const nextIndex = (currentIndex + 1) % BACKGROUNDS.length;
    
    if (activeTab === 'board' && selectedBoardId) {
      setBoardBgIndex(nextIndex);
      try {
        // @ts-expect-error
        await window.electronAPI.cgiCall('update-board-wallpaper', { boardId: selectedBoardId, wallpaperIndex: nextIndex });
        // Refresh boards list to update gallery if needed
        fetchBoards();
      } catch (err) {
        console.error('Failed to save board wallpaper:', err);
      }
    } else {
      setBgIndex(nextIndex);
      try {
        // @ts-expect-error
        await window.electronAPI.cgiCall('save-setting', { key: 'bgIndex', value: nextIndex });
      } catch (err) {
        console.error('Failed to save background setting:', err);
      }
    }
  };

  const handleSelectBoard = async (id: string) => {
    setSelectedBoardId(id);
    if (activeTab !== 'dual') {
      setActiveTab('board');
    }
    try {
      // @ts-expect-error
      const boardData = await window.electronAPI.cgiCall('get-board', { boardId: id });
      if (boardData && !boardData.error) {
        setCurrentBoardData(boardData);
        setBoardBgIndex(boardData.wallpaperIndex !== undefined ? boardData.wallpaperIndex : null);
      }
    } catch (err) {
      console.error('Failed to fetch board details for wallpaper:', err);
    }
  };

  const handleSaveBoardSettings = async (title: string, settings: any, wallpaperIndex: number | null) => {
    if (!selectedBoardId) return;
    try {
      // @ts-expect-error
      await window.electronAPI.cgiCall('update-board-settings', { 
        boardId: selectedBoardId, 
        title, 
        settings 
      });
      
      if (wallpaperIndex !== boardBgIndex) {
        // @ts-expect-error
        await window.electronAPI.cgiCall('update-board-wallpaper', { 
          boardId: selectedBoardId, 
          wallpaperIndex 
        });
        setBoardBgIndex(wallpaperIndex);
      }
      
      // Refresh
      await handleSelectBoard(selectedBoardId);
      await fetchBoards();
    } catch (err) {
      console.error('Failed to save board settings:', err);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;
    try {
      // @ts-expect-error
      const result = await window.electronAPI.cgiCall('create-board', { title: newBoardTitle });
      if (result && !result.error) {
        setNewBoardTitle('');
        onOpenChange();
        await fetchBoards();
        handleSelectBoard(result.id);
      }
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  const handleDeleteBoard = async () => {
    if (!selectedBoardId) return;
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) return;
    
    try {
      // @ts-expect-error
      await window.electronAPI.cgiCall('delete-board', { boardId: selectedBoardId });
      setActiveTab('home');
      setSelectedBoardId(null);
      await fetchBoards();
      await fetchStats();
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('CRITICAL: This will delete ALL your boards and tasks. Are you sure?')) return;
    
    try {
      // @ts-expect-error
      await window.electronAPI.cgiCall('reset-db', {});
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset database:', err);
    }
  };

  const handleRefresh = async () => {
    await fetchBoards();
    await fetchStats();
  };

  const handleQuickTask = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && quickTaskContent.trim()) {
      try {
        // Find the first board to add the task to
        if (boards.length === 0) return;
        const firstBoardId = boards[0].id;
        
        // Get board details to find the first column
        // @ts-expect-error
        const boardData = await window.electronAPI.cgiCall('get-board', { boardId: firstBoardId });
        if (!boardData || boardData.error || !boardData.columnOrder.length) return;
        
        const firstColId = boardData.columnOrder[0];
        
        // @ts-expect-error
        await window.electronAPI.cgiCall('add-task', {
          id: `task-${Math.random().toString(36).substr(2, 9)}`,
          columnId: firstColId,
          content: quickTaskContent,
          priorityColor: 'bg-blue-500',
          position: 0
        });
        
        setQuickTaskContent('');
        fetchStats();
      } catch (err) {
        console.error('Failed to add quick task:', err);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView 
            boards={boards} 
            stats={stats}
            onSelectBoard={handleSelectBoard} 
            onCreateBoard={onOpen} 
            userName={userName}
            quickTaskContent={quickTaskContent}
            setQuickTaskContent={setQuickTaskContent}
            handleQuickTask={handleQuickTask}
            onViewGallery={() => setActiveTab('switch')}
          />
        );
      case 'board':
        return <KanbanBoard boardId={selectedBoardId} />;
      case 'switch':
        return <SwitchBoardView onSelectBoard={handleSelectBoard} onCreateBoard={onOpen} />;
      case 'inbox':
        return <NotesView title="Inbox" icon={<Bell size={48} className="mb-4 opacity-20" />} />;
      case 'planner':
        return <PlannerView />;
      case 'dual':
        return <DualView boardId={selectedBoardId} />;
      case 'settings':
        return <SettingsView 
          onUpdateName={(name) => setUserName(name)} 
          onUpdateBg={(index) => setBgIndex(index)}
          currentName={userName}
          currentBg={bgIndex}
        />;
      default:
        return (
          <HomeView 
            boards={boards} 
            stats={stats}
            onSelectBoard={handleSelectBoard} 
            onCreateBoard={onOpen} 
            userName={userName}
            quickTaskContent={quickTaskContent}
            setQuickTaskContent={setQuickTaskContent}
            handleQuickTask={handleQuickTask}
            onViewGallery={() => setActiveTab('switch')}
          />
        );
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans">
      {/* Dynamic Nature Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
        style={{ backgroundImage: `url(${BACKGROUNDS[activeTab === 'board' && boardBgIndex !== null ? boardBgIndex : bgIndex]})` }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Main Container */}
      <div className="relative flex flex-col h-full w-full">
        
        <header 
          id="main-header" 
          data-tauri-drag-region 
          className="h-10 glass-header px-3 flex items-center justify-between z-40 drag-region border-b border-white/5"
        >
          {/* Logo Section */}
          <div className="flex items-center gap-4 no-drag">
            <div className="flex items-center gap-2 font-bold text-white tracking-tight cursor-pointer" onClick={() => setActiveTab('home')}>
              <img src="/logo-white.svg" alt="Trilo Logo" className="w-[16px] h-[16px]" />
              <span className="text-sm">Trilo</span>
            </div>
          </div>

          {/* Search Section (Middle) */}
          <div className="flex-1 flex justify-center no-drag">
            <div 
              className="relative w-72 group cursor-pointer"
              onClick={onSearchOpen}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white/80 transition-colors" size={13} />
              <div className="w-full bg-white/5 border border-white/10 rounded-lg py-1 pl-9 pr-2 text-xs text-white/40 hover:bg-white/10 transition-all flex items-center justify-between">
                <span>Search everything...</span>
                <div className="flex items-center gap-0.5 opacity-60">
                  <Kbd keys={["command"]} className="bg-transparent border-none text-[9px] min-w-0 p-0 shadow-none">⌘</Kbd>
                  <span className="text-[9px]">K</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Actions & Window Controls */}
          <div className="flex items-center gap-1 no-drag">
            <Button isIconOnly variant="light" size="sm" className="text-white/60 hover:text-white h-8 w-8 min-w-0">
              <Bell size={16} />
            </Button>
            <Avatar size="sm" src="https://i.pravatar.cc/150?u=a042581f4e29026704d" className="w-6 h-6 ml-1 cursor-pointer" />
            
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            
            <WindowControls />
          </div>
        </header>

        {/* Dynamic Header based on Tab */}
        <div className="h-14 px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">
              {activeTab === 'home' ? 'Home' : activeTab === 'settings' ? 'Settings' : activeTab === 'switch' ? 'Board Gallery' : activeTab === 'dual' ? 'Split View' : (currentBoardData?.title || 'Trilo Core Development')}
            </h1>
            {activeTab === 'board' && (
              <>
                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                  <Button size="sm" variant="light" className="text-white/80 text-xs font-bold h-7 px-3 rounded-lg">
                    Board
                  </Button>
                  <Button isIconOnly size="sm" variant="light" className="text-white/80 h-7 rounded-lg">
                    <ChevronRight size={14} className="rotate-90 opacity-50" />
                  </Button>
                </div>
                <div className="flex items-center -space-x-2 ml-4">
                  {[1, 2, 3].map(i => (
                    <Avatar key={i} size="sm" className="w-7 h-7 border-2 border-black/20" src={`https://i.pravatar.cc/150?u=${i}`} />
                  ))}
                  <Button isIconOnly size="sm" className="w-7 h-7 min-w-0 rounded-full bg-white/10 text-white/80 text-[10px]">
                    +12
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  variant="flat" 
                  className="bg-white/10 text-white/80 text-xs font-bold h-7 px-3 rounded-lg ml-2 hover:bg-white/20"
                  startContent={<Sliders size={14} />}
                  onPress={onSettingsOpen}
                >
                  Board Settings
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button isIconOnly variant="light" size="sm" className="text-white/80" onPress={changeBackground} title="Change Background">
              <Sparkles size={18} />
            </Button>
            
            <Dropdown placement="bottom-end" className="glass-panel border border-white/10 text-white">
              <DropdownTrigger>
                <Button isIconOnly variant="light" size="sm" className="text-white/80">
                  <MoreHorizontal size={20} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Action Menu" className="p-2">
                <DropdownItem 
                  key="refresh" 
                  startContent={<RotateCw size={16} />}
                  onPress={handleRefresh}
                  className="hover:bg-white/10"
                >
                  Refresh Workspace
                </DropdownItem>
                <DropdownItem 
                  key="export" 
                  startContent={<FileText size={16} />}
                  onPress={() => alert('Exporting data... (Feature coming soon)')}
                  className="hover:bg-white/10"
                >
                  Export Data
                </DropdownItem>
                
                {activeTab === 'board' ? (
                  <DropdownItem 
                    key="delete-board" 
                    className="text-red-400 hover:bg-red-500/10"
                    color="danger"
                    startContent={<Trash2 size={16} />}
                    onPress={handleDeleteBoard}
                  >
                    Delete Current Board
                  </DropdownItem>
                ) : (
                  <DropdownItem key="no-op" className="hidden" />
                )}

                <DropdownItem 
                  key="reset" 
                  className="text-red-500 hover:bg-red-500/10"
                  color="danger"
                  startContent={<LogOut size={16} />}
                  onPress={handleResetDatabase}
                >
                  Reset All Data
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* Content Area */}
        <main id="main-content" className="flex-1 overflow-y-auto px-6 pb-24 relative custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating Bottom Dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      {/* Create Board Modal */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        backdrop="blur"
        className="glass-panel border border-white/10 rounded-[32px]"
        classNames={{
          base: "bg-black/60",
          header: "border-b border-white/10",
          footer: "border-t border-white/10"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white">Create New Board</ModalHeader>
              <ModalBody>
                <div className="space-y-4 py-4">
                  <Input
                    autoFocus
                    label="Board Title"
                    placeholder="Enter board title..."
                    variant="bordered"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    className="text-white"
                    classNames={{
                      input: "text-white",
                      label: "text-white/60",
                      inputWrapper: "border-white/10 focus-within:border-blue-500/50"
                    }}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <p className="text-xs text-white/40 w-full">Select a gradient theme</p>
                    {['from-blue-600', 'from-emerald-600', 'from-purple-600', 'from-orange-600'].map(color => (
                      <div key={color} className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} to-black/40 border border-white/20 cursor-pointer hover:scale-110 transition-transform`} />
                    ))}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="text-white/60">
                  Cancel
                </Button>
                <Button color="primary" onPress={handleCreateBoard} className="font-bold">
                  Create Board
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <CommandPalette 
        isOpen={isSearchOpen} 
        onOpenChange={onSearchOpenChange}
        onSelectBoard={handleSelectBoard}
        onNavigate={(tab) => setActiveTab(tab)}
        onCreateBoard={onOpen}
        onResetData={handleResetDatabase}
      />

      {selectedBoardId && currentBoardData && (
        <BoardSettingsModal 
          isOpen={isSettingsOpen}
          onOpenChange={onSettingsOpenChange}
          boardId={selectedBoardId}
          boardTitle={currentBoardData.title}
          currentSettings={currentBoardData.customSettings || {}}
          currentWallpaperIndex={boardBgIndex}
          onSave={handleSaveBoardSettings}
          onDelete={handleDeleteBoard}
        />
      )}
    </div>
  );
}
interface HomeViewProps {
  boards: any[];
  stats: any;
  onSelectBoard: (id: string) => void;
  onCreateBoard: () => void;
  userName: string;
  quickTaskContent: string;
  setQuickTaskContent: (val: string) => void;
  handleQuickTask: (e: React.KeyboardEvent) => void;
  onViewGallery: () => void;
}

function HomeView({ 
  boards, 
  stats, 
  onSelectBoard, 
  onCreateBoard, 
  userName, 
  quickTaskContent, 
  setQuickTaskContent, 
  handleQuickTask, 
  onViewGallery 
}: HomeViewProps) {
  const completionRate = stats ? Math.round((stats.completedTasks / (stats.totalTasks || 1)) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto pt-4 space-y-12">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h2 className="text-4xl font-bold text-white tracking-tight">Good evening, {userName}.</h2>
          <p className="text-white/60 text-lg">You have {stats?.upcomingTasks?.length || 0} active tasks to focus on today.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full md:w-80"
        >
          <div className="relative group">
            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 group-focus-within:animate-pulse" size={16} />
            <input 
              type="text" 
              placeholder="Quick capture task... (Enter to save)" 
              className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:bg-white/10 focus:border-blue-500/50 focus:outline-none transition-all backdrop-blur-md"
              value={quickTaskContent}
              onChange={(e) => setQuickTaskContent(e.target.value)}
              onKeyDown={handleQuickTask}
            />
          </div>
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Upcoming */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Boards', value: stats?.totalBoards || 0, icon: <Layout size={16} />, color: 'text-blue-400' },
              { label: 'Tasks', value: stats?.totalTasks || 0, icon: <Grid size={16} />, color: 'text-purple-400' },
              { label: 'Done', value: stats?.completedTasks || 0, icon: <Star size={16} />, color: 'text-emerald-400' },
              { label: 'Progress', value: `${completionRate}%`, icon: <TrendingUp size={16} />, color: 'text-amber-400' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i }}
              >
                <Card className="glass-panel border-none h-full rounded-[28px]">
                  <CardBody className="p-6 flex flex-col items-center text-center">
                    <div className={`mb-3 ${stat.color} opacity-80`}>{stat.icon}</div>
                    <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-[0.2em] mt-2">{stat.label}</p>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Upcoming Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-blue-400" />
                <h3 className="font-bold text-white uppercase text-xs tracking-widest">Focus Tasks</h3>
              </div>
              <Button variant="light" size="sm" className="text-white/40 text-xs" onPress={() => boards.length > 0 && onSelectBoard(boards[0].id)}>Manage all</Button>
            </div>
            
            <div className="space-y-3">
              {stats?.upcomingTasks?.length > 0 ? (
                stats.upcomingTasks.map((task: any, i: number) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <Card 
                      isPressable
                      onPress={() => onSelectBoard(task.board_id)}
                      className="glass-card hover:bg-white/5 border-none group rounded-2xl"
                    >
                      <CardBody className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={`w-2.5 h-2.5 rounded-full ${task.priority_color || 'bg-blue-500'} shadow-[0_0_10px_rgba(59,130,246,0.5)]`} />
                          <div>
                            <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{task.content}</h4>
                            <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1.5">{task.board_title}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                      </CardBody>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="py-8 flex flex-col items-center text-white/20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <Sparkles size={32} className="mb-2" />
                  <p className="text-sm">All caught up! Add a new task to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Boards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layout size={18} className="text-purple-400" />
                <h3 className="font-bold text-white uppercase text-xs tracking-widest">Recent Boards</h3>
              </div>
              <Button variant="light" size="sm" className="text-white/40 text-xs" onPress={onViewGallery}>View Gallery</Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {boards.slice(0, 3).map((board, i) => (
                <Card 
                  key={board.id}
                  isPressable 
                  onPress={() => onSelectBoard(board.id)}
                  className="glass-card hover:bg-white/10 transition-all group overflow-hidden border-none rounded-[24px]"
                >
                  <CardBody className="p-0">
                    <div className={`h-24 bg-gradient-to-br ${board.bg_gradient || 'from-blue-600/40 to-indigo-900/40'} group-hover:scale-110 transition-transform duration-700`} />
                    <div className="p-4 bg-black/40 backdrop-blur-md">
                      <h4 className="font-bold text-white text-sm tracking-tight">{board.title}</h4>
                      <p className="text-white/40 text-[9px] mt-1.5 uppercase font-bold tracking-widest flex items-center gap-1.5">
                        {board.is_starred ? <Star size={10} className="text-yellow-500 fill-yellow-500" /> : null}
                        Modified {new Date(board.last_updated).toLocaleDateString()}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              ))}

              <Card 
                isPressable 
                onPress={onCreateBoard}
                className="border-2 border-dashed border-white/10 bg-transparent hover:bg-white/5 transition-all flex items-center justify-center h-[148px] rounded-[24px]"
              >
                <div className="flex flex-col items-center gap-3 text-white/40">
                  <div className="p-2 rounded-full bg-white/5">
                    <Plus size={24} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Create Board</span>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Column: AI & Activity */}
        <div className="space-y-8">
          <Card className="bg-gradient-to-br from-indigo-600/30 to-purple-900/30 backdrop-blur-xl border border-white/10 overflow-hidden relative group rounded-[32px]">
            <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-blue-500/20 rounded-full blur-[40px] group-hover:scale-150 transition-transform duration-1000" />
            <CardBody className="p-8 relative z-10">
              <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border border-white/10">
                <Brain size={24} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Workspace Insight</h3>
              <p className="text-sm text-white/70 leading-relaxed mb-8">
                You've completed {stats?.completedTasks || 0} tasks this week. 
                {completionRate > 50 ? " Great momentum!" : " Let's focus on clearing some small tasks today."}
              </p>
              <Button fullWidth className="bg-white text-indigo-900 font-bold h-12 rounded-2xl" startContent={<Zap size={14} />} onPress={() => alert('Analytics feature coming soon!')}>
                View Analytics
              </Button>
            </CardBody>
          </Card>

          <Card className="glass-panel border-none rounded-[32px]">
            <CardBody className="p-8">
              <h3 className="font-bold text-white uppercase text-xs tracking-[0.2em] mb-8 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp size={16} className="text-emerald-400" />
                </div>
                Recent Activity
              </h3>
              <div className="space-y-8">
                {stats?.recentTasks?.map((task: any, i: number) => (
                  <div key={task.id} className="flex gap-5 relative">
                    {i !== stats.recentTasks.length - 1 && (
                      <div className="absolute left-[7px] top-6 w-[1px] h-[calc(100%+32px)] bg-white/10" />
                    )}
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/40 shrink-0 mt-1 relative z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
                        Added task <span className="text-blue-400 font-semibold">"{task.content}"</span>
                      </p>
                      <p className="text-[10px] text-white/30 mt-1.5 uppercase font-bold tracking-widest">
                        to {task.board_title}
                      </p>
                    </div>
                  </div>
                ))}
                {(!stats?.recentTasks || stats.recentTasks.length === 0) && (
                  <div className="flex flex-col items-center py-8 text-white/20">
                    <RotateCw size={24} className="mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-widest">No activity yet</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NotesView({ title, icon }: { title: string, icon: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-white/60 min-h-[400px]">
      {icon}
      <h3 className="text-xl font-bold text-white/80 mb-2">{title}</h3>
      <p>Workspace content for {title.toLowerCase()} will appear here.</p>
    </div>
  );
}
