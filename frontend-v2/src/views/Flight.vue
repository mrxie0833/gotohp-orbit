<script setup lang="ts">
import { computed } from 'vue'
import Gauge from '@/ui/Gauge.vue'
import Icon from '@/ui/Icon.vue'
import { albumProgress, cancelTransfer, transfer } from '@/core/transfer-store'
import { bytes, duration, plural, rate } from '@/core/format'

const progress = computed(() => {
  const t = transfer
  const files = t.totalFiles > 0 ? Math.min(1, t.doneFiles / t.totalFiles) : 0
  if (t.totalBytes <= 0) return files
  const data = Math.min(1, t.doneBytes / t.totalBytes)
  return 0.65 * data + 0.35 * files
})

const LABELS: Record<string, string> = {
  idle: 'Waiting',
  hashing: 'Fingerprinting',
  checking: 'Looking for twins',
  uploading: 'Sending',
  finalizing: 'Wrapping up',
  completed: 'Done',
  skipped: 'Held back',
  error: 'Failed',
}

const label = (s: string) => LABELS[s] ?? s
const share = (w: { BytesUploaded: number; BytesTotal: number; Status: string }) =>
  w.Status === 'finalizing' || w.Status === 'completed' ? 1 : w.BytesTotal > 0 ? Math.min(1, w.BytesUploaded / w.BytesTotal) : 0
</script>

<template>
  <div class="flight">
    <Gauge :progress="progress">
      <strong>{{ Math.round(progress * 100) }}%</strong>
      <span class="hint">{{ transfer.doneFiles.toLocaleString() }} of {{ transfer.totalFiles.toLocaleString() }}</span>
    </Gauge>

    <div>
      <div class="facts">
        <div class="fact">
          <span class="micro">Pace</span><b>{{ transfer.bytesPerSecond > 0 ? rate(transfer.bytesPerSecond) : '–' }}</b>
        </div>
        <div class="fact">
          <span class="micro">Time left</span><b>{{ duration(transfer.etaSeconds) }}</b>
        </div>
        <div class="fact">
          <span class="micro">Sent</span>
          <b>{{ bytes(transfer.doneBytes) }}</b>
        </div>
      </div>

      <p
        v-if="albumProgress.current"
        class="hint"
        style="margin-bottom: 12px"
      >
        Album “{{ albumProgress.current.AlbumName }}”:
        {{ plural(albumProgress.current.ItemsAdded, 'item') }} added of {{ albumProgress.current.TotalItems }}
        <template v-if="albumProgress.busy">
          …
        </template>
      </p>

      <div
        class="group"
        aria-live="off"
      >
        <div
          v-if="transfer.workers.length === 0"
          class="worker"
        >
          <span class="hint">Getting ready…</span>
        </div>
        <div
          v-for="w in transfer.workers"
          :key="w.WorkerID"
          class="worker"
          :data-state="w.Status"
        >
          <span class="truncate label">{{ w.FileName || 'Waiting for work' }}</span>
          <span class="micro">{{ label(w.Status) }}<template v-if="w.Attempt > 1"> · try {{ w.Attempt }}</template></span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ '--p': share(w) }"
            />
          </div>
        </div>
      </div>

      <div style="margin-top: 16px">
        <button
          class="btn"
          data-tone="danger"
          type="button"
          @click="cancelTransfer"
        >
          <Icon name="stop" /> Stop sending
        </button>
      </div>
    </div>
  </div>
</template>
