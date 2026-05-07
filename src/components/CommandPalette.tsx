'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Layout, 
  Settings, 
  Calendar, 
  Zap, 
  ChevronRight, 
  User, 
  Sparkles, 
  Bell,
  Clock,
  ArrowRight,
  Grid,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  Kbd, 
  Modal, 
  ModalContent, 
  ModalBody, 
  Input, 
  Button,
  Avatar,
  Chip
} from '@nextui-org/react';
import { motion, AnimatePresence } from 'framer-motion';
import { BACKGROUNDS } from '@/lib/constants';

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBoard: (id: string) => void;
  onNavigate: (tab: string) => void;
  onCreateBoard: () => void;
  onResetData: () => void;
}

const CommandPalette = ({ isOpen, onOpenChange, onSelectBoard, onNavigate, onCreateBoard, onResetData }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({ boards: [], tasks: [], settings: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('trilo-recent-searches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const addToRecent = (item: any) => {
    const newRecent = [item, ...recentSearches.filter(r => r.id !== item.id)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('trilo-recent-searches', JSON.stringify(newRecent));
  };

  useEffect(() => {
    if (query.trim().length > 0) {
      setIsLoading(true);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      
      searchTimeout.current = setTimeout(async () => {
        try {
          // @ts-expect-error
          const data = await window.electronAPI.cgiCall('global-search', { query });
          setResults(data);
          setSelectedIndex(0);
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setResults({ boards: [], tasks: [], settings: [] });
    }
  }, [query]);

  const allResults = [
    ...(results?.settings || []).map((s: any) => ({ ...s, type: 'setting' })),
    ...(results?.boards || []).map((b: any) => ({ ...b, type: 'board' })),
    ...(results?.tasks || []).map((t: any) => ({ ...t, type: 'task' }))
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(allResults.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allResults.length) % Math.max(allResults.length, 1));
    } else if (e.key === 'Enter') {
      if (allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex]);
      }
    }
  };

  const handleSelect = (item: any) => {
    addToRecent(item);
    if (item.type === 'board') {
      onSelectBoard(item.id);
    } else if (item.type === 'setting') {
      if (item.id === 'nav-planner') onNavigate('planner');
      else if (item.id === 'nav-inbox') onNavigate('inbox');
      else if (item.id === 'nav-home') onNavigate('home');
      else if (item.id === 'nav-gallery') onNavigate('switch');
      else if (item.id === 'act-create-board') onCreateBoard();
      else if (item.id === 'act-reset') onResetData();
      else onNavigate('settings');
    } else if (item.type === 'task') {
      onSelectBoard(item.board_id);
    }
    onOpenChange(false);
    setQuery('');
  };

  const getIcon = (type: string, iconName?: string) => {
    if (type === 'setting') {
      switch (iconName) {
        case 'User': return <User size={16} className="text-blue-400" />;
        case 'Sparkles': return <Sparkles size={16} className="text-purple-400" />;
        case 'Bell': return <Bell size={16} className="text-amber-400" />;
        case 'Calendar': return <Calendar size={16} className="text-emerald-400" />;
        case 'Layout': return <Layout size={16} className="text-blue-400" />;
        case 'Grid': return <Grid size={16} className="text-orange-400" />;
        case 'Plus': return <Plus size={16} className="text-blue-500" />;
        case 'Trash2': return <Trash2 size={16} className="text-red-500" />;
        default: return <Settings size={16} className="text-white/40" />;
      }
    }
    if (type === 'board') return <Layout size={16} className="text-emerald-400" />;
    if (type === 'task') return <Zap size={16} className="text-blue-400" />;
    return <Search size={16} />;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      hideCloseButton
      backdrop="blur"
      size="xl"
      className="bg-transparent shadow-none"
      classNames={{
        wrapper: "pt-[15vh] items-start",
      }}
    >
      <ModalContent className="bg-transparent">
        {(onClose) => (
          <div className="glass-panel border border-white/10 overflow-hidden rounded-[32px] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <Search className="text-white/40" size={20} />
              <input 
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-white/20"
                placeholder="Search projects, tasks, settings..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="flex items-center gap-1">
                <Kbd keys={["command"]}>K</Kbd>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
              {query.length === 0 ? (
                <div className="p-4 space-y-6">
                  {recentSearches.length > 0 && (
                    <div>
                      <h3 className="px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center justify-between">
                        Recent Searches
                        <button className="hover:text-white transition-colors" onClick={() => { setRecentSearches([]); localStorage.removeItem('trilo-recent-searches'); }}>Clear</button>
                      </h3>
                      <div className="space-y-1 mt-1">
                        {recentSearches.map((item) => (
                          <div 
                            key={`recent-${item.id}-${item.type}`}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all group"
                            onClick={() => handleSelect(item)}
                          >
                            <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                              {getIcon(item.type, item.icon)}
                            </div>
                            <span className="text-xs text-white/70 group-hover:text-white transition-colors">{item.title || item.content}</span>
                            <Clock size={12} className="ml-auto text-white/5 group-hover:text-white/20" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      className="glass-card p-3 rounded-xl border-white/5 hover:bg-white/10 cursor-pointer transition-all flex items-center gap-3"
                      onClick={() => { onNavigate('planner'); onOpenChange(false); }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                        <Calendar size={16} className="text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">Open Planner</p>
                        <p className="text-[10px] text-white/40">View your schedule</p>
                      </div>
                    </div>
                    <div 
                      className="glass-card p-3 rounded-xl border-white/5 hover:bg-white/10 cursor-pointer transition-all flex items-center gap-3"
                      onClick={() => { onNavigate('settings'); onOpenChange(false); }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
                        <Settings size={16} className="text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">Settings</p>
                        <p className="text-[10px] text-white/40">Manage preferences</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">Quick Navigation</h3>
                    <div className="space-y-1 mt-1">
                      {[
                        { title: 'Home Dashboard', tab: 'home', icon: <Layout size={14} className="text-emerald-400" /> },
                        { title: 'Board Gallery', tab: 'switch', icon: <Layout size={14} className="text-amber-400" /> },
                        { title: 'Inbox & Activity', tab: 'inbox', icon: <Bell size={14} className="text-rose-400" /> },
                      ].map((item) => (
                        <div 
                          key={item.tab}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all group"
                          onClick={() => { onNavigate(item.tab); onOpenChange(false); }}
                        >
                          {item.icon}
                          <span className="text-xs text-white/70 group-hover:text-white transition-colors">{item.title}</span>
                          <ArrowRight size={12} className="ml-auto text-white/10 group-hover:text-white/40" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : allResults.length > 0 ? (
                <div className="space-y-4 py-2">
                  {results.settings.length > 0 && (
                    <div>
                      <h3 className="px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">Settings</h3>
                      {results.settings.map((item: any, idx: number) => {
                        const globalIdx = idx;
                        const isSelected = selectedIndex === globalIdx;
                        return (
                          <div 
                            key={item.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            onClick={() => handleSelect({ ...item, type: 'setting' })}
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                              {getIcon('setting', item.icon)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{item.title}</p>
                              <p className="text-[10px] text-white/40">Configuration & Preferences</p>
                            </div>
                            {isSelected && <motion.div layoutId="arrow"><ArrowRight size={14} className="text-white/40" /></motion.div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {results.boards.length > 0 && (
                    <div>
                      <h3 className="px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">Projects & Boards</h3>
                      {results.boards.map((item: any, idx: number) => {
                        const globalIdx = results.settings.length + idx;
                        const isSelected = selectedIndex === globalIdx;
                        return (
                          <div 
                            key={item.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            onClick={() => handleSelect({ ...item, type: 'board' })}
                          >
                            <div className={`w-8 h-8 rounded-lg ${!item.wallpaper_index && item.wallpaper_index !== 0 ? (item.bg_gradient || 'from-blue-600/40 to-indigo-900/40') : ''} border border-white/10 bg-cover bg-center`}
                                 style={item.wallpaper_index !== null && item.wallpaper_index !== undefined ? { backgroundImage: `url(${BACKGROUNDS[item.wallpaper_index]})` } : {}} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{item.title}</p>
                              <p className="text-[10px] text-white/40">
                                {item.column_name ? `Board • Match in column "${item.column_name}"` : `Board • Modified ${new Date(item.last_updated).toLocaleDateString()}`}
                              </p>
                            </div>
                            {isSelected && <motion.div layoutId="arrow"><ArrowRight size={14} className="text-white/40" /></motion.div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {results.tasks.length > 0 && (
                    <div>
                      <h3 className="px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">Tasks & Calendar</h3>
                      {results.tasks.map((item: any, idx: number) => {
                        const globalIdx = results.settings.length + results.boards.length + idx;
                        const isSelected = selectedIndex === globalIdx;
                        return (
                          <div 
                            key={item.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            onClick={() => handleSelect({ ...item, type: 'task' })}
                          >
                            <div className={`w-2 h-2 rounded-full ${item.priority_color || 'bg-blue-500'} shrink-0`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{item.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">{item.board_title}</span>
                                {item.due_date && (
                                  <Chip size="sm" variant="flat" className="h-4 bg-white/5 text-[8px] text-white/60" startContent={<Calendar size={8} />}>
                                    {new Date(item.due_date).toLocaleDateString()}
                                  </Chip>
                                )}
                              </div>
                            </div>
                            {isSelected && <motion.div layoutId="arrow"><ArrowRight size={14} className="text-white/40" /></motion.div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : !isLoading && (
                <div className="p-12 text-center text-white/20">
                  <Search size={40} className="mx-auto mb-4 opacity-20" />
                  <p>No results found for "{query}"</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-white/5 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-white/30 font-medium">
                <div className="flex items-center gap-1">
                  <Kbd className="bg-white/5 text-[8px] border-white/10 min-w-0 px-1 py-0 h-4">Enter</Kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <Kbd className="bg-white/5 text-[8px] border-white/10 min-w-0 px-1 py-0 h-4">↑↓</Kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <Kbd className="bg-white/5 text-[8px] border-white/10 min-w-0 px-1 py-0 h-4">Esc</Kbd>
                  <span>Close</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Trilo Search</span>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CommandPalette;
