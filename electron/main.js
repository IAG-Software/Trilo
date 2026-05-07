const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { ConnectionBuilder } = require('electron-cgi');

let mainWindow;
let cgiConnection;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        frame: false,
        backgroundColor: '#000000',
        icon: path.join(__dirname, '../public/icon.png')
    });

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (cgiConnection) {
            cgiConnection.close();
        }
    });
}

function setupCGI() {
    const backendPath = path.join(__dirname, '../backend/main.py');
    console.log('[ELECTRON] Starting Python backend at:', backendPath);

    try {
        const builder = new ConnectionBuilder();
        cgiConnection = builder
            .connectTo('python', '-u', backendPath)
            .build();
        
        cgiConnection.onDisconnect = () => {
            console.log('[ELECTRON] Python backend disconnected');
            cgiConnection = null;
        };

        // Expose CGI calls to renderer via IPC
        ipcMain.handle('cgi-call', async (event, { request, args }) => {
            return new Promise((resolve) => {
                if (!cgiConnection) {
                    resolve({ error: 'Backend connection not ready' });
                    return;
                }
                cgiConnection.send(request, args, (err, response) => {
                    if (err) {
                        resolve({ error: err });
                    } else {
                        try {
                            // electron-cgi returns the result as a stringified JSON
                            resolve(typeof response === 'string' ? JSON.parse(response) : response);
                        } catch (e) {
                            resolve(response);
                        }
                    }
                });
            });
        });

        // Window controls
        ipcMain.on('window-minimize', () => mainWindow.minimize());
        ipcMain.on('window-maximize', () => {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        });
        ipcMain.on('window-close', () => mainWindow.close());

    } catch (err) {
        console.error('[ELECTRON] Failed to start CGI:', err);
    }
}

app.on('ready', () => {
    createWindow();
    setupCGI();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
