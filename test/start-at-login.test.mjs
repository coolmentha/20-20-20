import test from 'node:test'
import assert from 'node:assert/strict'
import {
  START_AT_LOGIN_ARG,
  createStartAtLoginController,
  isStartAtLoginLaunch
} from '../src/main/start-at-login.mjs'

function createAppDouble({
  isPackaged = true,
  openAtLogin = false,
  getThrows = false,
  setThrows = false
} = {}) {
  const calls = []
  let currentOpenAtLogin = openAtLogin

  return {
    calls,
    app: {
      isPackaged,
      getPath(name) {
        calls.push({ type: 'getPath', name })
        return 'C:\\Program Files\\20-20-20\\20-20-20.exe'
      },
      getLoginItemSettings(options) {
        calls.push({ type: 'get', options })
        if (getThrows) throw new Error('login item read failed')
        return { openAtLogin: currentOpenAtLogin }
      },
      setLoginItemSettings(options) {
        calls.push({ type: 'set', options })
        if (setThrows) throw new Error('login item write failed')
        currentOpenAtLogin = options.openAtLogin
      }
    }
  }
}

test('识别开机自启托盘启动参数', () => {
  assert.equal(isStartAtLoginLaunch(['app.exe', START_AT_LOGIN_ARG]), true)
  assert.equal(isStartAtLoginLaunch(['app.exe']), false)
})

test('开发模式下开机自启不可用且不会写入登录项', () => {
  const { app, calls } = createAppDouble({ isPackaged: false })
  const controller = createStartAtLoginController({ app, platform: 'win32' })

  assert.deepEqual(controller.getStatus(), { available: false, openAtLogin: false })
  assert.deepEqual(controller.setEnabled(true), { available: false, openAtLogin: false })
  assert.deepEqual(calls, [])
})

test('非 Windows 平台开机自启不可用且不会写入登录项', () => {
  const { app, calls } = createAppDouble()
  const controller = createStartAtLoginController({ app, platform: 'darwin' })

  assert.deepEqual(controller.getStatus(), { available: false, openAtLogin: false })
  assert.deepEqual(controller.setEnabled(true), { available: false, openAtLogin: false })
  assert.deepEqual(calls, [])
})

test('Windows 打包态从操作系统登录项读取开机自启状态', () => {
  const { app, calls } = createAppDouble({ openAtLogin: true })
  const controller = createStartAtLoginController({ app, platform: 'win32' })

  assert.deepEqual(controller.getStatus(), { available: true, openAtLogin: true })
  assert.deepEqual(calls, [
    { type: 'getPath', name: 'exe' },
    {
      type: 'get',
      options: {
        path: 'C:\\Program Files\\20-20-20\\20-20-20.exe',
        args: [START_AT_LOGIN_ARG]
      }
    }
  ])
})

test('Windows 打包态即时写入操作系统登录项并重新读取状态', () => {
  const { app, calls } = createAppDouble()
  const controller = createStartAtLoginController({ app, platform: 'win32' })

  assert.deepEqual(controller.setEnabled(true), { available: true, openAtLogin: true })
  assert.deepEqual(calls, [
    { type: 'getPath', name: 'exe' },
    {
      type: 'set',
      options: {
        path: 'C:\\Program Files\\20-20-20\\20-20-20.exe',
        args: [START_AT_LOGIN_ARG],
        openAtLogin: true
      }
    },
    { type: 'getPath', name: 'exe' },
    {
      type: 'get',
      options: {
        path: 'C:\\Program Files\\20-20-20\\20-20-20.exe',
        args: [START_AT_LOGIN_ARG]
      }
    }
  ])
})

test('登录项读取或写入失败时报告开机自启不可用', () => {
  const readFailure = createAppDouble({ getThrows: true })
  const writeFailure = createAppDouble({ setThrows: true })
  const writeFailureController = createStartAtLoginController({
    app: writeFailure.app,
    platform: 'win32'
  })

  assert.deepEqual(
    createStartAtLoginController({ app: readFailure.app, platform: 'win32' }).getStatus(),
    { available: false, openAtLogin: false }
  )
  assert.deepEqual(writeFailureController.setEnabled(true), { available: false, openAtLogin: false })
  assert.deepEqual(
    writeFailureController.getStatus(),
    { available: false, openAtLogin: false }
  )
})
