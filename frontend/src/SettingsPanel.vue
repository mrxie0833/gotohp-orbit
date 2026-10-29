<script setup lang="ts">
import { nextTick, ref, onMounted, watch } from 'vue'
import { ConfigManager } from '../bindings/app/core'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info, Sliders, Image, Network, ShieldAlert } from '@lucide/vue'

import {
    NumberField,
    NumberFieldContent,
    NumberFieldDecrement,
    NumberFieldIncrement,
    NumberFieldInput,
} from '@/components/ui/number-field'

interface Settings {
    proxy: string
    useQuota: boolean
    saver: boolean
    recursive: boolean
    forceUpload: boolean
    pairLivePhotos: boolean
    skipIncompleteLivePhotos: boolean
    updateExistingPhotosToLive: boolean
    deleteFromHost: boolean
    disableUnsupportedFilesFilter: boolean
    setDateFromFilename: boolean
    uploadThreads: number
}

type BooleanSetting = Exclude<keyof Settings, 'proxy' | 'uploadThreads'>

const settings = ref<Settings>({
    proxy: '',
    useQuota: false,
    saver: false,
    recursive: false,
    forceUpload: false,
    pairLivePhotos: false,
    skipIncompleteLivePhotos: true,
    updateExistingPhotosToLive: false,
    deleteFromHost: false,
    disableUnsupportedFilesFilter: false,
    setDateFromFilename: false,
    uploadThreads: 0
})
const isHydrating = ref(true)

const toggleSetting = (setting: BooleanSetting, enabled = true) => {
    if (!enabled) return
    settings.value[setting] = !settings.value[setting]
}

onMounted(async () => {
    try {
        const config = await ConfigManager.GetSettings()
        settings.value = {
            proxy: config.proxy || '',
            useQuota: config.useQuota || false,
            saver: config.saver || false,
            recursive: config.recursive || false,
            forceUpload: config.forceUpload || false,
            pairLivePhotos: config.pairLivePhotos || false,
            skipIncompleteLivePhotos: config.skipIncompleteLivePhotos ?? true,
            updateExistingPhotosToLive: config.updateExistingPhotosToLive || false,
            deleteFromHost: config.deleteFromHost || false,
            disableUnsupportedFilesFilter: config.disableUnsupportedFilesFilter || false,
            setDateFromFilename: config.setDateFromFilename || false,
            uploadThreads: config.uploadThreads || 1
        }
    } finally {
        await nextTick()
        isHydrating.value = false
    }
})

// Watch for changes to proxy value and update backend
watch(() => settings.value.proxy, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetProxy(newValue)
})

// Create individual watchers for each boolean setting
watch(() => settings.value.useQuota, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetUseQuota(newValue)
})

watch(() => settings.value.saver, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetSaver(newValue)
})

watch(() => settings.value.recursive, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetRecursive(newValue)
})

watch(() => settings.value.forceUpload, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetForceUpload(newValue)
})

watch(() => settings.value.pairLivePhotos, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetPairLivePhotos(newValue)
    if (newValue && !settings.value.skipIncompleteLivePhotos) {
        settings.value.skipIncompleteLivePhotos = true
        await ConfigManager.SetSkipIncompleteLivePhotos(true)
    }
})

watch(() => settings.value.skipIncompleteLivePhotos, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetSkipIncompleteLivePhotos(newValue)
})

watch(() => settings.value.updateExistingPhotosToLive, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetUpdateExistingPhotosToLive(newValue)
})

watch(() => settings.value.deleteFromHost, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetDeleteFromHost(newValue)
})

watch(() => settings.value.disableUnsupportedFilesFilter, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetDisableUnsupportedFilesFilter(newValue)
})

watch(() => settings.value.setDateFromFilename, async (newValue) => {
    if (isHydrating.value) return
    await ConfigManager.SetSetDateFromFilename(newValue)
})

watch(() => settings.value.uploadThreads, async (newValue) => {
    if (isHydrating.value) return
    if (newValue < 1) {
        settings.value.uploadThreads = 1
    } else {
        await ConfigManager.SetUploadThreads(newValue)
    }
})
</script>

