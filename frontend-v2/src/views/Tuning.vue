<script setup lang="ts">
import { computed, ref } from 'vue'
import Toggle from '@/ui/Toggle.vue'
import Stepper from '@/ui/Stepper.vue'
import Sheet from '@/ui/Sheet.vue'
import { tuning } from '@/core/tuning-store'
import { THEMES, applyTheme, savedTheme, type ThemeChoice } from '@/core/themes'

const choice = ref<ThemeChoice>(savedTheme())
function pick(c: ThemeChoice) {
  choice.value = c
  applyTheme(c)
}

// Erasing originals is the one irreversible option, so turning it on needs a deliberate second step.
const confirmErase = ref(false)
const erase = computed({
  get: () => tuning.eraseOriginals,
  set: (on: boolean) => {
    if (on) confirmErase.value = true
    else tuning.eraseOriginals = false
  },
})
function acceptErase() {
  tuning.eraseOriginals = true
  confirmErase.value = false
}

const proxyProblem = computed(() => {
  const v = tuning.proxy.trim()
  if (!v) return ''
  try {
    const u = new URL(v)
    return ['http:', 'https:', 'socks5:', 'socks5h:', 'socks4:'].includes(u.protocol) ? '' : 'Use http://, https:// or socks5://'
  } catch {
    return 'That does not look like a proxy address'
  }
})
</script>

