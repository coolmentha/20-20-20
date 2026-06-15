import test from 'node:test'
import assert from 'node:assert/strict'
import { createTimerRuntime } from '../src/main/timer-runtime.mjs'
import { DEFAULT_TIMER_CONFIG } from '../src/main/timer-engine.mjs'

test('工作周期到期后 runtime 返回护眼提醒 effect 并投影状态', () => {
  const runtime = createTimerRuntime({
    config: {
      workSecs: 1,
      breakSecs: 20,
      movementActiveSecs: 10,
      movementBreakSecs: 120
    }
  })

  const effects = runtime.dispatch({ type: 'active-second' })

  assert.deepEqual(effects, [
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
  assert.deepEqual(runtime.getStatus(), {
    remaining: 0,
    movementRemaining: 9,
    breakCount: 0,
    paused: false,
    activeReminderType: 'eye'
  })
})

test('暂停后主动看屏时间不推进工作周期', () => {
  const runtime = createTimerRuntime({
    config: {
      workSecs: 2,
      breakSecs: 20,
      movementActiveSecs: 10,
      movementBreakSecs: 120
    }
  })

  const pauseEffects = runtime.dispatch({ type: 'toggle-pause' })
  const tickEffects = runtime.dispatch({ type: 'active-second' })

  assert.deepEqual(pauseEffects, [])
  assert.deepEqual(tickEffects, [])
  assert.deepEqual(runtime.getStatus(), {
    remaining: 2,
    movementRemaining: 10,
    breakCount: 0,
    paused: true,
    activeReminderType: null
  })
})

test('立即提醒会显示护眼提醒且重复请求不叠加提醒', () => {
  const runtime = createTimerRuntime({
    config: {
      workSecs: 20,
      breakSecs: 20,
      movementActiveSecs: 60,
      movementBreakSecs: 120
    }
  })

  const firstEffects = runtime.dispatch({ type: 'request-immediate-reminder' })
  const secondEffects = runtime.dispatch({ type: 'request-immediate-reminder' })

  assert.deepEqual(firstEffects, [
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
  assert.deepEqual(secondEffects, [])
  assert.equal(runtime.getStatus().activeReminderType, 'eye')
})

test('立即站立活动会显示 2 分钟可跳过的站立活动提醒', () => {
  const runtime = createTimerRuntime({
    config: {
      workSecs: 20,
      breakSecs: 20,
      movementActiveSecs: 60,
      movementBreakSecs: 120
    }
  })

  const firstEffects = runtime.dispatch({ type: 'request-immediate-movement-reminder' })
  const secondEffects = runtime.dispatch({ type: 'request-immediate-movement-reminder' })

  assert.deepEqual(firstEffects, [
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
  assert.deepEqual(secondEffects, [])
  assert.equal(runtime.getStatus().activeReminderType, 'movement')
})

test('锁屏或休眠达到活动重置休息时长后返回隐藏提醒 effect 并重置状态', () => {
  let now = 1_000
  const runtime = createTimerRuntime({
    config: {
      workSecs: 20,
      breakSecs: 20,
      movementActiveSecs: 60,
      movementBreakSecs: 120
    },
    now: () => now
  })

  runtime.dispatch({ type: 'active-second' })
  runtime.dispatch({ type: 'request-immediate-reminder' })
  runtime.dispatch({ type: 'away-started' })
  now += 120_000
  const effects = runtime.dispatch({ type: 'away-finished' })

  assert.deepEqual(effects, [{ type: 'hide-reminder' }])
  assert.deepEqual(runtime.getStatus(), {
    remaining: 20,
    movementRemaining: 60,
    breakCount: 1,
    paused: false,
    activeReminderType: null
  })
})

test('提醒完成未传类型时使用当前激活提醒类型完成有效休息', () => {
  const runtime = createTimerRuntime({
    config: {
      workSecs: 20,
      breakSecs: 20,
      movementActiveSecs: 60,
      movementBreakSecs: 120
    }
  })

  runtime.dispatch({ type: 'active-second' })
  runtime.dispatch({ type: 'request-immediate-reminder' })
  const effects = runtime.dispatch({ type: 'reminder-complete' })

  assert.deepEqual(effects, [{ type: 'hide-reminder' }])
  assert.deepEqual(runtime.getStatus(), {
    remaining: 20,
    movementRemaining: 59,
    breakCount: 1,
    paused: false,
    activeReminderType: null
  })
})

test('runtime 使用部分配置时仍投影有效站立活动剩余时间', () => {
  const runtime = createTimerRuntime({
    config: {
      workSecs: 1
    }
  })

  assert.equal(runtime.getStatus().movementRemaining, DEFAULT_TIMER_CONFIG.movementActiveSecs)
})
