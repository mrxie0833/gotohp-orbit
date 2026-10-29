<script setup lang="ts">
import { computed } from 'vue'
import type { ThreadStatus } from '../utils/UploadManager'
import { Progress } from '@/components/ui/progress'

const props = defineProps<{
  thread: ThreadStatus
}>()

const statusConfig = computed(() => {
  switch (props.thread.Status) {
    case 'error':
      return { color: 'text-destructive', bg: 'bg-destructive/15 border-destructive/25', label: 'Error' }
    case 'completed':
      return { color: 'text-emerald-500', bg: 'bg-emerald-500/15 border-emerald-500/25', label: 'Done' }
    case 'skipped':
      return { color: 'text-amber-500', bg: 'bg-amber-500/15 border-amber-500/25', label: 'Skipped' }
    case 'uploading':
      if (props.thread.Attempt > 1) {
        return { color: 'text-orange-500', bg: 'bg-orange-500/15 border-orange-500/25', label: `Retry ${props.thread.Attempt - 1}` }
      }
      return { color: 'text-primary', bg: 'bg-primary/15 border-primary/25', label: 'Uploading' }
    case 'hashing':
      return { color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/25', label: 'Hashing' }
    case 'checking':
      return { color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/25', label: 'Checking' }
    case 'finalizing':
      return { color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/25', label: 'Finalizing' }
    default:
      return { color: 'text-muted-foreground', bg: 'bg-muted/60 border-border/40', label: props.thread.Status }
  }
})

const uploadPercent = computed(() => {
  if (props.thread.Status !== 'uploading' || !props.thread.BytesTotal) {
    return null
  }
  return Math.round((props.thread.BytesUploaded / props.thread.BytesTotal) * 100)
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const fileSizeDisplay = computed(() => {
  if (props.thread.Status !== 'uploading' || !props.thread.BytesTotal) {
    return null
  }
  return `${formatBytes(props.thread.BytesUploaded)} / ${formatBytes(props.thread.BytesTotal)}`
})

const statusMessage = computed(() => props.thread.Message.replace(/^Error:\s*/, ''))
</script>

<template>
  <div class="px-2.5 py-2 bg-card/70 border border-border/70 rounded-lg shadow-2xs transition-colors">
    <!-- Top row: worker ID + status badge + filename -->
    <div class="flex items-center gap-1.5 mb-1">
      <span class="text-[10px] font-mono text-muted-foreground/80 px-1 py-0.5 rounded bg-muted/50 border border-border/40 leading-none">
        #{{ thread.WorkerID }}
      </span>
      <span 
        :class="[
          'text-[10px] font-medium px-1.5 py-0.5 rounded border leading-none',
          statusConfig.color,
          statusConfig.bg
        ]"
      >
        {{ statusConfig.label }}
      </span>
      <span
        v-if="thread.FileName"
        class="flex-1 text-xs font-medium truncate text-foreground/90 ml-0.5"
        :title="thread.FilePath"
      >
        {{ thread.FileName }}
      </span>
      <span
        v-else
        class="flex-1 text-xs truncate text-muted-foreground ml-0.5"
      >
        {{ thread.Message }}
      </span>
    </div>

    <!-- Progress bar (only when uploading) -->
    <template v-if="uploadPercent !== null">
      <Progress
        :model-value="uploadPercent"
        class="h-1.5 my-1"
      />
      <div class="flex justify-between items-center text-[10px] text-muted-foreground tabular-nums">
        <span>{{ fileSizeDisplay }}</span>
        <span class="font-medium text-foreground/80">{{ uploadPercent }}%</span>
      </div>
    </template>
    <p
      v-else-if="thread.Status === 'error' || thread.Status === 'skipped'"
      :class="[
        'mt-1 text-[11px] leading-snug break-words',
        thread.Status === 'error' ? 'text-destructive font-medium' : 'text-muted-foreground'
      ]"
    >
      {{ statusMessage }}
    </p>
  </div>
</template>
