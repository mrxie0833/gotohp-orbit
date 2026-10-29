<script setup lang="ts">
import { computed, ref } from 'vue'
import { uploadManager } from '@/utils/UploadManager'
import Button from '@/components/ui/button/Button.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'vue-sonner'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  FileQuestion,
  Files
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'clear'): void
}>()

const { state } = uploadManager

type FilterTab = 'all' | 'fail' | 'skipped' | 'success'
const currentFilter = ref<FilterTab>('all')
const isCopied = ref(false)

const successCount = computed(() => state.results.success.length)
const failCount = computed(() => state.results.fail.length)
const skippedCount = computed(() => state.results.skipped.length)
const totalCount = computed(() => successCount.value + failCount.value + skippedCount.value)

interface DisplayItem {
  id: string
  type: 'success' | 'fail' | 'skipped'
  name: string
  detail: string
  path: string
}

function parseFailedItem(raw: string, index: number): DisplayItem {
  const colonIndex = raw.indexOf(': ')
  if (colonIndex > 0) {
    const fullPath = raw.slice(0, colonIndex)
    const err = raw.slice(colonIndex + 2)
    const name = fullPath.split(/[\\/]/).pop() || fullPath
    return {
      id: `fail-${index}`,
      type: 'fail',
      name,
      detail: err.replace(/^Error:\s*/, ''),
      path: fullPath,
    }
  }
  const name = raw.split(/[\\/]/).pop() || raw
  return {
    id: `fail-${index}`,
    type: 'fail',
    name,
    detail: 'Failed to upload',
    path: raw,
  }
}

const displayItems = computed<DisplayItem[]>(() => {
  const list: DisplayItem[] = []

  // Add failed items
  if (currentFilter.value === 'all' || currentFilter.value === 'fail') {
    state.results.fail.forEach((item, idx) => {
      list.push(parseFailedItem(item, idx))
    })
  }

  // Add skipped items
  if (currentFilter.value === 'all' || currentFilter.value === 'skipped') {
    state.results.skipped.forEach((item, idx) => {
      const paths = item.paths && item.paths.length > 0 ? item.paths : ['Unknown file']
      const name = paths.map(p => p.split(/[\\/]/).pop()).join(', ')
      list.push({
        id: `skip-${idx}`,
        type: 'skipped',
        name,
        detail: item.reason || item.code || 'Skipped',
        path: paths.join('\n'),
      })
    })
  }

  // Add success items
  if (currentFilter.value === 'all' || currentFilter.value === 'success') {
    state.results.success.forEach((item, idx) => {
      const name = item.path.split(/[\\/]/).pop() || item.path
      list.push({
        id: `ok-${idx}`,
        type: 'success',
        name,
        detail: item.mediaKey ? `ID: ${item.mediaKey.slice(0, 16)}...` : 'Uploaded',
        path: item.path,
      })
    })
  }

  return list
})

async function handleCopy() {
  const ok = await uploadManager.copyResultsAsJson()
  if (ok) {
    isCopied.value = true
    toast.success('Results JSON copied to clipboard')
    setTimeout(() => {
      isCopied.value = false
    }, 1500)
  }
}

async function copyPath(path: string) {
  try {
    await navigator.clipboard.writeText(path)
    toast.success('File path copied')
  } catch {
    toast.error('Could not copy path')
  }
}

function handleClear() {
  uploadManager.clearResults()
  emit('clear')
}
</script>