<template>
  <div class="page fade-in">
    <div class="page-head">
      <div>
        <h1 class="display">
          Tuning
        </h1>
        <p class="hint">
          Changes save the moment you make them.
        </p>
      </div>
    </div>

    <h2 class="caps group-title">
      Appearance
    </h2>
    <div class="group">
      <div
        class="swatches"
        role="group"
        aria-label="Theme"
      >
        <button
          v-for="t in THEMES"
          :key="t.id"
          class="swatch"
          type="button"
          :aria-pressed="choice === t.id"
          @click="pick(t.id)"
        >
          <span
            class="swatch-chip"
            :style="{ background: t.swatch[0], '--dot': t.swatch[1] }"
          />
          <span class="label">{{ t.label }}</span>
        </button>
        <button
          class="swatch"
          type="button"
          :aria-pressed="choice === 'auto'"
          @click="pick('auto')"
        >
          <span
            class="swatch-chip"
            style="background: linear-gradient(110deg, #16181d 50%, #f6f4ef 50%); --dot: #7c9cff"
          />
          <span class="label">Match system</span>
        </button>
      </div>
    </div>

    <h2 class="caps group-title">
      Throughput
    </h2>
    <div class="group">
      <div class="row">
        <div class="row-text">
          <p class="label">
            Parallel transfers
          </p><p class="hint">
            More lanes finish big batches sooner but use more bandwidth.
          </p>
        </div>
        <Stepper
          v-model="tuning.threads"
          label="Parallel transfers"
          :max="32"
        />
      </div>
      <div class="row">
        <div class="row-text">
          <p class="label">
            Dive into subfolders
          </p><p class="hint">
            When you drop a folder, include everything nested inside it.
          </p>
        </div>
        <Toggle
          v-model="tuning.recursive"
          label="Dive into subfolders"
        />
      </div>
      <div class="row">
        <div class="row-text">
          <p class="label">
            Compress to Storage saver
          </p><p class="hint">
            Smaller files, slightly lower quality.
          </p>
        </div>
        <Toggle
          v-model="tuning.saver"
          label="Compress to Storage saver"
        />
      </div>
      <div class="row">
        <div class="row-text">
          <p class="label">
            Count against my storage
          </p><p class="hint">
            Off takes the unlimited-upload route. On makes every file count toward your Google storage.
          </p>
        </div>
        <Toggle
          v-model="tuning.useQuota"
          label="Count against my storage"
        />
      </div>
      <div class="row">
        <div class="row-text">
          <p class="label">
            Send duplicates anyway
          </p><p class="hint">
            Skips the already-uploaded check for single files. Paired motion photos are always checked.
          </p>
        </div>
        <Toggle
          v-model="tuning.forceUpload"
          label="Send duplicates anyway"
        />
      </div>
    </div>

    <h2 class="caps group-title">
      Motion photos
    </h2>
    <div class="group">
      <div class="row">
        <div class="row-text">
          <p class="label">
            Merge Live Photo pairs
          </p><p class="hint">
            Match each still with its short video using the hidden metadata and send them as one.
          </p>
        </div>
        <Toggle
          v-model="tuning.pairLive"
          label="Merge Live Photo pairs"
        />
      </div>
      <div
        class="row"
        data-nested="true"
        :data-disabled="!tuning.pairLive"
      >
        <div class="row-text">
          <p class="label">
            Hold back lone halves
          </p><p class="hint">
            A still or video without its partner waits instead of going up alone.
          </p>
        </div>
        <Toggle
          v-model="tuning.holdLoneHalves"
          label="Hold back lone halves"
        />
      </div>
      <div
        class="row"
        data-nested="true"
        :data-disabled="!tuning.pairLive"
      >
        <div class="row-text">
          <p class="label">
            Promote earlier stills
          </p><p class="hint">
            If the still is already online, resend it with its video so it comes alive.
          </p>
        </div>
        <Toggle
          v-model="tuning.promoteStills"
          label="Promote earlier stills"
        />
      </div>
    </div>

    <h2 class="caps group-title">
      Housekeeping
    </h2>
    <div class="group">
      <div class="row">
        <div class="row-text">
          <p class="label">
            Send every file type
          </p><p class="hint">
            Turns off the check that filters out formats Google Photos usually refuses.
          </p>
        </div>
        <Toggle
          v-model="tuning.anyFileType"
          label="Send every file type"
        />
      </div>
      <div class="row">
        <div class="row-text">
          <p class="label">
            Read the date from the filename
          </p><p class="hint">
            Useful for files that lost their metadata, such as IMG_20240131_….
          </p>
        </div>
        <Toggle
          v-model="tuning.dateFromName"
          label="Read the date from the filename"
        />
      </div>
      <div
        class="row"
        style="align-items: flex-start; flex-direction: column; gap: 8px"
      >
        <div>
          <p class="label">
            Ignore files matching
          </p><p class="hint">
            Applies when scanning folders. Leave empty to include everything.
          </p>
        </div>
        <input
          v-model="tuning.ignore"
          class="field mono"
          spellcheck="false"
          placeholder="e.g. *.tmp"
          aria-label="Ignore files matching"
        >
      </div>
      <div class="row">
        <div class="row-text">
          <p
            class="label"
            style="color: var(--bad)"
          >
            Erase originals afterwards
          </p><p class="hint">
            Deletes each source file from this computer once it is safely online.
          </p>
        </div>
        <Toggle
          v-model="erase"
          tone="danger"
          label="Erase originals afterwards"
        />
      </div>
    </div>

    <h2 class="caps group-title">
      Network
    </h2>
    <div class="group">
      <div
        class="row"
        style="align-items: flex-start; flex-direction: column; gap: 8px"
      >
        <div>
          <p class="label">
            Route through a proxy
          </p><p class="hint">
            Optional. Leave empty to connect directly.
          </p>
        </div>
        <input
          v-model="tuning.proxy"
          class="field mono"
          spellcheck="false"
          placeholder="socks5://127.0.0.1:1080"
          aria-label="Proxy address"
          :aria-invalid="!!proxyProblem"
        >
        <p
          v-if="proxyProblem"
          class="field-error"
        >
          {{ proxyProblem }}
        </p>
      </div>
    </div>
  </div>

  <Sheet
    v-model:open="confirmErase"
    label="Confirm erasing originals"
  >
    <h2 class="title">
      Erase originals after sending?
    </h2>
    <p
      class="hint"
      style="margin-top: 6px"
    >
      Each file is deleted from this computer once Orbit has confirmed it is online. This cannot be undone, so make sure you trust the connection and the account.
    </p>
    <div class="sheet-actions">
      <button
        class="btn"
        type="button"
        @click="confirmErase = false"
      >
        Keep originals
      </button>
      <button
        class="btn"
        data-tone="danger"
        data-armed="true"
        type="button"
        @click="acceptErase"
      >
        Erase after sending
      </button>
    </div>
  </Sheet>
</template>
