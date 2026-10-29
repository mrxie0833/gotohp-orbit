<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useColorMode } from '@vueuse/core'
import { Events } from '@wailsio/runtime'
import { toast } from 'vue-sonner'
import {
  UploadCloud,
  ListCheck,
  Settings2,
  UserPlus,
  FolderPlus,
  Layers,
  Smartphone,
} from '@lucide/vue'

import { ConfigManager } from '../bindings/app/core'
import Button from './components/ui/button/Button.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TooltipProvider } from '@/components/ui/tooltip'
import Toaster from './components/ui/sonner/Sonner.vue'
import GoogleAccountSelect from './components/GoogleAccountSelect.vue'
import GoogleAuthSetup from './components/GoogleAuthSetup.vue'
import SettingsPanel from './SettingsPanel.vue'
import Upload from './Upload.vue'
import UploadResults from './components/UploadResults.vue'
import { uploadManager } from './utils/UploadManager'
import './index.css'

useColorMode().value = 'dark'

const { state: uploadState } = uploadManager

type ActiveTab = 'upload' | 'results' | 'settings'
const activeTab = ref<ActiveTab>('upload')

// Drag state for dual drop zones
const isDraggingFiles = ref(false)

// Album upload flow state
const showAlbumInput = ref(false)
const pendingFiles = ref<string[]>([])
const pendingFileCount = ref(0)

const selectedOption = ref('')
const options = ref<string[]>([])
const accountNeedsTokenBinding = ref<Record<string, boolean>>({})
const albumNameOrKey = ref('')
const tokenBindingEmail = ref('')
const isExtractingTokenBinding = ref(false)
const isAccountSetupOpen = ref(false)
const removingAccount = ref('')

watch(selectedOption, async (newValue) => {
  if (newValue) {
    try {
      await ConfigManager.SetSelected(newValue)
      await updateTokenBindingPrompt(newValue)
      console.log('Successfully updated selected value:', newValue)
    } catch (error) {
      console.error('Failed to update selected value:', error)
      toast.error('Failed to update selected account.')
    }
  } else {
    tokenBindingEmail.value = ''
  }
})

async function updateTokenBindingPrompt(email: string) {
  tokenBindingEmail.value = accountNeedsTokenBinding.value[email] ? email : ''
}

async function refreshCredentials() {
  try {
    const state = await ConfigManager.GetAccounts()
    const nextNeedsTokenBinding: Record<string, boolean> = {}
    const nextOptions = state.accounts.map(account => {
      nextNeedsTokenBinding[account.email] = account.needsTokenBinding
      return account.email
    })

    accountNeedsTokenBinding.value = nextNeedsTokenBinding
    options.value = nextOptions
    selectedOption.value = state.selected || ''
    if (state.selected) {
      await updateTokenBindingPrompt(state.selected)
    } else {
      tokenBindingEmail.value = ''
    }
  } catch (error) {
    console.error('Failed to refresh Google accounts:', error)
    toast.error('Could not refresh Google accounts', {
      description: error instanceof Error ? error.message : String(error),
    })
  }
}

async function addTokenBindingAliasFromADB() {
  if (!tokenBindingEmail.value) return

  isExtractingTokenBinding.value = true
  try {
    await ConfigManager.AddTokenBindingAliasFromADB(tokenBindingEmail.value)
    await refreshCredentials()
    tokenBindingEmail.value = ''
    toast.success('Token binding key added.')
  } catch (error) {
    console.error('Failed to add token binding key:', error)
    toast.error('Failed to add token binding key', {
      description: error instanceof Error ? error.message : String(error),
    })
  } finally {
    isExtractingTokenBinding.value = false
  }
}

async function removeCredentials(email: string) {
  removingAccount.value = email
  try {
    await ConfigManager.RemoveCredentials(email)

    const removedSelectedAccount = selectedOption.value === email
    await refreshCredentials()
    if (removedSelectedAccount && options.value.length > 0 && !selectedOption.value) {
      selectedOption.value = options.value[0]
    }
    toast.success('Credentials removed.')
    return true
  } catch (error) {
    console.error('Failed to remove credentials:', error)
    toast.error('Failed to remove credentials.')
    return false
  } finally {
    removingAccount.value = ''
  }
}

function openAccountSetup() {
  isAccountSetupOpen.value = true
}

// Global drag event handlers to detect file dragging
let dragLeaveTimeout: ReturnType<typeof setTimeout> | null = null

const onDragEnter = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return
  
  if (dragLeaveTimeout) {
    clearTimeout(dragLeaveTimeout)
    dragLeaveTimeout = null
  }
  
  isDraggingFiles.value = true
}

const onDragOver = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return
  e.preventDefault()
  
  if (dragLeaveTimeout) {
    clearTimeout(dragLeaveTimeout)
    dragLeaveTimeout = null
  }
}

