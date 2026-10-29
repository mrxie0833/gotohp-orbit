<script setup lang="ts">
defineProps<{ name: keyof typeof paths }>()

// 24x24 stroke icons, hand-drawn for this app.
const paths = {
  stage: 'M12 3v12m0-12L7.5 7.5M12 3l4.5 4.5M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3',
  journal: 'M7 4h10a2 2 0 0 1 2 2v13l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 0 1 2-2zm1 5h8m-8 4h5',
  tuning: 'M5 7h9m4 0h1M5 17h3m4 0h7M14 4v6m-6 4v6',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm-6 9a6 6 0 0 1 12 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.2A6 6 0 0 1 21 20',
  photo: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm0 11 4.5-4.5a2 2 0 0 1 2.8 0L16 17m-2-2 1.5-1.5a2 2 0 0 1 2.8 0L20 15m-9-6.5h.01',
  album: 'M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm8 3v6m-3-3h6',
  folders: 'M3 8a2 2 0 0 1 2-2h3.5l1.5 1.5H15a2 2 0 0 1 2 2V8M6 12a2 2 0 0 1 2-2h3l1.5 1.5H18a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  alert: 'M12 4 3 19h18zm0 5.5v4.5m0 3h.01',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm4 15h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
  stop: 'M7 7h10v10H7z',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  trash: 'M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13',
} as const
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
