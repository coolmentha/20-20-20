import test from 'node:test'
import assert from 'node:assert/strict'
import { createReminderWindowRegistry } from '../src/main/reminder-windows.mjs'

function createWindowDoubleClass(created) {
  return class WindowDouble {
    constructor(options) {
      this.options = options
      this.bounds = { ...options }
      this.destroyed = false
      this.hidden = false
      this.loaded = []
      this.sent = []
      this.webContentsEvents = new Map()
      this.setBoundsCalls = []
      this.showInactiveCount = 0
      created.push(this)
      this.webContents = {
        send: (channel, payload) => this.sent.push({ channel, payload }),
        once: (channel, cb) => this.webContentsEvents.set(channel, cb)
      }
    }

    setBounds(bounds) {
      this.bounds = { ...bounds }
      this.setBoundsCalls.push({ ...bounds })
    }

    showInactive() {
      this.showInactiveCount++
      this.hidden = false
    }

    hide() {
      this.hidden = true
    }

    destroy() {
      this.destroyed = true
    }

    isDestroyed() {
      return this.destroyed
    }

    emitWebContents(channel) {
      this.webContentsEvents.get(channel)?.()
    }
  }
}

test('提醒窗口显示前按每个显示器边界重新定位，避免多个提醒落在同一屏', () => {
  const displays = [
    { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    { id: 2, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } }
  ]
  const created = []
  const WindowDouble = createWindowDoubleClass(created)
  const payload = { type: 'eye', seconds: 20 }

  const registry = createReminderWindowRegistry({
    BrowserWindow: WindowDouble,
    screen: { getAllDisplays: () => displays },
    preloadPath: 'preload.js',
    loadReminderURL: win => win.loaded.push('reminder.html')
  })

  registry.showAll(payload)

  assert.equal(created.length, 2)
  assert.deepEqual(created.map(win => win.bounds), displays.map(display => display.bounds))
  assert.deepEqual(created.map(win => win.setBoundsCalls.at(-1)), displays.map(display => display.bounds))
  assert.deepEqual(created.map(win => win.showInactiveCount), [1, 1])
  assert.deepEqual(
    created.map(win => win.sent),
    [
      [{ channel: 'reminder:start', payload }],
      [{ channel: 'reminder:start', payload }]
    ]
  )
})

test('提醒页面加载完成后再次校正窗口边界', () => {
  const display = { id: 1, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } }
  const created = []
  const WindowDouble = createWindowDoubleClass(created)
  const registry = createReminderWindowRegistry({
    BrowserWindow: WindowDouble,
    screen: { getAllDisplays: () => [display] },
    preloadPath: 'preload.js',
    loadReminderURL: () => {}
  })

  registry.sync()
  created[0].bounds = { x: 0, y: 0, width: 800, height: 600 }
  created[0].emitWebContents('did-finish-load')

  assert.deepEqual(created[0].bounds, display.bounds)
})

test('显示器边界变化时复用同一提醒窗口并更新位置', () => {
  let displays = [
    { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } }
  ]
  const created = []
  const WindowDouble = createWindowDoubleClass(created)
  const registry = createReminderWindowRegistry({
    BrowserWindow: WindowDouble,
    screen: { getAllDisplays: () => displays },
    preloadPath: 'preload.js',
    loadReminderURL: () => {}
  })

  registry.sync()
  const firstWindow = created[0]
  displays = [
    { id: 1, bounds: { x: -1920, y: 0, width: 1920, height: 1080 } }
  ]
  registry.sync()

  assert.equal(created.length, 1)
  assert.equal(created[0], firstWindow)
  assert.deepEqual(firstWindow.bounds, displays[0].bounds)
})

test('移除显示器后销毁对应的提醒窗口', () => {
  let displays = [
    { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    { id: 2, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } }
  ]
  const created = []
  const WindowDouble = createWindowDoubleClass(created)
  const registry = createReminderWindowRegistry({
    BrowserWindow: WindowDouble,
    screen: { getAllDisplays: () => displays },
    preloadPath: 'preload.js',
    loadReminderURL: () => {}
  })

  registry.sync()
  displays = [
    { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } }
  ]
  registry.sync()

  assert.equal(created[0].destroyed, false)
  assert.equal(created[1].destroyed, true)
  assert.equal(registry.getWindows().length, 1)
})
