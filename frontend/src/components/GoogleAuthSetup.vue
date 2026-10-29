<script setup lang="ts">
import { ref, watch } from 'vue'
import { Browser } from '@wailsio/runtime'
import { toast } from 'vue-sonner'
import { ChevronDown, ExternalLink, ShieldCheck } from '@lucide/vue'
import { ConfigManager } from '../../bindings/app/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const embeddedSetupURL = 'https://accounts.google.com/EmbeddedSetup'

const emit = defineEmits<{
  (event: 'account-added'): void
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const oauthToken = ref('')
const rawCredential = ref('')
const isConnecting = ref(false)
const isAddingRawCredential = ref(false)
const showAdvanced = ref(false)

watch(isOpen, (open) => {
  if (!open) {
    oauthToken.value = ''
    rawCredential.value = ''
    showAdvanced.value = false
  }
})

async function openEmbeddedSetup() {
  try {
    await Browser.OpenURL(embeddedSetupURL)
  } catch (error) {
    toast.error('Could not open the system browser', {
      description: error instanceof Error ? error.message : String(error),
    })
  }
}

async function connectAccount() {
  const normalizedToken = oauthToken.value.trim()
  if (!normalizedToken) return

  isConnecting.value = true
  try {
    const connectedEmail = await ConfigManager.AddGoogleAccount(normalizedToken)
    oauthToken.value = ''
    isOpen.value = false
    emit('account-added')
    toast.success('Google account connected.', {
      description: connectedEmail,
    })
  } catch (error) {
    toast.error('Could not connect Google account', {
      description: error instanceof Error ? error.message : String(error),
    })
  } finally {
    oauthToken.value = ''
    isConnecting.value = false
  }
}

async function addRawCredential() {
  const credential = rawCredential.value.trim()
  if (!credential) return

  isAddingRawCredential.value = true
  try {
    await ConfigManager.AddCredentials(credential)
    rawCredential.value = ''
    isOpen.value = false
    emit('account-added')
    toast.success('Credentials added.')
  } catch (error) {
    toast.error('Could not add credentials', {
      description: error instanceof Error ? error.message : String(error),
    })
  } finally {
    isAddingRawCredential.value = false
  }
}
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetContent
      side="bottom"
      class="max-h-[92vh] overflow-y-auto bg-card/95 backdrop-blur-md border-t border-border/80 shadow-2xl rounded-t-2xl"
      style="--wails-draggable: none"
    >
      <div class="mx-auto flex w-full max-w-sm flex-col px-4 pt-1 pb-6">
        <SheetHeader class="gap-0.5 px-0 pb-3.5 text-center">
          <div class="mx-auto size-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-1.5">
            <ShieldCheck :size="20" />
          </div>
          <SheetTitle class="text-sm font-semibold tracking-tight text-foreground">
            Connect Google Photos
          </SheetTitle>
          <p class="text-[11px] text-muted-foreground">
            Sign in to upload photos directly to your account
          </p>
        </SheetHeader>

        <div class="flex flex-col gap-3.5">
          <!-- Step 1: open sign-in -->
          <div class="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/50 p-3">
            <p class="flex items-center gap-2 text-xs font-semibold text-foreground select-none">
              <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold">1</span>
              Open Google sign-in
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-xs cursor-pointer select-none font-medium hover:bg-accent/60"
              :disabled="isConnecting"
              @click="openEmbeddedSetup"
            >
              <ExternalLink class="size-3.5 mr-1 text-primary" />
              Open sign-in page
            </Button>
            <ol class="list-decimal space-y-1 rounded-lg border border-border/50 bg-muted/20 py-2 pr-2.5 pl-6 text-[11px] leading-snug text-muted-foreground">
              <li>
                Sign in, then click <strong class="text-foreground">I agree</strong>. (Page may load indefinitely; this is normal).
              </li>
              <li>Open DevTools → Application/Storage → Cookies → <code class="text-foreground">accounts.google.com</code>.</li>
              <li>Copy the <code class="text-primary font-mono font-medium">oauth_token</code> cookie value.</li>
            </ol>
          </div>

          <!-- Step 2: paste token -->
          <div class="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/50 p-3">
            <Label
              for="google-oauth-token"
              class="flex items-center gap-2 text-xs font-semibold text-foreground"
            >
              <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold">2</span>
              Paste oauth_token
            </Label>
            <Input
              id="google-oauth-token"
              v-model="oauthToken"
              type="password"
              autocomplete="off"
              spellcheck="false"
              placeholder="Paste oauth_token cookie value"
              class="h-8 text-xs bg-background/80"
              :disabled="isConnecting"
              @keydown.enter="connectAccount"
            />
            <Button
              type="button"
              size="sm"
              class="h-8 text-xs cursor-pointer select-none font-medium"
              :disabled="!oauthToken.trim() || isConnecting"
              @click="connectAccount"
            >
              {{ isConnecting ? 'Connecting...' : 'Connect account' }}
            </Button>
          </div>
        </div>

        <div class="mt-3.5 border-t border-border/60 pt-2.5">
          <button
            type="button"
            class="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] text-muted-foreground select-none hover:text-foreground transition-colors cursor-pointer"
            @click="showAdvanced = !showAdvanced"
          >
            <ChevronDown
              class="size-3.5 transition-transform"
              :class="showAdvanced && 'rotate-180'"
            />
            <span>Advanced: paste raw credential string</span>
          </button>
          <div
            v-if="showAdvanced"
            class="mt-2.5 flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-2.5"
          >
            <Input
              id="google-raw-credential"
              v-model="rawCredential"
              type="password"
              autocomplete="off"
              spellcheck="false"
              placeholder="androidId=...&Email=..."
              class="h-8 text-xs bg-background/80"
              :disabled="isAddingRawCredential"
              @keydown.enter="addRawCredential"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-xs cursor-pointer select-none font-medium"
              :disabled="!rawCredential.trim() || isAddingRawCredential"
              @click="addRawCredential"
            >
              {{ isAddingRawCredential ? 'Adding...' : 'Add credential' }}
            </Button>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
