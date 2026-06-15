import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_TIMER_CONFIG,
  applyTimerEvent,
  createTimerState
} from '../src/main/timer-engine.mjs'

test('主动看屏时间累计 60 分钟后触发 120 秒可跳过的站立活动提醒', () => {
  const config = {
    ...DEFAULT_TIMER_CONFIG,
    workSecs: DEFAULT_TIMER_CONFIG.movementActiveSecs + 1
  }
  let state = createTimerState(config)
  const effects = []

  for (let i = 0; i < config.movementActiveSecs; i++) {
    const result = applyTimerEvent(state, { type: 'active-second' }, config)
    state = result.state
    effects.push(...result.effects)
  }

  assert.deepEqual(effects.at(-1), {
    type: 'show-reminder',
    reminder: {
      type: 'movement',
      seconds: 120,
      title: '站起来活动一下',
      description: '离开屏幕，活动 2 分钟',
      canSkip: true
    }
  })
  assert.equal(state.activeReminderType, 'movement')
  assert.equal(state.movementRemaining, 0)
})

test('护眼和站立活动同时到期时只触发站立活动提醒', () => {
  const state = {
    ...createTimerState(),
    remaining: 1,
    movementRemaining: 1
  }

  const result = applyTimerEvent(state, { type: 'active-second' })

  assert.deepEqual(result.effects, [
    {
      type: 'show-reminder',
      reminder: {
        type: 'movement',
        seconds: 120,
        title: '站起来活动一下',
        description: '离开屏幕，活动 2 分钟',
        canSkip: true
      }
    }
  ])
  assert.equal(result.state.activeReminderType, 'movement')
  assert.equal(result.state.remaining, 0)
  assert.equal(result.state.movementRemaining, 0)
})

test('工作周期到期时触发 20 秒可跳过的护眼提醒', () => {
  const state = {
    ...createTimerState(),
    remaining: 1,
    movementRemaining: 10
  }

  const result = applyTimerEvent(state, { type: 'active-second' })

  assert.deepEqual(result.effects, [
    {
      type: 'show-reminder',
      reminder: {
        type: 'eye',
        seconds: 20,
        title: '眼睛休息时间',
        description: '看向 6 米外的地方',
        canSkip: true
      }
    }
  ])
  assert.equal(result.state.activeReminderType, 'eye')
  assert.equal(result.state.remaining, 0)
  assert.equal(result.state.movementRemaining, 9)
})

test('完成站立活动会重置站立活动计时和护眼倒计时并计一次休息', () => {
  const state = {
    ...createTimerState(),
    remaining: 0,
    movementRemaining: 0,
    breakCount: 2,
    activeReminderType: 'movement'
  }

  const result = applyTimerEvent(state, { type: 'reminder-complete', reminderType: 'movement' })

  assert.equal(result.state.remaining, DEFAULT_TIMER_CONFIG.workSecs)
  assert.equal(result.state.movementRemaining, DEFAULT_TIMER_CONFIG.movementActiveSecs)
  assert.equal(result.state.breakCount, 3)
  assert.equal(result.state.activeReminderType, null)
  assert.deepEqual(result.effects, [{ type: 'hide-reminder' }])
})

test('完成护眼休息只重置护眼倒计时不重置站立活动计时', () => {
  const state = {
    ...createTimerState(),
    remaining: 0,
    movementRemaining: 30,
    breakCount: 4,
    activeReminderType: 'eye'
  }

  const result = applyTimerEvent(state, { type: 'reminder-complete', reminderType: 'eye' })

  assert.equal(result.state.remaining, DEFAULT_TIMER_CONFIG.workSecs)
  assert.equal(result.state.movementRemaining, 30)
  assert.equal(result.state.breakCount, 5)
  assert.equal(result.state.activeReminderType, null)
  assert.deepEqual(result.effects, [{ type: 'hide-reminder' }])
})

test('锁屏或休眠达到 120 秒会重置站立活动计时和护眼倒计时并计一次休息', () => {
  const state = {
    ...createTimerState(),
    remaining: 500,
    movementRemaining: 30,
    breakCount: 1
  }

  const result = applyTimerEvent(state, { type: 'away-finished', elapsedSecs: 120 })

  assert.equal(result.state.remaining, DEFAULT_TIMER_CONFIG.workSecs)
  assert.equal(result.state.movementRemaining, DEFAULT_TIMER_CONFIG.movementActiveSecs)
  assert.equal(result.state.breakCount, 2)
  assert.equal(result.state.activeReminderType, null)
  assert.deepEqual(result.effects, [])
})

test('锁屏或休眠 20 到 119 秒只重置护眼倒计时不重置站立活动计时', () => {
  const state = {
    ...createTimerState(),
    remaining: 200,
    movementRemaining: 25,
    breakCount: 1
  }

  const result = applyTimerEvent(state, { type: 'away-finished', elapsedSecs: 119 })

  assert.equal(result.state.remaining, DEFAULT_TIMER_CONFIG.workSecs)
  assert.equal(result.state.movementRemaining, 25)
  assert.equal(result.state.breakCount, 2)
  assert.equal(result.state.activeReminderType, null)
  assert.deepEqual(result.effects, [])
})

test('锁屏或休眠少于 20 秒只暂停不计休息不重置倒计时', () => {
  const state = {
    ...createTimerState(),
    remaining: 200,
    movementRemaining: 25,
    breakCount: 1
  }

  const result = applyTimerEvent(state, { type: 'away-finished', elapsedSecs: 19 })

  assert.deepEqual(result.state, state)
  assert.deepEqual(result.effects, [])
})

test('应用暂停时主动看屏 tick 不推进任何倒计时', () => {
  const state = {
    ...createTimerState(),
    remaining: 200,
    movementRemaining: 25,
    paused: true
  }

  const result = applyTimerEvent(state, { type: 'active-second' })

  assert.deepEqual(result.state, state)
  assert.deepEqual(result.effects, [])
})

test('锁屏期间护眼提醒先完成后满 120 秒解锁不会重复计休息次数', () => {
  let state = {
    ...createTimerState(),
    remaining: 0,
    movementRemaining: 30,
    activeReminderType: 'eye'
  }

  state = applyTimerEvent(state, { type: 'away-started' }).state
  state = applyTimerEvent(state, { type: 'reminder-complete', reminderType: 'eye' }).state
  const result = applyTimerEvent(state, { type: 'away-finished', elapsedSecs: 120 })

  assert.equal(result.state.remaining, DEFAULT_TIMER_CONFIG.workSecs)
  assert.equal(result.state.movementRemaining, DEFAULT_TIMER_CONFIG.movementActiveSecs)
  assert.equal(result.state.breakCount, 1)
  assert.equal(result.state.activeReminderType, null)
  assert.equal(result.state.awayActive, false)
  assert.equal(result.state.awayRestCounted, false)
})
