<script setup lang="ts">
import type { NumberFieldDecrementProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { Minus } from '@lucide/vue'
import { NumberFieldDecrement, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<NumberFieldDecrementProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <NumberFieldDecrement
    data-slot="decrement"
    v-bind="forwarded"
    :class="cn('absolute top-1/2 -translate-y-1/2 left-0 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-20 transition-colors', props.class)"
  >
    <slot>
      <Minus class="size-3.5" />
    </slot>
  </NumberFieldDecrement>
</template>
