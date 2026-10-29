<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Button from "./components/ui/button/Button.vue"
import { Progress } from "./components/ui/progress"
import { ScrollArea } from "./components/ui/scroll-area"
import ThreadProgress from "./components/ThreadProgress.vue"
import { uploadManager } from './utils/UploadManager'
import { X, Clock, Zap, FolderPlus, AlertTriangle, ChevronDown, ChevronUp, Hourglass } from '@lucide/vue'

const { state } = uploadManager

// Elapsed time ticker
const elapsedSeconds = ref(0)
const showWarningsList = ref(false)
let elapsedInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  elapsedInterval = setInterval(() => {
    if (state.startTime > 0) {
      elapsedSeconds.value = Math.floor((Date.now() - state.startTime) / 1000)
      uploadManager.tickEta()
      uploadManager.updateEta()
    }
  }, 1000)
})

onUnmounted(() => {
  if (elapsedInterval) {
    clearInterval(elapsedInterval)
  }
})

const threadsList = computed(() => {
  return Array.from(state.threads.values())
    .filter(thread => thread.Status !== 'idle')
    .sort((a, b) => a.WorkerID - b.WorkerID)
})

const progressPercent = computed(() => {
  if (state.totalFiles === 0) return 0
  return Math.round((state.uploadedFiles / state.totalFiles) * 100)
})

// Format bytes to human readable
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}

// Format speed
const speedDisplay = computed(() => {
  if (state.uploadSpeed <= 0) return '--'
  return formatBytes(state.uploadSpeed) + '/s'
})

// Format elapsed time
const elapsedDisplay = computed(() => {
  const seconds = elapsedSeconds.value
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
})

// Bytes progress display
const bytesDisplay = computed(() => {
  if (state.totalBytes === 0) return ''
  return `${formatBytes(state.uploadedBytes)} / ${formatBytes(state.totalBytes)}`
})

// Format ETA (estimated time remaining)
const etaDisplay = computed(() => {
  if (state.isCreatingAlbum) return 'Creating album...'
  if (state.uploadedFiles >= state.totalFiles && state.totalFiles > 0) return 'Finishing...'
  if (state.totalBytes > 0 && state.uploadedBytes >= state.totalBytes) return 'Finishing...'
  if (state.etaSeconds === null) return 'Estimating...'

  const sec = state.etaSeconds
  if (sec <= 3) return 'Finishing...'
  if (sec < 60) return `~${sec}s left`
  if (sec < 180) {
    const mins = Math.floor(sec / 60)
    const remSec = Math.round((sec % 60) / 15) * 15
    if (remSec === 60) {
      return `~${mins + 1}m left`
    }
    return remSec > 0 ? `~${mins}m ${remSec}s left` : `~${mins}m left`
  }
  if (sec < 3600) {
    const mins = Math.round(sec / 60)
    return `~${mins}m left`
  }
  const hours = Math.floor(sec / 3600)
  const remainingMins = Math.round((sec % 3600) / 60)
  return `~${hours}h ${remainingMins}m left`
})

// Album progress display
const albumProgressPercent = computed(() => {
  if (!state.albumStatus || state.albumStatus.TotalItems === 0) return 0
  return Math.round((state.albumStatus.ItemsAdded / state.albumStatus.TotalItems) * 100)
})

function warningFiles(paths: string[]): string {
  return paths.map(path => path.split(/[\\/]/).pop()).filter(Boolean).join(', ')
}
</script>

