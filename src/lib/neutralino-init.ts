/**
 * Neutralino API wrapper to mimic Electron IPC behavior
 */

declare global {
  interface Window {
    Neutralino: any;
    electronAPI: any; // Compatibility
  }
}

let callId = 0;
const pendingCalls = new Map<string, (value: any) => void>();

export function initNeutralino() {
  if (typeof window === 'undefined') return;

  // Define compatibility layer immediately if not already defined
  if (!window.electronAPI) {
    window.electronAPI = {
      cgiCall: async (request: string, args: any) => {
        // Wait for Neutralino to be ready if needed
        if (!window.Neutralino) {
          console.warn('Neutralino not ready for cgiCall:', request);
          return { error: 'Neutralino not ready' };
        }

        return new Promise((resolve) => {
          const requestId = `${request}_${Math.random().toString(36).substr(2, 9)}`;
          const responseEvent = `${request}-response`;

          const handler = (event: any) => {
            const data = event.detail;
            if (data && data._requestId === requestId) {
              window.Neutralino.events.off(responseEvent, handler);
              resolve(data.payload);
            }
          };

          window.Neutralino.events.on(responseEvent, handler);

          // Dispatch to extension
          try {
            window.Neutralino.extensions.dispatch('js.neutralino.trilo.backend', request, {
              _requestId: requestId,
              payload: args
            });
          } catch (err) {
            console.error('Failed to dispatch to extension:', err);
            window.Neutralino.events.off(responseEvent, handler);
            resolve({ error: 'Dispatch failed' });
          }
          
          // Timeout handling
          setTimeout(() => {
            window.Neutralino.events.off(responseEvent, handler);
            // resolve({ error: 'Timeout' });
          }, 30000); // 30s timeout
        });
      },
      minimize: () => {
        if (window.Neutralino) {
          window.Neutralino.window.minimize().catch((err: any) => console.error('Minimize failed:', err));
        }
      },
      maximize: async () => {
        if (window.Neutralino) {
          try {
            const isMax = await window.Neutralino.window.isMaximized();
            if (isMax) {
              window.Neutralino.window.unmaximize();
            } else {
              window.Neutralino.window.maximize();
            }
          } catch (err) {
            console.error('Maximize toggle failed:', err);
            // Fallback to just maximize if isMaximized fails
            window.Neutralino.window.maximize();
          }
        }
      },
      close: () => {
        if (window.Neutralino) {
          window.Neutralino.app.exit().catch((err: any) => console.error('Exit failed:', err));
        }
      }
    };
  }

  // Initialize Neutralino if available
  if (window.Neutralino && !window.Neutralino.init_done) {
    if (!window.NL_PORT) {
      console.error('Neutralino Initialization Error: NL_PORT is not defined. Neutralino functions will not work. Make sure you are running via "neu run" or tokens are passed correctly.');
      return;
    }

    try {
      window.Neutralino.init();
      window.Neutralino.init_done = true;
      console.log('Neutralino initialized successfully with port:', window.NL_PORT);
    } catch (err) {
      console.error('Neutralino init failed:', err);
    }
  }
}

// Call it immediately on import if in browser
if (typeof window !== 'undefined') {
  initNeutralino();
}
