import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getStatus: () => ipcRenderer.invoke('status'),
  onReminderStart: cb => ipcRenderer.on('reminder:start', (_e, secs) => cb(secs)),
  reminderDone: () => ipcRenderer.send('reminder:done'),
  trayAction: action => ipcRenderer.send('tray:action', action),
  quit: () => ipcRenderer.send('app:quit'),
  hideToTray: () => ipcRenderer.send('app:hide')
})
