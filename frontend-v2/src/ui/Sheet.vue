<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
defineProps<{ label: string }>()

const panel = ref<HTMLElement | null>(null)
let returnTo: HTMLElement | null = null

watch(open, async isOpen => {
  if (isOpen) {
    returnTo = document.activeElement as HTMLElement | null
    await nextTick()
    const first = panel.value?.querySelector<HTMLElement>('input, button, [tabindex]')
    first?.focus()
  } else {
    returnTo?.focus?.()
  }
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition name="sheet">
    <div
      v-if="open"
      class="scrim"
      @pointerdown.self="open = false"
    >
      <div
        ref="panel"
        class="sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="label"
      >
        <slot />
      </div>
    </div>
  </Transition>
</template>
