'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function WindowControls() {
  const [appWindow, setAppWindow] = useState<any>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = getCurrentWindow();
      setAppWindow(win);

      const updateMaximized = async () => {
        setIsMaximized(await win.isMaximized());
      };

      updateMaximized();
      
      const unlisten = win.onResized(() => {
        updateMaximized();
      });

      return () => {
        unlisten.then(fn => fn());
      };
    }
  }, []);

  const handleMinimize = async () => {
    if (appWindow) await appWindow.minimize();
  };

  const handleMaximize = async () => {
    if (appWindow) {
      if (await appWindow.isMaximized()) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    }
  };

  const handleClose = async () => {
    if (appWindow) await appWindow.close();
  };

  return (
    <div className="flex items-center no-drag">
      <button
        onClick={handleMinimize}
        className="w-10 h-8 flex items-center justify-center hover:bg-white/5 transition-colors text-white/50 hover:text-white"
        title="Minimize"
      >
        <Minus size={12} strokeWidth={1.2} />
      </button>
      <button
        onClick={handleMaximize}
        className="w-10 h-8 flex items-center justify-center hover:bg-white/5 transition-colors text-white/50 hover:text-white"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <Copy size={10} strokeWidth={1.2} className="rotate-180" />
        ) : (
          <Square size={10} strokeWidth={1.2} />
        )}
      </button>
      <button
        onClick={handleClose}
        className="w-10 h-8 flex items-center justify-center hover:bg-red-500/90 hover:text-white transition-colors text-white/50"
        title="Close"
      >
        <X size={12} strokeWidth={1.2} />
      </button>
    </div>
  );
}
