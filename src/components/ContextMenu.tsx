'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

const ContextMenu = ({ items, children, className = "" }: ContextMenuProps) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position and handle viewport overflow
    let x = e.clientX;
    let y = e.clientY;
    
    const menuWidth = 200;
    const menuHeight = items.length * 36 + 12; // Adjusted estimate
    
    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;
    
    setPosition({ x, y });
    setVisible(true);
  };

  const closeMenu = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (visible) {
      const handleGlobalClick = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          closeMenu();
        }
      };
      
      window.addEventListener('click', handleGlobalClick, true);
      window.addEventListener('contextmenu', closeMenu, true);
      window.addEventListener('scroll', closeMenu, true);
      
      return () => {
        window.removeEventListener('click', handleGlobalClick, true);
        window.removeEventListener('contextmenu', closeMenu, true);
        window.removeEventListener('scroll', closeMenu, true);
      };
    }
  }, [visible, closeMenu]);

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      {portalNode && createPortal(
        <AnimatePresence mode="wait">
          {visible && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.98, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 5 }}
              transition={{ duration: 0.1, ease: [0.23, 1, 0.32, 1] }}
              style={{
                position: 'fixed',
                top: position.y,
                left: position.x,
                zIndex: 999999,
              }}
              className="w-[200px] py-1.5 rounded-xl border border-white/10 shadow-2xl backdrop-blur-2xl bg-black/80"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick();
                    closeMenu();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium transition-all group relative
                    ${item.variant === 'danger' 
                      ? 'text-red-400 hover:bg-red-500/10' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                >
                  {item.icon && (
                    <span className={`transition-transform duration-200 group-hover:scale-110 ${item.variant === 'danger' ? 'text-red-400' : 'text-white/40 group-hover:text-white'}`}>
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  
                  <div className="absolute inset-x-1.5 inset-y-0.5 rounded-lg bg-white/0 group-hover:bg-white/5 -z-10" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        portalNode
      )}
    </div>
  );
};

export default ContextMenu;
