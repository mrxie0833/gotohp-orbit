<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { dismiss, toasts, type ToastItem } from './toast'

// Swipe up to dismiss; a quick flick is enough, distance is not required.
const SWIPE_DISTANCE = 36
const SWIPE_VELOCITY = 0.11

const dragging = ref<{ id: number; startY: number; startT: number; dy: number } | null>(null)

function down(e: PointerEvent, t: ToastItem) {
  if (dragging.value) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  dragging.value = { id: t.id, startY: e.clientY, startT: performance.now(), dy: 0 }
}
function move(e: PointerEvent) {
  const d = dragging.value
  if (!d) return
  const raw = e.clientY - d.startY
  // Friction downward, 1:1 upward.
  d.dy = raw > 0 ? raw * 0.2 : raw
}
function up() {
  const d = dragging.value
  if (!d) return
  const elapsed = Math.max(1, performance.now() - d.startT)
  const velocity = Math.abs(d.dy) / elapsed
  dragging.value = null
  if (d.dy < 0 && (Math.abs(d.dy) >= SWIPE_DISTANCE || velocity > SWIPE_VELOCITY)) dismiss(d.id)
}
onBeforeUnmount(() => (dragging.value = null))

const style = (t: ToastItem) =>
  dragging.value?.id === t.id ? { transform: `translateY(${dragging.value.dy}px)`, transition: 'none' } : undefined
</script>

<template>
  <div
    class="toast-region"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :data-kind="t.kind"
        :style="style(t)"
        @pointerdown="down($event, t)"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
      >
        <span class="toast-dot" />
        <div class="toast-text">
          <strong>{{ t.title }}</strong>
          <span v-if="t.description">{{ t.description }}</span>
        </div>
        <button
          v-if="t.action"
          class="toast-action"
          @pointerdown.stop
          @click="t.action.run(); dismiss(t.id)"
        >
          {{ t.action.label }}
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
