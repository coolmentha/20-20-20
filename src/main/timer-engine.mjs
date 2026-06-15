export const DEFAULT_TIMER_CONFIG = {
  workSecs: 20 * 60,
  breakSecs: 20,
  movementActiveSecs: 60 * 60,
  movementBreakSecs: 2 * 60
}

export const REMINDER_PAYLOADS = {
  eye: {
    type: 'eye',
    seconds: DEFAULT_TIMER_CONFIG.breakSecs,
    title: '眼睛休息时间',
    description: '看向 6 米外的地方',
    canSkip: true
  },
  movement: {
    type: 'movement',
    seconds: DEFAULT_TIMER_CONFIG.movementBreakSecs,
    title: '站起来活动一下',
    description: '离开屏幕，活动 2 分钟',
    canSkip: true
  }
}

export function createTimerState(config = DEFAULT_TIMER_CONFIG) {
  return {
    remaining: config.workSecs,
    movementRemaining: config.movementActiveSecs,
    breakCount: 0,
    paused: false,
    activeReminderType: null,
    awayActive: false,
    awayRestCounted: false
  }
}

export function applyTimerEvent(state, event, config = DEFAULT_TIMER_CONFIG) {
  if (event.type === 'away-started') {
    return {
      state: { ...state, awayActive: true, awayRestCounted: false },
      effects: []
    }
  }

  if (event.type === 'away-finished' && event.elapsedSecs >= config.movementBreakSecs) {
    const counted = state.awayRestCounted
    return {
      state: {
        ...state,
        remaining: config.workSecs,
        movementRemaining: config.movementActiveSecs,
        breakCount: counted ? state.breakCount : state.breakCount + 1,
        activeReminderType: null,
        awayActive: false,
        awayRestCounted: false
      },
      effects: state.activeReminderType ? [{ type: 'hide-reminder' }] : []
    }
  }

  if (event.type === 'away-finished' && event.elapsedSecs >= config.breakSecs) {
    const counted = state.awayRestCounted
    return {
      state: {
        ...state,
        remaining: config.workSecs,
        breakCount: counted ? state.breakCount : state.breakCount + 1,
        activeReminderType: state.activeReminderType === 'eye' ? null : state.activeReminderType,
        awayActive: false,
        awayRestCounted: false
      },
      effects: state.activeReminderType === 'eye' ? [{ type: 'hide-reminder' }] : []
    }
  }

  if (event.type === 'away-finished') {
    return {
      state: { ...state, awayActive: false, awayRestCounted: false },
      effects: []
    }
  }

  if (event.type === 'reminder-complete' && state.activeReminderType === event.reminderType) {
    const resetMovement = event.reminderType === 'movement'
    return {
      state: {
        ...state,
        remaining: config.workSecs,
        movementRemaining: resetMovement ? config.movementActiveSecs : state.movementRemaining,
        breakCount: state.breakCount + 1,
        activeReminderType: null,
        awayRestCounted: state.awayActive ? true : state.awayRestCounted
      },
      effects: [{ type: 'hide-reminder' }]
    }
  }

  if (event.type !== 'active-second' || state.paused || state.activeReminderType) {
    return { state, effects: [] }
  }

  const next = {
    ...state,
    remaining: state.remaining - 1,
    movementRemaining: state.movementRemaining - 1
  }

  if (next.movementRemaining <= 0) {
    return {
      state: { ...next, movementRemaining: 0, activeReminderType: 'movement' },
      effects: [{ type: 'show-reminder', reminder: REMINDER_PAYLOADS.movement }]
    }
  }

  if (next.remaining <= 0) {
    return {
      state: { ...next, remaining: 0, activeReminderType: 'eye' },
      effects: [{ type: 'show-reminder', reminder: REMINDER_PAYLOADS.eye }]
    }
  }

  return { state: next, effects: [] }
}
