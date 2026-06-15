<template>
  <div class="window">
    <button class="close-btn" @mousedown.stop @click.stop="hide">✕</button>

    <div class="ring-wrap">
      <svg viewBox="0 0 120 120" class="ring-svg">
        <circle cx="60" cy="60" r="52" class="track" />
        <circle cx="60" cy="60" r="52" class="progress" :stroke-dashoffset="offset" />
      </svg>
      <div class="center-text">
        <span class="time">{{ timeStr }}</span>
        <span class="label">距下次休息</span>
      </div>
    </div>

    <div class="stats">今日已休息 <b>{{ breakCount }}</b> 次</div>
    <div class="movement">站立活动 {{ movementTimeStr }}</div>

    <button class="action-btn" @mousedown.stop @click.stop="togglePause">
      {{ paused ? '▶ 继续' : '⏸ 暂停' }}
    </button>
    <div class="action-row">
      <button class="action-btn secondary" @mousedown.stop @click.stop="remindNow">立即提醒</button>
      <button class="action-btn secondary" @mousedown.stop @click.stop="remindMovementNow">站立活动</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatTime } from './time-format.mjs'

const remaining = ref(1200)
const movementRemaining = ref(3600)
const breakCount = ref(0)
const paused = ref(false)

const TOTAL = 1200
const CIRC = 2 * Math.PI * 52

const offset = computed(() => CIRC * (1 - remaining.value / TOTAL))
const timeStr = computed(() => formatTime(remaining.value))
const movementTimeStr = computed(() => formatTime(movementRemaining.value))

let timer
async function refresh() {
  const s = await window.api.getStatus()
  remaining.value = s.remaining
  movementRemaining.value = s.movementRemaining
  breakCount.value = s.breakCount
  paused.value = s.paused
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 1000)
})
onUnmounted(() => clearInterval(timer))

function togglePause() { window.api.trayAction('pause') }
function remindNow() { window.api.trayAction('remind') }
function remindMovementNow() { window.api.remindMovement() }
function hide() { window.api.hideToTray() }
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: transparent;
  font-family: -apple-system, 'Segoe UI', sans-serif;
  -webkit-app-region: no-drag;
  user-select: none;
}

.window {
  width: 232px;
  height: 300px;
  background: rgba(12, 12, 24, 0.48);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 14px 14px;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.close-btn {
  align-self: flex-end;
  background: none;
  border: none;
  color: rgba(255,255,255,0.28);
  cursor: pointer;
  font-size: 12px;
  -webkit-app-region: no-drag;
}
.close-btn:hover { color: rgba(255,255,255,0.58); }

.ring-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  -webkit-app-region: drag;
}
.ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }

.track { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 5; }
.progress {
  fill: none;
  stroke: rgba(79, 156, 249, 0.78);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: v-bind(CIRC);
  transition: stroke-dashoffset 1s linear;
}

.center-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
.time { font-size: 26px; font-weight: 300; color: rgba(255,255,255,0.82); letter-spacing: 1px; }
.label { font-size: 11px; color: rgba(255,255,255,0.32); }

.stats { font-size: 12px; color: rgba(255,255,255,0.34); -webkit-app-region: drag; }
.stats b { color: rgba(79, 156, 249, 0.78); }
.movement {
  font-size: 11px;
  color: rgba(255,255,255,0.28);
  line-height: 1;
  -webkit-app-region: drag;
}

.action-btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 9px;
  background: rgba(79, 156, 249, 0.08);
  border: 1px solid rgba(79, 156, 249, 0.16);
  color: rgba(79, 156, 249, 0.78);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  -webkit-app-region: no-drag;
}
.action-btn:hover { background: rgba(79, 156, 249, 0.14); }
.action-row {
  width: 100%;
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}
.action-row .action-btn {
  flex: 1;
  padding-left: 4px;
  padding-right: 4px;
}
.action-btn.secondary {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.42);
}
.action-btn.secondary:hover { background: rgba(255,255,255,0.06); }
</style>