const onDragLeave = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return
  
  if (dragLeaveTimeout) {
    clearTimeout(dragLeaveTimeout)
  }
  dragLeaveTimeout = setTimeout(() => {
    isDraggingFiles.value = false
    dragLeaveTimeout = null
  }, 50)
}

const onDrop = () => {
  if (dragLeaveTimeout) {
    clearTimeout(dragLeaveTimeout)
    dragLeaveTimeout = null
  }
  
  setTimeout(() => {
    isDraggingFiles.value = false
  }, 100)
}

// Album upload confirmation
const confirmAlbumUpload = async () => {
  await ConfigManager.SetAlbumName(albumNameOrKey.value)
  await ConfigManager.SetAlbumAutoMode(false)
  activeTab.value = 'upload'
  Events.Emit('startUpload', { files: pendingFiles.value })
  showAlbumInput.value = false
  pendingFiles.value = []
  pendingFileCount.value = 0
  albumNameOrKey.value = ''
}

const cancelAlbumUpload = () => {
  showAlbumInput.value = false
  pendingFiles.value = []
  pendingFileCount.value = 0
  albumNameOrKey.value = ''
}

// Handle album error event
const albumErrorHandler = (e: Event) => {
  const event = e as CustomEvent<{ AlbumName: string; Error: string }>
  const { AlbumName, Error } = event.detail
  if (Error.includes('404')) {
    toast.error('Album not found', {
      description: `The album key "${AlbumName}" does not exist or is invalid.`,
    })
  } else {
    toast.error('Failed to create album', {
      description: `Album "${AlbumName}": ${Error}`,
    })
  }
}

// Handle upload batch completion event
const uploadFinishedHandler = () => {
  activeTab.value = 'results'
  const fail = uploadState.results.fail.length
  const success = uploadState.results.success.length
  const skipped = uploadState.results.skipped.length

  if (fail > 0) {
    toast.warning(`Upload completed with ${fail} error(s)`, {
      description: `${success} succeeded, ${skipped} skipped. Check Results for details.`,
    })
  } else if (success > 0) {
    toast.success(`Upload complete: ${success} file(s) uploaded`, {
      description: skipped > 0 ? `${skipped} skipped.` : undefined,
    })
  } else if (skipped > 0) {
    toast.info(`Upload finished: ${skipped} file(s) skipped`)
  }
}

