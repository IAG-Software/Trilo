'use client'

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardBody, Button, Input } from '@nextui-org/react';
import { Plus, Star, Search, Layout, Clock, Grid, Filter, Edit2, Copy, Archive, Trash2, ExternalLink } from 'lucide-react';
import ContextMenu from './ContextMenu';
import { BACKGROUNDS } from '@/lib/constants';

interface Board {
  id: string;
  title: string;
  bg_gradient: string;
  wallpaper_index: number | null;
  is_starred: boolean;
  last_updated: string;
}

export default function SwitchBoardView({ onSelectBoard, onCreateBoard }: { 
  onSelectBoard: (id: string) => void,
  onCreateBoard: () => void 
}) {
  const [boards, setBoards] = React.useState<Board[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');

  const fetchBoards = React.useCallback(async () => {
    try {
      const data = await window.electronAPI.cgiCall('get-boards', {});
      if (data && !data.error) setBoards(data);
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const toggleStar = async (boardId: string, currentStatus: boolean) => {
    try {
      await window.electronAPI.cgiCall('update-board-starred', { boardId, isStarred: !currentStatus });
      fetchBoards();
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const filteredBoards = boards.filter(board => {
    const matchesSearch = board.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'starred') return matchesSearch && board.is_starred;
    // Add other filters as needed
    return matchesSearch;
  });
  return (
    <div className="max-w-6xl mx-auto pt-4 space-y-8 h-full flex flex-col pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[18px] bg-blue-600/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Grid size={24} className="text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Board Gallery</h2>
          </div>
          <p className="text-white/60 max-w-md">Access all your workspaces and collaborative boards from one central hub.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64 md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/80 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search boards by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all"
            />
          </div>
          <Button isIconOnly variant="light" className="text-white/60 hover:text-white bg-white/5">
            <Filter size={18} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-white/5 pb-2">
        <button 
          onClick={() => setActiveFilter('all')}
          className={`text-sm font-bold pb-2 px-1 transition-all ${activeFilter === 'all' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/80'}`}
        >
          All Boards
        </button>
        <button 
          onClick={() => setActiveFilter('starred')}
          className={`text-sm font-bold pb-2 px-1 transition-all ${activeFilter === 'starred' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/80'}`}
        >
          Starred
        </button>
        <button className="text-sm font-medium text-white/40 hover:text-white/80 transition-colors pb-2 px-1">Recent</button>
        <button className="text-sm font-medium text-white/40 hover:text-white/80 transition-colors pb-2 px-1">Archived</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar pr-2 flex-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-44"
        >
          <Card 
            isPressable 
            onPress={onCreateBoard}
            className="border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center h-full group rounded-[32px]"
          >
            <div className="flex flex-col items-center gap-3 text-white/40 group-hover:text-white transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:bg-blue-600/20 group-hover:border-blue-500/30 transition-all">
                <Plus size={28} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Create new board</span>
            </div>
          </Card>
        </motion.div>

        {filteredBoards.map((board, index) => (
          <motion.div
            key={board.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="h-44"
          >
            <ContextMenu
              items={[
                { label: 'Open Board', icon: <ExternalLink size={14} />, onClick: () => onSelectBoard(board.id) },
                { label: board.is_starred ? 'Unstar Board' : 'Star Board', icon: <Star size={14} className={board.is_starred ? "fill-yellow-500 text-yellow-500" : ""} />, onClick: () => toggleStar(board.id, board.is_starred) },
                { label: 'Rename Board', icon: <Edit2 size={14} />, onClick: () => console.log('Rename', board.id) },
                { label: 'Duplicate Board', icon: <Copy size={14} />, onClick: () => console.log('Duplicate', board.id) },
                { label: 'Archive Board', icon: <Archive size={14} />, onClick: () => console.log('Archive', board.id) },
                { label: 'Delete Board', icon: <Trash2 size={14} />, onClick: () => console.log('Delete', board.id), variant: 'danger' },
              ]}
            >
              <Card 
                isPressable 
                onPress={() => onSelectBoard(board.id)}
                className="glass-card hover:bg-white/10 transition-all group overflow-hidden border-white/5 h-full w-full rounded-[32px]"
              >
                <CardBody className="p-0 flex flex-col h-full">
                  <div className={`h-24 ${!board.wallpaper_index && board.wallpaper_index !== 0 ? (board.bg_gradient || 'from-blue-600/40 to-indigo-900/40') : ''} group-hover:scale-110 transition-transform duration-700 relative bg-cover bg-center`}
                       style={board.wallpaper_index !== null && board.wallpaper_index !== undefined ? { backgroundImage: `url(${BACKGROUNDS[board.wallpaper_index]})` } : {}}>
                    <div className="absolute inset-0 bg-black/20" />
                    {board.is_starred && (
                    <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/5">
                      <Clock size={10} className="text-white/60" />
                      <span className="text-[9px] font-bold text-white/80 uppercase tracking-tighter">Updated recently</span>
                    </div>
                  </div>
                  <div className="p-4 bg-black/40 backdrop-blur-xl flex-1 flex flex-col justify-between border-t border-white/5">
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors line-clamp-1">{board.title}</h4>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-1.5">
                        {/* Member avatars would go here */}
                      </div>
                      <div className="flex items-center gap-1 text-white/40 group-hover:text-white/80 transition-colors">
                        <Layout size={12} />
                        <span className="text-[10px] font-bold">OPEN</span>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </ContextMenu>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