<template>
  <div class="flex flex-col h-full w-full px-4 py-3 select-none">
    <!-- Header -->
    <div class="mb-2.5 shrink-0">
      <h1 class="text-sm font-semibold tracking-tight text-foreground leading-tight">
        Settings
      </h1>
      <p class="text-[11px] text-muted-foreground">
        Upload behavior and preferences
      </p>
    </div>

    <!-- Scrollable settings body -->
    <div class="flex-1 min-h-0">
      <ScrollArea class="h-full">
        <div class="space-y-3.5 pr-2 pb-4">
          <!-- Section 1: Upload & Concurrency -->
          <div class="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2 shadow-2xs">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
              <Sliders :size="13" />
              <span>Upload & Concurrency</span>
            </div>

            <NumberField
              v-model="settings.uploadThreads"
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg"
              :min="1"
            >
              <Label
                for="upload-threads"
                class="text-xs font-medium cursor-pointer"
              >Upload Threads</Label>
              <NumberFieldContent class="w-24">
                <NumberFieldDecrement
                  class="cursor-pointer size-7"
                  :disabled="settings.uploadThreads <= 1"
                />
                <NumberFieldInput class="h-7 text-xs text-center px-7 bg-background/80" />
                <NumberFieldIncrement class="cursor-pointer size-7" />
              </NumberFieldContent>
            </NumberField>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
              @click="toggleSetting('useQuota')"
            >
              <Label
                for="use-quota"
                class="text-xs font-medium cursor-pointer pointer-events-none"
              >Use Quota</Label>
              <Switch
                id="use-quota"
                v-model="settings.useQuota"
                @click.stop
              />
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
              @click="toggleSetting('saver')"
            >
              <Label
                for="saver-mode"
                class="text-xs font-medium cursor-pointer pointer-events-none"
              >Storage Saver Quality</Label>
              <Switch
                id="saver-mode"
                v-model="settings.saver"
                @click.stop
              />
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
              @click="toggleSetting('recursive')"
            >
              <Label
                for="recursive"
                class="text-xs font-medium cursor-pointer pointer-events-none"
              >Recursive Directory Upload</Label>
              <Switch
                id="recursive"
                v-model="settings.recursive"
                @click.stop
              />
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
              @click="toggleSetting('forceUpload')"
            >
              <div class="flex min-w-0 flex-1 items-center gap-1.5 pointer-events-none">
                <Label
                  for="force-upload"
                  class="text-xs font-medium cursor-pointer"
                >Force Upload</Label>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      type="button"
                      class="pointer-events-auto inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                      aria-label="About Force Upload"
                    >
                      <Info class="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent class="max-w-64 text-xs">
                    Applies to single files. Live Photo pairs always check both components for duplicates.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="force-upload"
                v-model="settings.forceUpload"
                @click.stop
              />
            </div>
          </div>

          <!-- Section 2: Apple Live Photos -->
          <div class="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2 shadow-2xs">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
              <Image :size="13" />
              <span>Apple Live Photos</span>
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
              @click="toggleSetting('pairLivePhotos')"
            >
              <div class="flex min-w-0 flex-1 items-center gap-1.5 pr-2 pointer-events-none">
                <Label
                  for="pair-live-photos"
                  class="text-xs font-medium cursor-pointer"
                >Pair Apple Live Photos</Label>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      type="button"
                      class="pointer-events-auto inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                      aria-label="About Pair Apple Live Photos"
                    >
                      <Info class="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent class="max-w-64 text-xs">
                    Identify Apple Live Photo image and MOV pairs via embedded metadata and upload them as one item.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="pair-live-photos"
                v-model="settings.pairLivePhotos"
                @click.stop
              />
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg pl-3 transition-all"
              :class="[
                settings.pairLivePhotos
                  ? 'hover:bg-accent/40 opacity-100 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              ]"
              @click="toggleSetting('skipIncompleteLivePhotos', settings.pairLivePhotos)"
            >
              <div class="flex min-w-0 flex-1 items-center gap-1.5 pr-2 pointer-events-none">
                <Label
                  for="skip-incomplete-live-photos"
                  class="text-xs"
                >Skip Incomplete Pairs</Label>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      type="button"
                      class="pointer-events-auto inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                      aria-label="About Skip Incomplete Live Photos"
                    >
                      <Info class="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent class="max-w-64 text-xs">
                    Only upload Live Photos when both photo and video are present.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="skip-incomplete-live-photos"
                v-model="settings.skipIncompleteLivePhotos"
                :disabled="!settings.pairLivePhotos"
                @click.stop
              />
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg pl-3 transition-all"
              :class="[
                settings.pairLivePhotos
                  ? 'hover:bg-accent/40 opacity-100 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              ]"
              @click="toggleSetting('updateExistingPhotosToLive', settings.pairLivePhotos)"
            >
              <div class="flex min-w-0 flex-1 items-center gap-1.5 pr-2 pointer-events-none">
                <Label
                  for="update-existing-photos-to-live"
                  class="text-xs"
                >Upgrade Existing to Live</Label>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button
                      type="button"
                      class="pointer-events-auto inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                      aria-label="About Upgrade Existing to Live"
                    >
                      <Info class="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent class="max-w-64 text-xs">
                    If a static photo was already uploaded, re-upload it with MOV to upgrade it.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="update-existing-photos-to-live"
                v-model="settings.updateExistingPhotosToLive"
                :disabled="!settings.pairLivePhotos"
                @click.stop
              />
            </div>
          </div>

          <!-- Section 3: File & System Options -->
          <div class="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2 shadow-2xs">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
              <ShieldAlert :size="13" />
              <span>File Handling</span>
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
              @click="toggleSetting('disableUnsupportedFilesFilter')"
            >
              <Label
                for="filter-unsupported"
                class="text-xs font-medium cursor-pointer pointer-events-none"
              >Disable Unsupported Files Filter</Label>
              <Switch
                id="filter-unsupported"
                v-model="settings.disableUnsupportedFilesFilter"
                @click.stop
              />
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
              @click="toggleSetting('setDateFromFilename')"
            >
              <Label
                for="set-date-from-filename"
                class="text-xs font-medium cursor-pointer pointer-events-none"
              >Set Date from Filename</Label>
              <Switch
                id="set-date-from-filename"
                v-model="settings.setDateFromFilename"
                @click.stop
              />
            </div>

            <div
              class="flex items-center justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
              @click="toggleSetting('deleteFromHost')"
            >
              <Label
                for="delete-host"
                class="text-xs font-medium text-destructive cursor-pointer pointer-events-none"
              >Delete From Host After Upload</Label>
              <Switch
                id="delete-host"
                v-model="settings.deleteFromHost"
                variant="destructive"
                @click.stop
              />
            </div>
          </div>

          <!-- Section 4: Network & Proxy -->
          <div class="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2 shadow-2xs">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
              <Network :size="13" />
              <span>Network & Proxy</span>
            </div>
            <Label
              for="proxy-url"
              class="text-[11px] text-muted-foreground"
            >Proxy URL (optional)</Label>
            <Input
              id="proxy-url"
              v-model="settings.proxy"
              type="text"
              placeholder="http://127.0.0.1:8080 or socks5://..."
              class="h-8 text-xs bg-background/80"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
