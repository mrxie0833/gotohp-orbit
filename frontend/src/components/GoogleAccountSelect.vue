<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, Plus, X, User } from '@lucide/vue'
import {
  SelectItem as SelectItemPrimitive,
  SelectItemIndicator,
  SelectItemText,
} from 'reka-ui'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  modelValue?: string
  options?: string[]
  removingAccount?: string
}

interface Emits {
  (event: 'update:modelValue', value: string): void
  (event: 'item-removed', value: string): void
  (event: 'add'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  options: () => [],
  removingAccount: '',
})

const emit = defineEmits<Emits>()
const isOpen = ref(false)
const selectedValue = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  if (newValue !== selectedValue.value) {
    selectedValue.value = newValue || ''
  }
})

watch(selectedValue, (newValue) => {
  emit('update:modelValue', newValue)
})
</script>

<template>
  <Select
    v-model="selectedValue"
    v-model:open="isOpen"
  >
    <SelectTrigger class="h-7 px-2.5 text-xs max-w-[210px] bg-background/60 hover:bg-accent/60 border-border/70 rounded-lg select-none gap-1.5 font-medium transition-colors">
      <div class="flex items-center gap-1.5 min-w-0">
        <User class="size-3.5 text-primary shrink-0" />
        <SelectValue placeholder="Select account" />
      </div>
    </SelectTrigger>
    <SelectContent
      align="start"
      class="w-max min-w-[var(--reka-select-trigger-width)] max-w-[min(18rem,calc(100vw-2rem))] bg-popover/95 backdrop-blur-md border-border/80 shadow-lg"
    >
      <SelectGroup>
        <div
          v-for="option in options"
          :key="option"
          class="relative flex items-center group"
        >
          <SelectItemPrimitive
            :value="option"
            class="focus:bg-accent focus:text-accent-foreground relative flex min-w-0 w-full cursor-pointer items-center rounded-md py-1.5 pr-8 pl-7 text-xs outline-hidden select-none transition-colors"
          >
            <span class="absolute left-2 flex size-3.5 items-center justify-center text-primary">
              <SelectItemIndicator>
                <Check class="size-3.5" />
              </SelectItemIndicator>
            </span>
            <SelectItemText class="min-w-0 flex-1">
              <span class="block max-w-48 truncate">{{ option }}</span>
            </SelectItemText>
          </SelectItemPrimitive>
          <button
            type="button"
            class="absolute right-1.5 top-1/2 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-destructive hover:text-white transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50"
            :aria-label="`Remove ${option}`"
            :title="`Remove ${option}`"
            :disabled="removingAccount === option"
            @pointerdown.stop.prevent
            @click.stop.prevent="emit('item-removed', option)"
          >
            <X class="size-3" />
          </button>
        </div>
      </SelectGroup>
      <SelectSeparator
        v-if="options.length"
        class="my-1 opacity-60"
      />
      <button
        type="button"
        class="focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 pl-7 text-xs font-medium text-muted-foreground outline-hidden select-none hover:bg-accent hover:text-foreground transition-colors"
        @pointerdown.stop.prevent
        @click.stop.prevent="isOpen = false; emit('add')"
      >
        <Plus class="size-3.5 text-primary" />
        Add account
      </button>
    </SelectContent>
  </Select>
</template>
