<script setup lang="ts">
import { computed, ref } from 'vue'
import { Clipboard } from '@wailsio/runtime'
import Icon from '@/ui/Icon.vue'
import { clearTally, transfer } from '@/core/transfer-store'
import { baseName, plural } from '@/core/format'
import { section } from '@/core/ui-state'
import { toast } from '@/ui/toast'

type Kind = 'sent' | 'held' | 'failed' | 'note'
interface Entry { kind: Kind; title: string; detail: string }

const filter = ref<'all' | Kind>('all')

const entries = computed<Entry[]>(() => {
  const t = transfer.tally
  return [
    ...t.failed.map(f => ({ kind: 'failed' as const, title: baseName(f.path), detail: f.message || f.path })),
    ...t.notes.map(n => ({ kind: 'note' as const, title: n.paths.map(baseName).join(', ') || 'Note', detail: n.reason })),
    ...t.held.map(h => ({ kind: 'held' as const, title: h.paths.map(baseName).join(', '), detail: h.reason })),
    ...t.sent.map(s => ({ kind: 'sent' as const, title: baseName(s.path), detail: s.path })),
  ]
})

const counts = computed(() => ({
  all: entries.value.length,
  sent: transfer.tally.sent.length,
  held: transfer.tally.held.length,
  failed: transfer.tally.failed.length,
  note: transfer.tally.notes.length,
}))
const shown = computed(() => (filter.value === 'all' ? entries.value : entries.value.filter(e => e.kind === filter.value)))
const CHIPS: { id: 'all' | Kind; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'sent', label: 'Sent' },
  { id: 'held', label: 'Held back' },
  { id: 'failed', label: 'Failed' },
  { id: 'note', label: 'Heads-up' },
]

async function copy() {
  const text = JSON.stringify(transfer.tally, null, 2)
  try {
    await Clipboard.SetText(text)
  } catch {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      toast.error('Could not copy the journal')
      return
    }
  }
  toast.success('Journal copied as JSON')
}

function clear() {
  clearTally()
  filter.value = 'all'
}
</script>

<template>
  <div class="page fade-in">
    <div class="page-head">
      <div>
        <h1 class="display">
          Journal
        </h1>
        <p class="hint">
          What happened to each file in the latest run.
        </p>
      </div>
      <div style="display: flex; gap: 8px">
        <button
          class="btn"
          type="button"
          :disabled="!entries.length"
          @click="copy"
        >
          <Icon name="copy" /> Copy as JSON
        </button>
        <button
          class="btn"
          data-tone="quiet"
          type="button"
          :disabled="!entries.length || transfer.active"
          @click="clear"
        >
          <Icon name="trash" /> Clear
        </button>
      </div>
    </div>

    <div
      v-if="!entries.length"
      class="empty"
    >
      <h2 class="title">
        {{ transfer.active ? 'Entries will appear as files finish' : 'Nothing logged yet' }}
      </h2>
      <p class="hint">
        Send something from the Stage and the outcome lands here.
      </p>
      <button
        v-if="!transfer.active"
        class="btn"
        type="button"
        @click="section = 'stage'"
      >
        Go to Stage
      </button>
    </div>

    <template v-else>
      <div
        class="chips"
        style="margin-bottom: 14px"
        role="group"
        aria-label="Filter entries"
      >
        <button
          v-for="c in CHIPS"
          :key="c.id"
          class="chip"
          type="button"
          :aria-pressed="filter === c.id"
          @click="filter = c.id"
        >
          {{ c.label }} <i>{{ counts[c.id] }}</i>
        </button>
      </div>

      <div class="group">
        <div
          v-for="(e, i) in shown"
          :key="i"
          class="entry"
          :data-kind="e.kind"
        >
          <span class="entry-mark" />
          <div class="entry-text">
            <p class="label truncate">
              {{ e.title }}
            </p>
            <p
              class="hint"
              style="overflow-wrap: anywhere; user-select: text"
            >
              {{ e.detail }}
            </p>
          </div>
        </div>
        <div
          v-if="!shown.length"
          class="empty"
        >
          <p class="hint">
            No {{ plural(0, 'entry', 'entries') }} in this view.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
