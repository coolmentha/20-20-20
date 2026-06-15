export const START_AT_LOGIN_ARG = '--start-at-login-hidden'

export function isStartAtLoginLaunch(argv = []) {
  return argv.includes(START_AT_LOGIN_ARG)
}

export function createStartAtLoginController({ app, platform = process.platform } = {}) {
  let unavailable = false

  function canUseLoginItem() {
    return !unavailable && platform === 'win32' && app?.isPackaged === true
  }

  function unavailableStatus() {
    return { available: false, openAtLogin: false }
  }

  function markUnavailable() {
    unavailable = true
    return unavailableStatus()
  }

  function getLoginItemOptions() {
    return {
      path: app.getPath('exe'),
      args: [START_AT_LOGIN_ARG]
    }
  }

  function getStatus() {
    if (!canUseLoginItem()) return unavailableStatus()

    try {
      const settings = app.getLoginItemSettings(getLoginItemOptions())
      return { available: true, openAtLogin: settings.openAtLogin === true }
    } catch {
      return markUnavailable()
    }
  }

  function setEnabled(enabled) {
    if (!canUseLoginItem()) return unavailableStatus()

    try {
      app.setLoginItemSettings({
        ...getLoginItemOptions(),
        openAtLogin: enabled
      })
    } catch {
      return markUnavailable()
    }

    return getStatus()
  }

  return {
    getStatus,
    setEnabled
  }
}
