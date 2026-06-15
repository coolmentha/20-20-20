import {
  applyTimerEvent,
  createTimerState,
  DEFAULT_TIMER_CONFIG,
  REMINDER_PAYLOADS
} from './timer-engine.mjs'

export function createTimerRuntime({ config = DEFAULT_TIMER_CONFIG, now = () => Date.now() } = {}) {
  const timerConfig = { ...DEFAULT_TIMER_CONFIG, ...config }
  let timerState = createTimerState(timerConfig)
  let awayRestStartedAt = null

  function runTimerEvent(event) {
    const result = applyTimerEvent(timerState, event, timerConfig)
    timerState = result.state
    return result.effects
  }

  function requestReminder(reminder) {
    if (timerState.activeReminderType !== null) return []

    timerState = { ...timerState, activeReminderType: reminder.type }
    return [{ type: 'show-reminder', reminder }]
  }

  return {
    dispatch(action) {
      if (action.type === 'toggle-pause') {
        timerState = { ...timerState, paused: !timerState.paused }
        return []
      }

      if (action.type === 'request-immediate-reminder') {
        const reminder = timerState.movementRemaining <= 0
          ? REMINDER_PAYLOADS.movement
          : REMINDER_PAYLOADS.eye
        return requestReminder(reminder)
      }

      if (action.type === 'request-immediate-movement-reminder') {
        return requestReminder(REMINDER_PAYLOADS.movement)
      }

      if (action.type === 'away-started') {
        if (awayRestStartedAt !== null) return []
        awayRestStartedAt = now()
        return runTimerEvent(action)
      }

      if (action.type === 'away-finished') {
        if (awayRestStartedAt === null) return []

        const elapsedSecs = (now() - awayRestStartedAt) / 1000
        awayRestStartedAt = null
        return runTimerEvent({ type: 'away-finished', elapsedSecs })
      }

      if (action.type === 'reminder-complete') {
        return runTimerEvent({
          type: 'reminder-complete',
          reminderType: action.reminderType ?? timerState.activeReminderType
        })
      }

      if (action.type === 'active-second') {
        return runTimerEvent(action)
      }

      return []
    },
    getStatus() {
      return {
        remaining: Math.max(0, timerState.remaining),
        movementRemaining: Math.max(0, timerState.movementRemaining),
        breakCount: timerState.breakCount,
        paused: timerState.paused,
        activeReminderType: timerState.activeReminderType
      }
    }
  }
}
