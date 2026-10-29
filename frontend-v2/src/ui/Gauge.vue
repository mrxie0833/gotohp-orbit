<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { createSpring, stepSpring } from '@/core/spring'

const props = defineProps<{ progress: number }>() // 0..1

const R = 98
const C = 2 * Math.PI * R
const shown = ref(0)
const spring = createSpring(0, 0.45)
let raf = 0
let last = 0

function frame(t: number) {
  const dt = Math.min(0.05, (t - last) / 1000)
  last = t
  const settled = stepSpring(spring, dt)
  shown.value = spring.value
  raf = settled ? 0 : requestAnimationFrame(frame)
}

watch(
  () => props.progress,
  p => {
    spring.target = Math.min(1, Math.max(0, p))
    if (!raf) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div
    class="gauge"
    role="progressbar"
    :aria-valuenow="Math.round(progress * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <svg viewBox="0 0 220 220">
      <circle
        class="track"
        cx="110"
        cy="110"
        :r="R"
      />
      <circle
        class="bar"
        cx="110"
        cy="110"
        :r="R"
        :stroke-dasharray="C"
        :stroke-dashoffset="C * (1 - shown)"
      />
    </svg>
    <div class="gauge-center">
      <slot />
    </div>
  </div>
</template>
