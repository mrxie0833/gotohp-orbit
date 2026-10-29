<script setup lang="ts">
import { ref } from 'vue'
import Icon from '@/ui/Icon.vue'
import { activate, identities, linkKeyFromPhone, removeWithUndo } from '@/core/identities'
import { connectOpen } from '@/core/ui-state'

const linking = ref('')

async function link(email: string) {
  linking.value = email
  await linkKeyFromPhone(email)
  linking.value = ''
}
</script>

<template>
  <div class="page fade-in">
    <div class="page-head">
      <div>
        <h1 class="display">
          Identities
        </h1>
        <p class="hint">
          Photos go to whichever identity is active.
        </p>
      </div>
      <button
        class="btn"
        data-tone="primary"
        type="button"
        @click="connectOpen = true"
      >
        <Icon name="plus" /> Add identity
      </button>
    </div>

    <div
      v-if="identities.list.length === 0"
      class="empty"
    >
      <h2 class="title">
        No identities yet
      </h2>
      <p class="hint">
        Add one to start sending photos.
      </p>
    </div>

    <div
      v-else
      class="group"
    >
      <div
        v-for="i in identities.list"
        :key="i.email"
        class="row"
      >
        <span class="avatar lg">{{ i.email.slice(0, 1).toUpperCase() }}</span>
        <div class="row-text">
          <p class="label truncate">
            {{ i.email }}
          </p>
          <p
            class="hint"
            :style="{ color: i.needsKey ? 'var(--warn)' : undefined }"
          >
            {{ i.email === identities.active ? 'Active' : 'Standing by' }}<template v-if="i.needsKey">
              · needs a device key
            </template>
          </p>
        </div>
        <button
          v-if="i.needsKey"
          class="btn"
          type="button"
          :disabled="linking === i.email"
          @click="link(i.email)"
        >
          <Icon name="phone" /> {{ linking === i.email ? 'Reading…' : 'Link key' }}
        </button>
        <button
          v-if="i.email !== identities.active"
          class="btn"
          type="button"
          @click="activate(i.email)"
        >
          Make active
        </button>
        <button
          class="btn"
          data-tone="quiet"
          type="button"
          :aria-label="`Remove ${i.email}`"
          @click="removeWithUndo(i.email)"
        >
          <Icon name="trash" />
        </button>
      </div>
    </div>
  </div>
</template>
