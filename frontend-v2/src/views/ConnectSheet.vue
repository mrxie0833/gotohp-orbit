<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Browser } from '@wailsio/runtime'
import Sheet from '@/ui/Sheet.vue'
import Icon from '@/ui/Icon.vue'
import { connectWithRaw, connectWithToken } from '@/core/identities'
import { toast } from '@/ui/toast'

const open = defineModel<boolean>('open', { default: false })

const SIGN_IN_URL = 'https://accounts.google.com/EmbeddedSetup'
const token = ref('')
const raw = ref('')
const showRaw = ref(false)
const busy = ref(false)

watch(open, isOpen => {
  if (!isOpen) {
    token.value = ''
    raw.value = ''
    showRaw.value = false
  }
})

const canConnect = computed(() => token.value.trim().length > 0 && !busy.value)
const reason = (e: unknown) => (e instanceof Error ? e.message : String(e))

async function openSignIn() {
  try {
    await Browser.OpenURL(SIGN_IN_URL)
  } catch (e) {
    toast.error('Your browser would not open', reason(e))
  }
}

async function connect() {
  if (!canConnect.value) return
  busy.value = true
  try {
    const email = await connectWithToken(token.value)
    open.value = false
    toast.success('Identity added', email)
  } catch (e) {
    toast.error('That token was not accepted', reason(e))
  } finally {
    token.value = ''
    busy.value = false
  }
}

async function connectRaw() {
  if (!raw.value.trim() || busy.value) return
  busy.value = true
  try {
    await connectWithRaw(raw.value)
    open.value = false
    toast.success('Identity added')
  } catch (e) {
    toast.error('That credential was not accepted', reason(e))
  } finally {
    raw.value = ''
    busy.value = false
  }
}
</script>

<template>
  <Sheet
    v-model:open="open"
    label="Add an identity"
  >
    <h2 class="title">
      Add an identity
    </h2>
    <p
      class="hint"
      style="margin-top: 4px"
    >
      Orbit signs in the same way an Android phone does. It takes about a minute.
    </p>

    <div class="steps">
      <div class="step">
        <span class="step-n">1</span>
        <div>
          <p class="label">
            Sign in to Google
          </p>
          <p
            class="hint"
            style="margin: 3px 0 10px"
          >
            Accept the terms on the page that opens. It may spin forever afterwards, which is normal.
          </p>
          <button
            class="btn"
            type="button"
            @click="openSignIn"
          >
            <Icon name="link" /> Take me to Google
          </button>
        </div>
      </div>
      <div class="step">
        <span class="step-n">2</span>
        <div>
          <p class="label">
            Copy one cookie
          </p>
          <p
            class="hint"
            style="margin-top: 3px"
          >
            In your browser's developer tools, open Storage, then Cookies for <code>accounts.google.com</code>, and copy the value of <code>oauth_token</code>.
          </p>
        </div>
      </div>
      <div class="step">
        <span class="step-n">3</span>
        <div>
          <p
            class="label"
            style="margin-bottom: 8px"
          >
            Paste it here
          </p>
          <input
            v-model="token"
            class="field"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="Cookie value"
            :disabled="busy"
            @keydown.enter="connect"
          >
        </div>
      </div>
    </div>

    <button
      class="btn"
      type="button"
      data-tone="quiet"
      style="margin-top: 14px; padding-left: 0"
      @click="showRaw = !showRaw"
    >
      {{ showRaw ? 'Hide' : 'Have a ready-made credential string?' }}
    </button>
    <div
      v-if="showRaw"
      style="display: grid; gap: 8px; margin-top: 4px"
    >
      <input
        v-model="raw"
        class="field mono"
        type="password"
        autocomplete="off"
        spellcheck="false"
        placeholder="androidId=…&Email=…"
        :disabled="busy"
        @keydown.enter="connectRaw"
      >
      <button
        class="btn"
        type="button"
        :disabled="!raw.trim() || busy"
        @click="connectRaw"
      >
        Use this credential
      </button>
    </div>

    <div class="sheet-actions">
      <button
        class="btn"
        data-tone="quiet"
        type="button"
        @click="open = false"
      >
        Not now
      </button>
      <button
        class="btn"
        data-tone="primary"
        type="button"
        :disabled="!canConnect"
        @click="connect"
      >
        {{ busy ? 'Checking…' : 'Add identity' }}
      </button>
    </div>
  </Sheet>
</template>
