/**
 * Tauri API wrapper to mimic Electron IPC behavior
 */
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

declare global {
  interface Window {
    electronAPI: any; // Compatibility
  }
}

export function initTauri() {
  if (typeof window === 'undefined') return;

  // Check if we are running inside Tauri
  const isTauri = !!(window as any).__TAURI_INTERNALS__;
  
  if (!isTauri) {
    console.log('Not running in Tauri environment. Tauri APIs disabled.');
    return;
  }

  try {
    const appWindow = getCurrentWindow();

    // Define compatibility layer immediately if not already defined
    if (!window.electronAPI) {
      window.electronAPI = {
        cgiCall: async (request: string, args: any) => {
          try {
            const payload = typeof args === 'object' && args !== null ? args : { value: args };
            return await invoke('cgi_call', { request, payload });
          } catch (err) {
            console.error(`Tauri cgi_call failed for ${request}:`, err);
            return { error: String(err) };
          }
        },
        minimize: () => appWindow.minimize(),
        maximize: async () => {
          const isMax = await appWindow.isMaximized();
          if (isMax) {
            await appWindow.unmaximize();
          } else {
            await appWindow.maximize();
          }
        },
        close: () => appWindow.close(),
        startDragging: () => appWindow.startDragging()
      };
    }
  } catch (err) {
    console.error('Failed to initialize Tauri APIs:', err);
  }
}

// Call it immediately on import if in browser
if (typeof window !== 'undefined') {
  initTauri();
}
