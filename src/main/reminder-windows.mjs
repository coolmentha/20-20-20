export function createReminderWindowRegistry({
  BrowserWindow,
  screen,
  preloadPath,
  loadReminderURL
}) {
  const windowsByDisplayId = new Map()

  function toWindowBounds(display) {
    const { x, y, width, height } = display.bounds
    return { x, y, width, height }
  }

  function sortedDisplays() {
    return [...screen.getAllDisplays()].sort((a, b) =>
      a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y || a.id - b.id
    )
  }

  function createWindow(display) {
    const windowBounds = toWindowBounds(display)
    const win = new BrowserWindow({
      ...windowBounds,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      webPreferences: { preload: preloadPath, contextIsolation: true }
    })

    loadReminderURL(win)
    win.webContents.once('did-finish-load', () => {
      const currentDisplay = sortedDisplays().find(item => item.id === display.id)
      if (!win.isDestroyed() && currentDisplay) win.setBounds(toWindowBounds(currentDisplay))
    })
    return win
  }

  function sync() {
    const displays = sortedDisplays()
    const activeDisplayIds = new Set(displays.map(display => display.id))

    for (const [displayId, win] of windowsByDisplayId.entries()) {
      if (!activeDisplayIds.has(displayId)) {
        if (!win.isDestroyed()) win.destroy()
        windowsByDisplayId.delete(displayId)
      }
    }

    for (const display of displays) {
      let win = windowsByDisplayId.get(display.id)
      if (!win || win.isDestroyed()) {
        win = createWindow(display)
        windowsByDisplayId.set(display.id, win)
      }

      win.setBounds(toWindowBounds(display))
    }
  }

  function getWindows() {
    return [...windowsByDisplayId.values()].filter(win => !win.isDestroyed())
  }

  function showAll(payload) {
    sync()
    getWindows().forEach(win => {
      win.setAlwaysOnTop?.(true, 'screen-saver')
      win.showInactive()
      win.webContents.send('reminder:start', payload)
    })
  }

  function revealAll() {
    sync()
    getWindows().forEach(win => {
      win.setAlwaysOnTop?.(true, 'screen-saver')
      win.showInactive()
    })
  }

  function hideAll() {
    getWindows().forEach(win => win.hide())
  }

  return {
    sync,
    showAll,
    revealAll,
    hideAll,
    getWindows
  }
}
