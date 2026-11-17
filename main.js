const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

// Auto-Updater (Automatically checks GitHub Releases and updates installed .EXE / macOS apps)
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch {
  // Optional in dev mode
}

// Strict HTTPS validation before opening any external URL in the OS browser (Prevents RCE via custom protocols)
function openSafeExternalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:') {
      shell.openExternal(parsed.toString());
    }
  } catch {
    // Ignore malformed URLs
  }
}

function createStudioWindow() {
  // Deny unnecessary hardware/location/notification permissions by default
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['clipboard-read', 'clipboard-sanitized-write', 'media'];
    callback(allowedPermissions.includes(permission));
  });

  const win = new BrowserWindow({
    width: 1340,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#070709',
    title: 'All In One — Media Studio',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Set custom User-Agent token 'AllInOneApp' so index.html unlocks all 6 studio tools only inside the native app
  const defaultUA = win.webContents.getUserAgent();
  win.webContents.setUserAgent(`${defaultUA} AllInOneApp/2.0.0`);

  // Load local index.html
  win.loadFile(path.join(__dirname, 'index.html'));

  // Prevent navigation hijacking (e.g., dragging & dropping an external link into the app window)
  win.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith('file://')) {
      event.preventDefault();
      openSafeExternalUrl(targetUrl);
    }
  });

  // Open target="_blank" external links safely in default system browser (HTTPS only)
  win.webContents.setWindowOpenHandler(({ url }) => {
    openSafeExternalUrl(url);
    return { action: 'deny' };
  });

  if (autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }
}

app.whenReady().then(() => {
  createStudioWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createStudioWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
