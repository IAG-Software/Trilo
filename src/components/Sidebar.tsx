'use client'

import React from 'react';
import { Button, Tooltip } from '@nextui-org/react';
import { 
  Sparkles, 
  Settings, 
  Layout,
  Calendar,
  MessageSquare,
  Grid,
  Columns2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Sparkles, label: 'Home' },
    { id: 'board', icon: Layout, label: 'Board' },
    { id: 'switch', icon: Grid, label: 'Gallery' },
    { id: 'inbox', icon: MessageSquare, label: 'Inbox' },
    { id: 'planner', icon: Calendar, label: 'Planner' },
    { id: 'dual', icon: Columns2, label: 'Split View' },
  ];

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20,
        delay: 0.5 
      }}
      className="dock-glass flex items-center gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 p-1.5"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Tooltip key={tab.id} content={tab.label} placement="top" delay={500} closeDelay={0}>
            <motion.div layout className="relative">
              <Button
                variant="light"
                className={`relative h-12 px-4 rounded-full transition-colors duration-300 flex items-center gap-2.5 z-10 ${
                  isActive ? "text-blue-400" : "text-white/60 hover:text-white"
                }`}
                onPress={() => setActiveTab(tab.id)}
              >
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -1 : 0
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                
                <AnimatePresence initial={false} mode="wait">
                  {isActive && (
                    <motion.span 
                      initial={{ width: 0, opacity: 0, x: -5 }}
                      animate={{ width: 'auto', opacity: 1, x: 0 }}
                      exit={{ width: 0, opacity: 0, x: -5 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="text-[11px] font-bold uppercase tracking-[0.1em] overflow-hidden whitespace-nowrap"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-gradient-to-tr from-blue-600/25 to-blue-400/10 rounded-full border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.25)]"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
            </motion.div>
          </Tooltip>
        );
      })}
      
      <div className="w-[1px] h-6 bg-white/10 mx-2" />
      
      <Tooltip content="Settings" placement="top" delay={500}>
        <div className="relative">
          <Button 
            isIconOnly 
            variant="light" 
            className={`relative h-12 w-12 rounded-full transition-colors duration-300 z-10 ${
              activeTab === 'settings' ? "text-blue-400" : "text-white/60 hover:text-white"
            }`}
            onPress={() => setActiveTab('settings')}
          >
            <motion.div
              animate={{ 
                rotate: activeTab === 'settings' ? 90 : 0,
                scale: activeTab === 'settings' ? 1.15 : 1
              }}
              whileHover={{ rotate: 30, scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <Settings size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
            </motion.div>
          </Button>
          
          {activeTab === 'settings' && (
            <motion.div
              layoutId="active-pill"
              className="absolute inset-0 bg-gradient-to-tr from-blue-600/25 to-blue-400/10 rounded-full border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.25)]"
              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
            />
          )}
        </div>
      </Tooltip>
    </motion.div>
  );
};

export default Sidebar;
