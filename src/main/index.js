import { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, powerMonitor } from 'electron'
import { join } from 'path'
import { createTimerRuntime } from './timer-runtime.mjs'
import { createStartAtLoginController, isStartAtLoginLaunch } from './start-at-login.mjs'
import { createReminderWindowRegistry } from './reminder-windows.mjs'

const MAIN_WINDOW_WIDTH = 232
const MAIN_WINDOW_HEIGHT = 300

let mainWin, tray
const timerRuntime = createTimerRuntime()
const startAtLogin = createStartAtLoginController({ app })
const shouldStartInTray = isStartAtLoginLaunch(process.argv)
let reminderWindowRegistry

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
  const status = timerRuntime.getStatus()
  const startAtLoginStatus = startAtLogin.getStatus()
  const startAtLoginMenuItem = startAtLoginStatus.available
    ? {
        label: '开机自启',
        type: 'checkbox',
        checked: startAtLoginStatus.openAtLogin,
        click: () => {
          startAtLogin.setEnabled(!startAtLoginStatus.openAtLogin)
          updateTrayMenu()
        }
      }
    : { label: '开机自启（不可用）', enabled: false }

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: status.paused ? '▶ 继续' : '⏸ 暂停', click: togglePause },
    { label: '⏰ 立即提醒', click: requestImmediateReminder },
    { label: '🚶 立即站立活动', click: requestImmediateMovementReminder },
    { type: 'separator' },
    startAtLoginMenuItem,
    { type: 'separator' },
    { label: '退出', click: () => app.exit() }
  ]))
}

function showReminder(payload) {
  reminderWindowRegistry?.showAll(payload)
}

function hideReminder() {
  reminderWindowRegistry?.hideAll()
}

function applyEffects(effects) {
  effects.forEach(effect => {
    if (effect.type === 'show-reminder') showReminder(effect.reminder)
    else if (effect.type === 'hide-reminder') hideReminder()
  })
}

function runTimerAction(action) {
  const effects = timerRuntime.dispatch(action)
  applyEffects(effects)
}

function togglePause() {
  runTimerAction({ type: 'toggle-pause' })
  updateTrayMenu()
}

function requestImmediateReminder() {
  runTimerAction({ type: 'request-immediate-reminder' })
}

function requestImmediateMovementReminder() {
  runTimerAction({ type: 'request-immediate-movement-reminder' })
}

function loadURL(win, path) {
  const base = process.env['ELECTRON_RENDERER_URL']
  if (base) win.loadURL(base + '/' + path)
  else win.loadFile(join(__dirname, '../renderer/' + path))
}

function beginAwayRest() {
  runTimerAction({ type: 'away-started' })
}

function finishAwayRest() {
  runTimerAction({ type: 'away-finished' })
}

function watchAwayRest() {
  powerMonitor.on('lock-screen', beginAwayRest)
  powerMonitor.on('unlock-screen', finishAwayRest)
  powerMonitor.on('suspend', beginAwayRest)
  powerMonitor.on('resume', finishAwayRest)
}

function watchDisplayChanges() {
  const syncReminderWindows = () => reminderWindowRegistry?.sync()
  screen.on('display-added', syncReminderWindows)
  screen.on('display-removed', syncReminderWindows)
  screen.on('display-metrics-changed', syncReminderWindows)
}

function createWindows() {
  mainWin = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH, height: MAIN_WINDOW_HEIGHT,
    frame: false, transparent: true, resizable: false,
    show: !shouldStartInTray,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true }
  })
  loadURL(mainWin, 'index.html')
  mainWin.on('close', () => app.exit())

  reminderWindowRegistry = createReminderWindowRegistry({
    BrowserWindow,
    screen,
    preloadPath: join(__dirname, '../preload/index.js'),
    loadReminderURL: win => loadURL(win, 'reminder.html')
  })
  reminderWindowRegistry.sync()
  watchDisplayChanges()
}

app.whenReady().then(() => {
  createWindows()

  tray = new Tray(makeTrayIcon())
  tray.setToolTip('20-20-20 护眼')
  tray.on('click', () => mainWin.isVisible() ? mainWin.hide() : mainWin.show())
  updateTrayMenu()

  ipcMain.handle('status', () => timerRuntime.getStatus())
  ipcMain.on('app:quit', () => app.exit())
  ipcMain.on('app:hide', () => mainWin.hide())
  ipcMain.on('tray:action', (_e, action) => {
    if (action === 'pause') togglePause()
    else if (action === 'remind') requestImmediateReminder()
    else if (action === 'movement-remind') requestImmediateMovementReminder()
  })

  ipcMain.on('reminder:done', (_e, type) => {
    runTimerAction({ type: 'reminder-complete', reminderType: type })
  })
  ipcMain.on('reminder:movement-now', requestImmediateMovementReminder)

  watchAwayRest()

  setInterval(() => {
    runTimerAction({ type: 'active-second' })
  }, 1000)
})

app.on('window-all-closed', () => {})
