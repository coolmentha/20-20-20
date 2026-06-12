import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, powerMonitor } from 'electron'
import { join } from 'path'
import { applyTimerEvent, createTimerState, REMINDER_PAYLOADS } from './timer-engine.mjs'

const MAIN_WINDOW_WIDTH = 232
const MAIN_WINDOW_HEIGHT = 300

let mainWin, reminderWins = [], tray
let timerState = createTimerState()
let awayRestStartedAt = null

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
    { label: timerState.paused ? '▶ 继续' : '⏸ 暂停', click: togglePause },
    { label: '⏰ 立即提醒', click: requestImmediateReminder },
    { type: 'separator' },
    { label: '退出', click: () => app.exit() }
  ]))
}

function isReminderActive() {
  return timerState.activeReminderType !== null
}

function showReminder(payload) {
  reminderWins.forEach(w => {
    w.show()
    w.webContents.send('reminder:start', payload)
  })
}

function hideReminder() {
  reminderWins.forEach(w => w.hide())
}

function applyEffects(effects) {
  effects.forEach(effect => {
    if (effect.type === 'show-reminder') showReminder(effect.reminder)
    else if (effect.type === 'hide-reminder') hideReminder()
  })
}

function runTimerEvent(event) {
  const result = applyTimerEvent(timerState, event)
  timerState = result.state
  applyEffects(result.effects)
}

function togglePause() {
  timerState = { ...timerState, paused: !timerState.paused }
  updateTrayMenu()
}

function requestImmediateReminder() {
  if (isReminderActive()) return
  const payload = timerState.movementRemaining <= 0 ? REMINDER_PAYLOADS.movement : REMINDER_PAYLOADS.eye
  timerState = { ...timerState, activeReminderType: payload.type }
  showReminder(payload)
}

function loadURL(win, path) {
  const base = process.env['ELECTRON_RENDERER_URL']
  if (base) win.loadURL(base + '/' + path)
  else win.loadFile(join(__dirname, '../renderer/' + path))
}

function beginAwayRest() {
  if (awayRestStartedAt) return
  awayRestStartedAt = Date.now()
  runTimerEvent({ type: 'away-started' })
}

function finishAwayRest() {
  if (!awayRestStartedAt) return

  const elapsedSecs = (Date.now() - awayRestStartedAt) / 1000
  awayRestStartedAt = null
  runTimerEvent({ type: 'away-finished', elapsedSecs })
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

  ipcMain.handle('status', () => ({
    remaining: Math.max(0, timerState.remaining),
    movementRemaining: Math.max(0, timerState.movementRemaining),
    breakCount: timerState.breakCount,
    paused: timerState.paused,
    activeReminderType: timerState.activeReminderType
  }))
  ipcMain.on('app:quit', () => app.exit())
  ipcMain.on('app:hide', () => mainWin.hide())
  ipcMain.on('tray:action', (_e, action) => {
    if (action === 'pause') togglePause()
    else if (action === 'remind') requestImmediateReminder()
  })

  ipcMain.on('reminder:done', (_e, type) => {
    runTimerEvent({ type: 'reminder-complete', reminderType: type ?? timerState.activeReminderType })
  })

  watchAwayRest()

  setInterval(() => {
    runTimerEvent({ type: 'active-second' })
  }, 1000)
})

app.on('window-all-closed', () => {})
