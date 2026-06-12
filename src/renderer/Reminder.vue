<template>
  <div class="overlay">
    <div class="card">
      <svg viewBox="0 0 120 120" class="ring">
        <circle cx="60" cy="60" r="50" class="track" />
        <circle cx="60" cy="60" r="50" class="arc" :stroke-dashoffset="arcOffset" />
      </svg>
      <div class="num">{{ count }}</div>
      <p class="title">{{ title }}</p>
      <p class="desc">{{ description }}</p>
      <button v-if="canSkip" class="skip" @click="done">跳过</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const TOTAL = 20
const CIRC = 2 * Math.PI * 50

const count = ref(TOTAL)
const total = ref(TOTAL)
const type = ref('eye')
const title = ref('眼睛休息时间')
const description = ref('看向 6 米外的地方')
const canSkip = ref(true)
const arcColor = computed(() => type.value === 'movement' ? '#f59e0b' : '#34d399')
const arcOffset = computed(() => CIRC * (1 - count.value / total.value))

let breakTimer

function done() {
  clearInterval(breakTimer)
  breakTimer = undefined
  count.value = total.value
  window.api.reminderDone(type.value)
}

function normalizePayload(payload) {
  if (typeof payload === 'number') {
    return {
      type: 'eye',
      seconds: payload,
      title: '眼睛休息时间',
      description: '看向 6 米外的地方',
      canSkip: true
    }
  }

  return {
    type: payload?.type ?? 'eye',
    seconds: payload?.seconds ?? TOTAL,
    title: payload?.title ?? '眼睛休息时间',
    description: payload?.description ?? '看向 6 米外的地方',
    canSkip: payload?.canSkip ?? true
  }
}

onMounted(() => {
  window.api.onReminderStart(payload => {
    const reminder = normalizePayload(payload)
    clearInterval(breakTimer)
    type.value = reminder.type
    total.value = reminder.seconds
    count.value = reminder.seconds
    title.value = reminder.title
    description.value = reminder.description
    canSkip.value = reminder.canSkip
    breakTimer = setInterval(() => {
      count.value--
      if (count.value <= 0) done()
    }, 1000)
  })
})

onUnmounted(() => clearInterval(breakTimer))
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: transparent; font-family: -apple-system, 'Segoe UI', sans-serif; }

.overlay {
  width: 100vw;
  height: 100vh;
  background: rgba(6, 6, 16, 0.34);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 18px;
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: relative;
}

.ring { width: 120px; height: 120px; transform: rotate(-90deg); }
.track { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 6; }
.arc {
  fill: none;
  stroke: v-bind(arcColor);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: v-bind(CIRC);
  transition: stroke-dashoffset 1s linear;
}

.num {
  position: absolute;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 200;
  color: #fff;
}

.title { font-size: 18px; font-weight: 500; color: #fff; }
.desc { font-size: 13px; color: rgba(255,255,255,0.5); }

.skip {
  margin-top: 8px;
  background: none;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  color: rgba(255,255,255,0.35);
  font-size: 12px;
  padding: 5px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.skip:hover { color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.3); }
</style>