onMounted(async () => {
  await refreshCredentials()

  document.addEventListener('dragenter', onDragEnter)
  document.addEventListener('dragleave', onDragLeave)
  document.addEventListener('dragover', onDragOver)
  document.addEventListener('drop', onDrop)
  window.addEventListener('albumError', albumErrorHandler)
  window.addEventListener('uploadFinished', uploadFinishedHandler)

  // Listen for files-dropped event from backend
  Events.On('files-dropped', async (event: { data: { files: string[]; dropZone: string } }) => {
    const { files, dropZone } = event.data

    if (dropZone === 'album') {
      pendingFiles.value = files
      pendingFileCount.value = files.length
      showAlbumInput.value = true
    } else {
      try {
        await ConfigManager.SetAlbumName('')
        await ConfigManager.SetAlbumAutoMode(dropZone === 'auto-album')
        activeTab.value = 'upload'
        await Events.Emit('startUpload', { files })
      } catch (error) {
        console.error('Failed to start upload:', error)
        toast.error('Failed to start upload', {
          description: error instanceof Error ? error.message : String(error),
        })
      }
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('dragenter', onDragEnter)
  document.removeEventListener('dragleave', onDragLeave)
  document.removeEventListener('dragover', onDragOver)
  document.removeEventListener('drop', onDrop)
  window.removeEventListener('albumError', albumErrorHandler)
  window.removeEventListener('uploadFinished', uploadFinishedHandler)
  if (dragLeaveTimeout) {
    clearTimeout(dragLeaveTimeout)
  }
})
</script>

<template>
  <main class="w-screen h-screen flex flex-col bg-background text-foreground overflow-hidden select-none">
    <!-- Top Account & Drag Header -->
    <header
      class="h-10 px-3 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between shrink-0"
      style="--wails-draggable: drag"
    >
      <div
        class="flex items-center gap-2 min-w-0"
        style="--wails-draggable: none"
      >
        <template v-if="options.length > 0">
          <GoogleAccountSelect
            v-model="selectedOption"
            :options="options"
            :removing-account="removingAccount"
            @item-removed="removeCredentials"
            @add="openAccountSetup"
          />
        </template>
        <template v-else>
          <div class="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-foreground">
            <span class="size-2 rounded-full bg-primary" />
            <span>gotohp</span>
          </div>
        </template>
      </div>

      <div
        class="flex items-center gap-1.5 shrink-0"
        style="--wails-draggable: none"
      >
        <Button
          variant="ghost"
          size="sm"
          class="h-7 text-xs px-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg"
          title="Manage Accounts"
          @click="openAccountSetup"
        >
          <UserPlus
            :size="13"
            class="mr-1 text-primary"
          />
          <span>Accounts</span>
        </Button>
      </div>
    </header>

    <!-- Token Binding Alert Banner (if needed) -->
    <div
      v-if="tokenBindingEmail && activeTab === 'upload' && !uploadState.isUploading"
      class="mx-3 mt-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-2 shrink-0 text-xs"
      style="--wails-draggable: none"
    >
      <div class="flex items-center gap-1.5 min-w-0 text-amber-500">
        <Smartphone
          :size="13"
          class="shrink-0"
        />
        <span class="truncate text-[11px] font-medium">Token binding key required</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="h-6 text-[11px] px-2.5 font-medium border-amber-500/40 text-amber-500 hover:bg-amber-500/15 cursor-pointer shrink-0"
        :disabled="isExtractingTokenBinding"
        @click="addTokenBindingAliasFromADB"
      >
        {{ isExtractingTokenBinding ? 'Reading...' : 'Read ADB' }}
      </Button>
    </div>

    <!-- Main View Area -->
    <div
      class="flex-1 min-h-0 relative overflow-hidden"
      data-file-drop-target
    >
      <!-- Drop Zones Overlay when dragging files -->
      <div
        v-if="!uploadState.isUploading && isDraggingFiles && options.length > 0"
        class="absolute inset-0 z-50 flex flex-col gap-2 p-3 bg-background/95 backdrop-blur-md"
        style="--wails-draggable: none"
      >
        <div
          data-file-drop-target
          data-drop-zone="regular"
          class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 rounded-xl transition-all drop-zone group cursor-pointer"
        >
          <div class="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
            <UploadCloud :size="20" />
          </div>
          <h2 class="text-xs font-semibold text-foreground tracking-tight">
            Upload Directly
          </h2>
          <p class="text-[11px] text-muted-foreground mt-0.5">
            Store photos in library without album
          </p>
        </div>

        <div
          data-file-drop-target
          data-drop-zone="album"
          class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/40 bg-indigo-500/5 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all drop-zone group cursor-pointer"
        >
          <div class="size-9 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
            <FolderPlus :size="20" />
          </div>
          <h2 class="text-xs font-semibold text-foreground tracking-tight">
            Upload to Specific Album
          </h2>
          <p class="text-[11px] text-muted-foreground mt-0.5">
            Prompt for custom album name or key
          </p>
        </div>

        <div
          data-file-drop-target
          data-drop-zone="auto-album"
          class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all drop-zone group cursor-pointer"
        >
          <div class="size-9 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
            <Layers :size="20" />
          </div>
          <h2 class="text-xs font-semibold text-foreground tracking-tight">
            Auto Group by Folder
          </h2>
          <p class="text-[11px] text-muted-foreground mt-0.5">
            Create albums matching directory names
          </p>
        </div>
      </div>

      <!-- Album Name Modal Prompt -->
      <div
        v-else-if="showAlbumInput"
        class="absolute inset-0 z-50 flex flex-col items-center justify-center p-5 bg-background/90 backdrop-blur-md"
        style="--wails-draggable: none"
      >
        <div class="w-full max-w-[280px] p-5 rounded-2xl border bg-card shadow-2xl flex flex-col items-center text-center gap-3.5">
          <div class="size-11 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <FolderPlus :size="22" />
          </div>
          <div>
            <h2 class="text-sm font-semibold tracking-tight">
              Create / Add to Album
            </h2>
            <p class="text-[11px] text-muted-foreground mt-0.5">
              {{ pendingFileCount }} file(s) queued for upload
            </p>
          </div>

          <div class="w-full text-left space-y-1">
            <Label
              for="album-name"
              class="text-[11px] font-medium text-muted-foreground"
            >Album Name or Key</Label>
            <Input
              id="album-name"
              v-model="albumNameOrKey"
              placeholder="e.g. Summer Vacation or AF1Qip..."
              class="h-8 text-xs bg-background/80"
              autofocus
              @keydown.enter="confirmAlbumUpload"
            />
          </div>

          <div class="flex gap-2 w-full pt-1">
            <Button
              variant="outline"
              size="sm"
              class="flex-1 h-8 text-xs cursor-pointer"
              @click="cancelAlbumUpload"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              class="flex-1 h-8 text-xs cursor-pointer font-medium"
              :disabled="!albumNameOrKey.trim()"
              @click="confirmAlbumUpload"
            >
              Start Upload
            </Button>
          </div>
        </div>
      </div>

      <!-- TAB 1: UPLOAD -->
      <div
        v-show="activeTab === 'upload'"
        class="h-full w-full"
      >
        <template v-if="uploadState.isUploading">
          <Upload />
        </template>

        <template v-else-if="options.length === 0">
          <div class="h-full flex flex-col items-center justify-center p-6 text-center">
            <div class="size-12 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-3">
              <UserPlus :size="22" />
            </div>
            <h2 class="text-sm font-semibold tracking-tight">
              Connect Google Photos
            </h2>
            <p class="text-xs text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
              Add a Google account before uploading photos and videos.
            </p>
            <Button
              size="sm"
              class="mt-4 cursor-pointer text-xs font-medium"
              @click="openAccountSetup"
            >
              Add Google account
            </Button>
          </div>
        </template>

        <template v-else>
          <div class="h-full flex flex-col items-center justify-center p-4 text-center">
            <div class="w-full max-w-[320px] p-5 rounded-2xl border border-dashed border-border/80 bg-card/30 flex flex-col items-center text-center transition-all hover:border-primary/40 hover:bg-card/50">
              <div class="size-13 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-2.5">
                <UploadCloud :size="24" />
              </div>
              <h2 class="text-sm font-semibold tracking-tight text-foreground">
                Drop files or folders here
              </h2>
              <p class="text-[11px] text-muted-foreground mt-1 max-w-[230px] leading-relaxed">
                Drag photos, videos, or folders directly into this window to start uploading.
              </p>

              <div class="mt-4 grid grid-cols-3 gap-1.5 w-full pt-3.5 border-t border-border/60">
                <div class="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-background/50 border border-border/40 text-[10px] text-muted-foreground text-center">
                  <UploadCloud
                    :size="12"
                    class="text-primary mb-0.5"
                  />
                  <span class="font-medium text-foreground">Direct</span>
                  <span class="opacity-70 text-[9px] leading-none">No album</span>
                </div>
                <div class="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-background/50 border border-border/40 text-[10px] text-muted-foreground text-center">
                  <FolderPlus
                    :size="12"
                    class="text-indigo-400 mb-0.5"
                  />
                  <span class="font-medium text-foreground">To Album</span>
                  <span class="opacity-70 text-[9px] leading-none">Pick name</span>
                </div>
                <div class="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-background/50 border border-border/40 text-[10px] text-muted-foreground text-center">
                  <Layers
                    :size="12"
                    class="text-emerald-400 mb-0.5"
                  />
                  <span class="font-medium text-foreground">Auto</span>
                  <span class="opacity-70 text-[9px] leading-none">By folder</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- TAB 2: RESULTS -->
      <div
        v-show="activeTab === 'results'"
        class="h-full w-full"
      >
        <UploadResults @clear="activeTab = 'upload'" />
      </div>

      <!-- TAB 3: SETTINGS -->
      <div
        v-show="activeTab === 'settings'"
        class="h-full w-full"
      >
        <TooltipProvider disable-hoverable-content>
          <SettingsPanel />
        </TooltipProvider>
      </div>
    </div>

    <!-- Bottom Navigation Bar -->
    <nav class="h-11 border-t bg-card/60 backdrop-blur-md shrink-0 flex items-center justify-around px-3 select-none">
      <button
        type="button"
        class="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer text-xs"
        :class="[
          activeTab === 'upload'
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
        ]"
        @click="activeTab = 'upload'"
      >
        <div class="relative flex items-center justify-center">
          <UploadCloud :size="15" />
          <span
            v-if="uploadState.isUploading"
            class="absolute -top-1 -right-1 size-1.5 rounded-full bg-primary animate-ping"
          />
        </div>
        <span class="text-[11px]">Upload</span>
      </button>

      <button
        type="button"
        class="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer text-xs"
        :class="[
          activeTab === 'results'
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
        ]"
        @click="activeTab = 'results'"
      >
        <div class="relative flex items-center justify-center">
          <ListCheck :size="15" />
          <span
            v-if="uploadState.results.fail.length > 0"
            class="absolute -top-1 -right-1 size-1.5 rounded-full bg-destructive"
          />
        </div>
        <span class="text-[11px]">Results</span>
      </button>

      <button
        type="button"
        class="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer text-xs"
        :class="[
          activeTab === 'settings'
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
        ]"
        @click="activeTab = 'settings'"
      >
        <Settings2 :size="15" />
        <span class="text-[11px]">Settings</span>
      </button>
    </nav>

    <!-- Account Setup Modal -->
    <GoogleAuthSetup
      v-model:open="isAccountSetupOpen"
      @account-added="refreshCredentials"
    />

    <!-- Non-intrusive Toaster placed at top-center -->
    <Toaster
      position="top-center"
      rich-colors
      :duration="3000"
      :visible-toasts="2"
    />
  </main>
</template>