<template>
  <div class="flex flex-col h-full w-full px-4 py-3 select-none">
    <!-- Top Header -->
    <div class="flex items-center justify-between mb-2.5 shrink-0">
      <div>
        <h1 class="text-sm font-semibold tracking-tight text-foreground leading-tight">
          Upload Results
        </h1>
        <p class="text-[11px] text-muted-foreground">
          {{ totalCount }} items recorded
        </p>
      </div>

      <div class="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs px-2.5 gap-1.5 cursor-pointer font-medium hover:bg-accent/60"
          :disabled="totalCount === 0"
          @click="handleCopy"
        >
          <component
            :is="isCopied ? Check : Copy"
            :size="13"
            :class="isCopied ? 'text-primary' : 'text-muted-foreground'"
          />
          <span>{{ isCopied ? 'Copied' : 'Copy JSON' }}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 text-xs px-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer"
          :disabled="totalCount === 0"
          title="Clear Results"
          @click="handleClear"
        >
          <RotateCcw :size="13" />
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="totalCount === 0"
      class="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/80 rounded-2xl bg-card/20 my-auto"
    >
      <div class="size-11 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mb-2.5 text-muted-foreground">
        <Files :size="20" />
      </div>
      <p class="text-xs font-semibold tracking-tight text-foreground mb-1">
        No Upload Results
      </p>
      <p class="text-[11px] text-muted-foreground max-w-[220px] leading-relaxed">
        Results from completed or cancelled uploads will appear here.
      </p>
    </div>

    <template v-else>
      <!-- Unified Segmented Filter Controls -->
      <div class="grid grid-cols-4 gap-1.5 mb-2.5 shrink-0">
        <button
          type="button"
          class="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all cursor-pointer text-center"
          :class="[
            currentFilter === 'all'
              ? 'bg-primary/10 border-primary/40 text-primary shadow-2xs'
              : 'bg-card/40 border-border/60 text-muted-foreground hover:bg-card/80 hover:text-foreground'
          ]"
          @click="currentFilter = 'all'"
        >
          <span class="text-[10px] font-medium leading-none mb-0.5">All</span>
          <span class="text-xs font-bold tabular-nums">{{ totalCount }}</span>
        </button>

        <button
          type="button"
          class="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all cursor-pointer text-center"
          :class="[
            currentFilter === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500 shadow-2xs'
              : 'bg-card/40 border-border/60 text-muted-foreground hover:bg-card/80 hover:text-foreground'
          ]"
          @click="currentFilter = 'success'"
        >
          <div class="flex items-center gap-0.5 leading-none mb-0.5">
            <CheckCircle2
              :size="10"
              class="text-emerald-500"
            />
            <span class="text-[10px] font-medium">Done</span>
          </div>
          <span class="text-xs font-bold tabular-nums">{{ successCount }}</span>
        </button>

        <button
          type="button"
          class="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all cursor-pointer text-center"
          :class="[
            currentFilter === 'fail'
              ? 'bg-destructive/15 border-destructive/40 text-destructive shadow-2xs'
              : 'bg-card/40 border-border/60 text-muted-foreground hover:bg-card/80 hover:text-foreground'
          ]"
          @click="currentFilter = 'fail'"
        >
          <div class="flex items-center gap-0.5 leading-none mb-0.5">
            <XCircle
              :size="10"
              class="text-destructive"
            />
            <span class="text-[10px] font-medium">Fail</span>
          </div>
          <span class="text-xs font-bold tabular-nums">{{ failCount }}</span>
        </button>

        <button
          type="button"
          class="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all cursor-pointer text-center"
          :class="[
            currentFilter === 'skipped'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 shadow-2xs'
              : 'bg-card/40 border-border/60 text-muted-foreground hover:bg-card/80 hover:text-foreground'
          ]"
          @click="currentFilter = 'skipped'"
        >
          <div class="flex items-center gap-0.5 leading-none mb-0.5">
            <AlertTriangle
              :size="10"
              class="text-amber-500"
            />
            <span class="text-[10px] font-medium">Skip</span>
          </div>
          <span class="text-xs font-bold tabular-nums">{{ skippedCount }}</span>
        </button>
      </div>

      <!-- Item List -->
      <div class="flex-1 min-h-0">
        <ScrollArea class="h-full">
          <div
            v-if="displayItems.length === 0"
            class="py-10 text-center text-xs text-muted-foreground flex flex-col items-center justify-center"
          >
            <FileQuestion
              :size="22"
              class="mb-1.5 opacity-40"
            />
            <span>No items in this category</span>
          </div>

          <div
            v-else
            class="space-y-1.5 pr-2 pb-2"
          >
            <div
              v-for="item in displayItems"
              :key="item.id"
              class="group p-2 rounded-xl border border-border/60 bg-card/60 flex items-start gap-2.5 text-xs transition-colors hover:bg-card hover:border-border"
            >
              <div class="mt-0.5 shrink-0">
                <CheckCircle2
                  v-if="item.type === 'success'"
                  :size="14"
                  class="text-emerald-500"
                />
                <XCircle
                  v-else-if="item.type === 'fail'"
                  :size="14"
                  class="text-destructive"
                />
                <AlertTriangle
                  v-else
                  :size="14"
                  class="text-amber-500"
                />
              </div>

              <div class="min-w-0 flex-1">
                <p
                  class="font-medium truncate leading-tight text-foreground/90"
                  :title="item.path"
                >
                  {{ item.name }}
                </p>
                <p
                  class="text-[11px] truncate mt-0.5"
                  :class="[
                    item.type === 'fail'
                      ? 'text-destructive font-medium'
                      : item.type === 'skipped'
                        ? 'text-amber-400 font-medium'
                        : 'text-muted-foreground'
                  ]"
                  :title="item.detail"
                >
                  {{ item.detail }}
                </p>
              </div>

              <button
                type="button"
                class="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer shrink-0"
                title="Copy Path"
                @click="copyPath(item.path)"
              >
                <Copy :size="12" />
              </button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </template>
  </div>
</template>
