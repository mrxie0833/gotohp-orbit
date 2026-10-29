import { onBeforeUnmount, reactive, ref } from 'vue'
import { Events } from '@wailsio/runtime'
import { ConfigManager } from '@bindings/app/core'
import { identities } from './identities'
import { transfer } from './transfer-store'
import { toast } from '@/ui/toast'

/** Where a drop goes. The ids are also the `data-drop-zone` values the Go side reports back. */
export type Lane = 'library' | 'named' | 'by-folder'

export const dragging = ref(false)
export const namePrompt = reactive<{ open: boolean; files: string[]; name: string }>({ open: false, files: [], name: '' })

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e))

export async function send(files: string[], lane: Lane, albumName = '') {
  try {
    await ConfigManager.SetAlbumName(lane === 'named' ? albumName.trim() : '')
    await ConfigManager.SetAlbumAutoMode(lane === 'by-folder')
    await Events.Emit('startUpload', { files })
  } catch (e) {
    toast.error('Could not start the transfer', reason(e))
  }
}

export function confirmName() {
  const name = namePrompt.name.trim()
  if (!name) return
  const files = namePrompt.files
  namePrompt.open = false
  namePrompt.name = ''
  namePrompt.files = []
  void send(files, 'named', name)
}

export function cancelName() {
  namePrompt.open = false
  namePrompt.files = []
  namePrompt.name = ''
}

function hasFiles(e: DragEvent) {
  return !!e.dataTransfer?.types.includes('Files')
}

/** Mount once. Tracks OS file drags for the lane overlay and routes backend drop events. */
export function useFileDrop() {
  let leaveTimer: ReturnType<typeof setTimeout> | undefined

  const enter = (e: DragEvent) => {
    if (!hasFiles(e)) return
    clearTimeout(leaveTimer)
    dragging.value = true
  }
  const over = (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    clearTimeout(leaveTimer)
  }
  const leave = (e: DragEvent) => {
    if (!hasFiles(e)) return
    clearTimeout(leaveTimer)
    leaveTimer = setTimeout(() => (dragging.value = false), 50)
  }
  const drop = () => {
    clearTimeout(leaveTimer)
    setTimeout(() => (dragging.value = false), 100)
  }

  document.addEventListener('dragenter', enter)
  document.addEventListener('dragover', over)
  document.addEventListener('dragleave', leave)
  document.addEventListener('drop', drop)

  const off = Events.On('files-dropped', (e: { data: { files: string[]; dropZone: string } }) => {
    const { files, dropZone } = e.data
    if (transfer.active || identities.list.length === 0) {
      if (!transfer.active) toast.info('Add an identity first', 'Orbit needs a signed-in Google account to send photos.')
      return
    }
    if (dropZone === 'named') {
      namePrompt.files = files
      namePrompt.open = true
    } else {
      void send(files, dropZone === 'by-folder' ? 'by-folder' : 'library')
    }
  })

  onBeforeUnmount(() => {
    document.removeEventListener('dragenter', enter)
    document.removeEventListener('dragover', over)
    document.removeEventListener('dragleave', leave)
    document.removeEventListener('drop', drop)
    clearTimeout(leaveTimer)
    off?.()
  })
}
