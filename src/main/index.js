import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, powerMonitor } from 'electron'
import { join } from 'path'

const WORK_SECS = 20 * 60
const BREAK_SECS = 20
const MAIN_WINDOW_WIDTH = 232
const MAIN_WINDOW_HEIGHT = 300

let mainWin, reminderWins = [], tray
let remaining = WORK_SECS
let breakCount = 0
let paused = false
let reminderActive = false
let awayRestStartedAt = null
let awayRestCounted = false

function makeTrayIcon() {
  const iconPaths = [
    join(app.getAppPath(), 'src/main/assets/firefly-tray.png'),
    join(__dirname, '../../src/main/assets/firefly-tray.png')
  ]

  for (const iconPath of iconPaths) {
    const icon = nativeImage.createFromPath(iconPath)
    if (!icon.isEmpty()) return icon
  }

  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  const cx = 8, cy = 8, r = 6
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inside = (x - cx) ** 2 + (y - cy) ** 2 <= r * r
      buf[i] = 52; buf[i + 1] = 211; buf[i + 2] = 153
      buf[i + 3] = inside ? 255 : 0
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 1 })
}

function updateTrayMenu() {
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: paused ? '▶ 继续' : '⏸ 暂停', click: () => { paused = !paused; updateTrayMenu() } },
    { label: '⏰ 立即提醒', click: showReminder },
    { type: 'separator' },
    { label: '退出', click: () => app.exit() }
  ]))
}

function showReminder() {
  remaining = WORK_SECS
  reminderActive = true
  reminderWins.forEach(w => {
    w.show()
    w.webContents.send('reminder:start', BREAK_SECS)
  })
}

function loadURL(win, path) {
  const base = process.env['ELECTRON_RENDERER_URL']
  if (base) win.loadURL(base + '/' + path)
  else win.loadFile(join(__dirname, '../renderer/' + path))
}

function completeValidRest() {
  if (awayRestStartedAt) awayRestCounted = true
  reminderActive = false
  reminderWins.forEach(w => w.hide())
  breakCount++
  remaining = WORK_SECS
}

function beginAwayRest() {
  if (awayRestStartedAt) return
  awayRestStartedAt = Date.now()
  awayRestCounted = false
}

function finishAwayRest() {
  if (!awayRestStartedAt) return

  const elapsedMs = Date.now() - awayRestStartedAt
  const alreadyCounted = awayRestCounted
  awayRestStartedAt = null
  awayRestCounted = false

  if (!alreadyCounted && elapsedMs >= BREAK_SECS * 1000) {
    completeValidRest()
  }
}

function watchAwayRest() {
  powerMonitor.on('lock-screen', beginAwayRest)
  powerMonitor.on('unlock-screen', finishAwayRest)
  powerMonitor.on('suspend', beginAwayRest)
  powerMonitor.on('resume', finishAwayRest)
}

function createWindows() {
  mainWin = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH, height: MAIN_WINDOW_HEIGHT,
    frame: false, transparent: true, resizable: false,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true }
  })
  loadURL(mainWin, 'index.html')
  mainWin.on('close', () => app.exit())

  for (const display of screen.getAllDisplays()) {
    const { x, y, width, height } = display.bounds
    const w = new BrowserWindow({
      x, y, width, height,
      frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, show: false,
      webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true }
    })
    loadURL(w, 'reminder.html')
    reminderWins.push(w)
  }
}

app.whenReady().then(() => {
  createWindows()

  tray = new Tray(makeTrayIcon())
  tray.setToolTip('20-20-20 护眼')
  tray.on('click', () => mainWin.isVisible() ? mainWin.hide() : mainWin.show())
  updateTrayMenu()

  ipcMain.handle('status', () => ({ remaining, breakCount, paused }))
  ipcMain.on('app:quit', () => app.exit())
  ipcMain.on('app:hide', () => mainWin.hide())
  ipcMain.on('tray:action', (_e, action) => {
    if (action === 'pause') { paused = !paused; updateTrayMenu() }
    else if (action === 'remind') showReminder()
  })

  ipcMain.on('reminder:done', () => {
    if (!reminderActive) return
    completeValidRest()
  })

  watchAwayRest()

  setInterval(() => {
    if (paused || reminderActive || awayRestStartedAt) return
    remaining--
    if (remaining <= 0) showReminder()
  }, 1000)
})

app.on('window-all-closed', () => {})
