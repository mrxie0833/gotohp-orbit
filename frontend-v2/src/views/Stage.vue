<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/ui/Icon.vue'
import Flight from './Flight.vue'
import { dragging } from '@/core/drop'
import { identities, linkKeyFromPhone } from '@/core/identities'
import { transfer } from '@/core/transfer-store'
import { connectOpen, section } from '@/core/ui-state'
import { plural } from '@/core/format'
import { ref } from 'vue'

const activeIdentity = computed(() => identities.list.find(i => i.email === identities.active))
const needsKey = computed(() => !!activeIdentity.value?.needsKey)
const linking = ref(false)

const showLanes = computed(() => dragging.value && identities.list.length > 0 && !transfer.active)
const hasRun = computed(() => transfer.finished)
const tally = computed(() => transfer.tally)

async function link() {
  if (!activeIdentity.value) return
  linking.value = true
  await linkKeyFromPhone(activeIdentity.value.email)
  linking.value = false
}
</script>

<template>
  <div
    class="page fade-in"
    data-file-drop-target
    style="position: relative"
  >
    <div
      v-if="needsKey && !transfer.active"
      class="banner"
    >
      <Icon name="phone" />
      <span>This identity needs a device key before it can send.</span>
      <button
        class="btn"
        type="button"
        :disabled="linking"
        @click="link"
      >
        {{ linking ? 'Reading…' : 'Take it from my phone' }}
      </button>
    </div>

    <div v-if="!identities.loaded" />

    <div
      v-else-if="identities.list.length === 0"
      class="stage"
    >
      <div class="landing">
        <div
          class="orbit-art"
          aria-hidden="true"
        >
          <svg viewBox="0 0 168 168">
            <circle
              class="ring-path"
              cx="84"
              cy="84"
              r="78"
            />
            <circle
              class="ring-path"
              cx="84"
              cy="84"
              r="52"
            />
            <g class="spin"><circle
              class="moon hot"
              cx="162"
              cy="84"
              r="6"
            /></g>
            <g class="spin slow"><circle
              class="moon"
              cx="84"
              cy="32"
              r="4.5"
            /></g>
            <circle
              class="core"
              cx="84"
              cy="84"
              r="14"
            />
          </svg>
        </div>
        <h1 class="display">
          Your photos are one sign-in away
        </h1>
        <p class="hint">
          Add a Google identity and Orbit will start sending anything you drop on it.
        </p>
        <button
          class="btn"
          data-tone="primary"
          data-size="lg"
          type="button"
          @click="connectOpen = true"
        >
          <Icon name="plus" /> Add an identity
        </button>
      </div>
    </div>

    <Flight v-else-if="transfer.active" />

    <div
      v-else
      class="stage"
    >
      <div class="landing">
        <div
          class="orbit-art"
          aria-hidden="true"
        >
          <svg viewBox="0 0 168 168">
            <circle
              class="ring-path"
              cx="84"
              cy="84"
              r="78"
            />
            <circle
              class="ring-path"
              cx="84"
              cy="84"
              r="52"
            />
            <g class="spin"><circle
              class="moon hot"
              cx="162"
              cy="84"
              r="6"
            /></g>
            <g class="spin slow"><circle
              class="moon"
              cx="84"
              cy="32"
              r="4.5"
            /></g>
            <circle
              class="core"
              cx="84"
              cy="84"
              r="14"
            />
          </svg>
        </div>
        <template v-if="hasRun">
          <h1 class="display">
            {{ tally.failed.length ? 'Mostly there' : 'All in orbit' }}
          </h1>
          <p class="hint">
            {{ plural(tally.sent.length, 'file') }} sent<template v-if="tally.held.length">
              , {{ tally.held.length }} held back
            </template><template v-if="tally.failed.length">
              , {{ tally.failed.length }} failed
            </template>.
          </p>
          <button
            class="btn"
            type="button"
            @click="section = 'journal'"
          >
            <Icon name="journal" /> Read the journal
          </button>
        </template>
        <template v-else>
          <h1 class="display">
            Drop anything to send it
          </h1>
          <p class="hint">
            Photos, videos or whole folders. Drag them over this window and choose where they land.
          </p>
        </template>
      </div>
    </div>

    <Transition name="lane">
      <div
        v-if="showLanes"
        class="lanes"
        data-file-drop-target
      >
        <div
          class="lane"
          data-file-drop-target
          data-drop-zone="library"
        >
          <Icon name="photo" />
          <h2 class="title">
            Straight to the library
          </h2>
          <p class="hint">
            No album. Items just join your timeline.
          </p>
        </div>
        <div
          class="lane"
          data-file-drop-target
          data-drop-zone="named"
        >
          <Icon name="album" />
          <h2 class="title">
            Into a named album
          </h2>
          <p class="hint">
            Type a name, or paste the key of an existing album.
          </p>
        </div>
        <div
          class="lane"
          data-file-drop-target
          data-drop-zone="by-folder"
        >
          <Icon name="folders" />
          <h2 class="title">
            One album per folder
          </h2>
          <p class="hint">
            Each folder becomes an album with the same name.
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
