import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getStatus: () => ipcRenderer.invoke('status'),
  onReminderStart: cb => ipcRenderer.on('reminder:start', (_e, payload) => cb(payload)),
  reminderDone: type => ipcRenderer.send('reminder:done', type),
  trayAction: action => ipcRenderer.send('tray:action', action),
  remindMovement: () => ipcRenderer.send('reminder:movement-now'),
  quit: () => ipcRenderer.send('app:quit'),
  hideToTray: () => ipcRenderer.send('app:hide')
})
