<script setup lang="ts">
defineProps<{ label: string; tone?: 'danger' }>()
const on = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    role="switch"
    class="toggle"
    :aria-checked="on"
    :aria-label="label"
    :data-tone="tone"
    @click="on = !on"
  />
</template>
