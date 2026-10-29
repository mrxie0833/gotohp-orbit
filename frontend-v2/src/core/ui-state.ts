import { ref } from 'vue'

export type Section = 'stage' | 'journal' | 'tuning' | 'identities'

export const section = ref<Section>('stage')
export const connectOpen = ref(false)