<template>
  <div class="flex flex-col h-full w-full px-4 py-3 select-none">
    <!-- Header with file count & percent -->
    <div class="text-center mb-2.5 shrink-0">
      <div class="flex items-baseline justify-center gap-1.5">
        <span class="text-3xl font-bold tracking-tight tabular-nums text-foreground">{{ state.uploadedFiles }}</span>
        <span class="text-muted-foreground/60 text-base font-normal">/</span>
        <span class="text-muted-foreground text-base font-medium tabular-nums">{{ state.totalFiles }}</span>
        <span class="text-xs text-muted-foreground/80 ml-1">files</span>
      </div>

      <!-- Stats row (Speed + Elapsed + ETA) in clean pill container -->
      <div class="inline-flex items-center justify-center gap-2.5 mt-1.5 px-3 py-1 rounded-full bg-card/60 border border-border/60 text-[11px] text-muted-foreground">
        <div class="flex items-center gap-1">
          <Zap
            :size="12"
            class="text-primary shrink-0"
          />
          <span class="tabular-nums font-medium text-foreground">{{ speedDisplay }}</span>
        </div>
        <span class="opacity-30">|</span>
        <div class="flex items-center gap-1">
          <Clock
            :size="12"
            class="text-muted-foreground shrink-0"
          />
          <span class="tabular-nums font-medium text-foreground">{{ elapsedDisplay }}</span>
        </div>
        <span class="opacity-30">|</span>
        <div class="flex items-center gap-1">
          <Hourglass
            :size="11"
            class="text-primary shrink-0"
          />
          <span class="tabular-nums font-medium text-foreground">{{ etaDisplay }}</span>
        </div>
      </div>
    </div>

    <!-- Main progress bar -->
    <div class="mb-3 shrink-0">
      <Progress
        :model-value="progressPercent"
        class="h-2 rounded-full overflow-hidden bg-muted"
      />
      <div class="flex justify-between items-center mt-1 text-[11px] text-muted-foreground">
        <span class="tabular-nums">{{ bytesDisplay || 'Progress' }}</span>
        <span class="font-semibold text-primary tabular-nums">{{ progressPercent }}%</span>
      </div>
    </div>

    <!-- Album creation progress card -->
    <div
      v-if="state.albumStatus && (state.isCreatingAlbum || state.albumStatus.IsComplete)"
      class="mb-2.5 p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 shrink-0 text-xs shadow-2xs"
    >
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-1.5 min-w-0">
          <FolderPlus
            :size="14"
            class="text-indigo-400 shrink-0"
          />
          <span class="font-medium truncate text-foreground/90 max-w-[200px]">
            {{ state.albumStatus.AlbumName }}
          </span>
        </div>
        <span class="text-[10px] text-indigo-400 font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15">
          {{ state.isCreatingAlbum ? 'Adding...' : 'Completed' }}
        </span>
      </div>
      <Progress
        :model-value="albumProgressPercent"
        class="h-1.5 mb-1"
      />
      <p class="text-[10px] text-muted-foreground tabular-nums text-right">
        {{ state.albumStatus.ItemsAdded }} / {{ state.albumStatus.TotalItems }} items
      </p>
    </div>

    <!-- Collapsible Preflight Warnings -->
    <div
      v-if="state.warnings.length"
      class="mb-2.5 shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs shadow-2xs"
    >
      <button
        type="button"
        class="w-full flex items-center justify-between font-medium text-amber-500 cursor-pointer"
        @click="showWarningsList = !showWarningsList"
      >
        <div class="flex items-center gap-1.5 min-w-0">
          <AlertTriangle
            :size="13"
            class="shrink-0"
          />
          <span class="truncate">{{ state.warnings.length }} preflight warning(s)</span>
        </div>
        <component
          :is="showWarningsList ? ChevronUp : ChevronDown"
          :size="13"
          class="shrink-0 opacity-70"
        />
      </button>

      <div
        v-if="showWarningsList"
        class="mt-2 max-h-24 overflow-y-auto space-y-1.5 pr-1 border-t border-amber-500/20 pt-1.5"
      >
        <div
          v-for="(warning, index) in state.warnings"
          :key="`${warning.Code}-${index}`"
          class="text-[11px] leading-snug"
        >
          <p class="font-medium text-amber-300">
            {{ warning.Message }}
          </p>
          <p class="truncate opacity-75 text-[10px] text-amber-400/80">
            {{ warningFiles(warning.Paths) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Thread list - flex scrollable container -->
    <div class="flex-1 min-h-0 flex flex-col mb-2.5">
      <div class="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 shrink-0 px-0.5">
        <span class="font-medium text-foreground/80">Active Workers</span>
        <span class="tabular-nums font-mono text-[10px]">({{ threadsList.length }})</span>
      </div>
      <ScrollArea class="h-full">
        <div class="space-y-1.5 pr-2 pb-1">
          <ThreadProgress
            v-for="thread in threadsList"
            :key="thread.WorkerID"
            :thread="thread"
          />
        </div>
      </ScrollArea>
    </div>

    <!-- Cancel button - pinned at bottom -->
    <Button
      variant="destructive"
      size="sm"
      class="w-full h-8 text-xs font-medium cursor-pointer shrink-0 rounded-lg shadow-xs"
      @click="() => uploadManager.cancelUpload()"
    >
      <X
        :size="13"
        class="mr-1.5"
      />
      Cancel Upload
    </Button>
  </div>
</template>
