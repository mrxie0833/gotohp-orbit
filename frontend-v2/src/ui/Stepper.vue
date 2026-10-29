<script setup lang="ts">
import Icon from './Icon.vue'

const props = withDefaults(defineProps<{ min?: number; max?: number; label: string }>(), { min: 1, max: 64 })
const value = defineModel<number>({ default: 1 })

const bump = (d: number) => (value.value = Math.min(props.max, Math.max(props.min, value.value + d)))
</script>

<template>
  <div
    class="stepper"
    role="group"
    :aria-label="label"
  >
    <button
      type="button"
      :disabled="value <= min"
      aria-label="Fewer"
      @click="bump(-1)"
    >
      <Icon name="minus" />
    </button>
    <output aria-live="polite">{{ value }}</output>
    <button
      type="button"
      :disabled="value >= max"
      aria-label="More"
      @click="bump(1)"
    >
      <Icon name="plus" />
    </button>
  </div>
</template>
