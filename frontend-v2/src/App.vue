<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import Icon from '@/ui/Icon.vue'
import Toast from '@/ui/Toast.vue'
import Sheet from '@/ui/Sheet.vue'
import Stage from '@/views/Stage.vue'
import Journal from '@/views/Journal.vue'
import Tuning from '@/views/Tuning.vue'
import Identities from '@/views/Identities.vue'
import ConnectSheet from '@/views/ConnectSheet.vue'
import { cancelName, confirmName, namePrompt, useFileDrop } from '@/core/drop'
import { identities, loadIdentities } from '@/core/identities'
import { loadTuning } from '@/core/tuning-store'
import { onAlbumError, onTransferFinish, transfer, wireTransferEvents } from '@/core/transfer-store'
import { applyTheme, savedTheme, watchSystemTheme } from '@/core/themes'
import { connectOpen, section, type Section } from '@/core/ui-state'
import { plural } from '@/core/format'
import { toast } from '@/ui/toast'

applyTheme(savedTheme())
wireTransferEvents()
useFileDrop()

const NAV: { id: Section; label: string; icon: 'stage' | 'journal' | 'tuning' | 'people' }[] = [
  { id: 'stage', label: 'Stage', icon: 'stage' },
  { id: 'journal', label: 'Journal', icon: 'journal' },
  { id: 'tuning', label: 'Tuning', icon: 'tuning' },
  { id: 'identities', label: 'Identities', icon: 'people' },
]

const active = computed(() => identities.list.find(i => i.email === identities.active))
const failedCount = computed(() => transfer.tally.failed.length)

const stops: Array<() => void> = []

onMounted(() => {
  void loadIdentities()
  void loadTuning()
  stops.push(watchSystemTheme(savedTheme))

  stops.push(
    onTransferFinish(() => {
      const { sent, held, failed } = transfer.tally
      if (failed.length) toast.error(`${plural(failed.length, 'file')} failed`, `${sent.length} sent, ${held.length} held back. The Journal has details.`)
      else if (sent.length) toast.success(`${plural(sent.length, 'file')} sent`, held.length ? `${held.length} held back.` : undefined)
      else if (held.length) toast.info(`${plural(held.length, 'file')} held back`)
    }),
  )
  stops.push(
    onAlbumError((name, message) => {
      toast.error(message.includes('404') ? 'That album does not exist' : 'Album trouble', message.includes('404') ? `No album matches “${name}”.` : `“${name}”: ${message}`)
    }),
  )

  // Keyboard navigation is instant: it is used constantly, so it never animates.
  const onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
    const i = Number(e.key) - 1
    if (i >= 0 && i < NAV.length) {
      e.preventDefault()
      section.value = NAV[i].id
    }
  }
  window.addEventListener('keydown', onKey)
  stops.push(() => window.removeEventListener('keydown', onKey))
})

onBeforeUnmount(() => stops.forEach(s => s()))
</script>

<template>
  <div class="shell">
    <nav
      class="sidebar"
      aria-label="Sections"
    >
      <div class="brand">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="4.4"
            transform="rotate(-24 12 12)"
          />
          <circle
            cx="12"
            cy="12"
            r="3.2"
            fill="currentColor"
            stroke="none"
          />
        </svg>
        <b>Orbit</b>
      </div>

      <button
        v-for="(n, i) in NAV"
        :key="n.id"
        class="nav-item"
        type="button"
        :aria-current="section === n.id ? 'page' : undefined"
        @click="section = n.id"
      >
        <Icon :name="n.icon" />
        {{ n.label }}
        <span
          v-if="n.id === 'stage' && transfer.active"
          class="nav-badge"
        >Live</span>
        <span
          v-else-if="n.id === 'journal' && failedCount"
          class="nav-badge"
          data-kind="bad"
        >{{ failedCount }}</span>
        <kbd v-else>{{ i + 1 }}</kbd>
      </button>

      <div class="spacer" />

      <button
        class="who"
        type="button"
        @click="active ? (section = 'identities') : (connectOpen = true)"
      >
        <span class="avatar">{{ active ? active.email.slice(0, 1).toUpperCase() : '+' }}</span>
        <span class="who-text">
          <span
            class="label truncate"
            style="display: block"
          >{{ active ? active.email : 'No identity' }}</span>
          <span class="micro">{{ active ? 'Active' : 'Tap to add one' }}</span>
        </span>
      </button>
    </nav>

    <main class="main">
      <Stage v-if="section === 'stage'" />
      <Journal v-else-if="section === 'journal'" />
      <Tuning v-else-if="section === 'tuning'" />
      <Identities v-else />
    </main>
  </div>

  <ConnectSheet v-model:open="connectOpen" />

  <Sheet
    v-model:open="namePrompt.open"
    label="Name the album"
  >
    <h2 class="title">
      Which album?
    </h2>
    <p
      class="hint"
      style="margin: 4px 0 14px"
    >
      {{ plural(namePrompt.files.length, 'item') }} waiting. Type a new name, or paste the key of an album you already have.
    </p>
    <input
      v-model="namePrompt.name"
      class="field"
      placeholder="Summer in Lisbon, or AF1Qip…"
      aria-label="Destination album"
      @keydown.enter="confirmName"
    >
    <div class="sheet-actions">
      <button
        class="btn"
        data-tone="quiet"
        type="button"
        @click="cancelName"
      >
        Never mind
      </button>
      <button
        class="btn"
        data-tone="primary"
        type="button"
        :disabled="!namePrompt.name.trim()"
        @click="confirmName"
      >
        Send
      </button>
    </div>
  </Sheet>

  <Toast />
</template>
