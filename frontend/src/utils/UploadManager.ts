import { Clipboard, Events } from "@wailsio/runtime";
import { reactive } from "vue";
import {
  recordUploadResult,
  type UploadResults,
} from "./uploadResults";

export interface ThreadStatus {
  WorkerID: number;
  Status: string;
  FilePath: string;
  FileName: string;
  Message: string;
  BytesUploaded: number;
  BytesTotal: number;
  Attempt: number;
}

export interface FileUploadResult {
  MediaKey: string;
  IsError: boolean;
  IsLivePhoto: boolean;
  Skipped: boolean;
  ErrorMessage: string;
  SkipCode: string;
  SkipReason: string;
  Path: string;
  Paths: string[];
}

export interface PreflightWarning {
  Paths: string[];
  Code: string;
  Message: string;
}

export interface UploadBatchStart {
  Total: number;
  TotalBytes: number;
}

export interface AlbumStatus {
  AlbumName: string;
  ItemsAdded: number;
  TotalItems: number;
  AlbumKeys: string[];
  IsComplete: boolean;
}

export interface AlbumError {
  AlbumName: string;
  Error: string;
}

export interface UploadProgressSnapshot {
  timestamp: number;
  bytes: number;
  files: number;
}

function isSkippedUploadWarning(code: string): boolean {
  return code === "incomplete-live-photo-skipped" || code === "ambiguous-filename-stem";
}

export interface UploadState {
  isUploading: boolean;
  totalFiles: number;
  uploadedFiles: number;
  threads: Map<number, ThreadStatus>;
  results: UploadResults;
  warnings: PreflightWarning[];
  // Byte tracking
  totalBytes: number;
  uploadedBytes: number;
  // Timing & estimation
  startTime: number;
  uploadSpeed: number;
  etaSeconds: number | null;
  // Album creation
  albumStatus: AlbumStatus | null;
  isCreatingAlbum: boolean;
}

class UploadManager {
  private static instance: UploadManager;

  // Reactive state that can be accessed by components
  public state = reactive<UploadState>({
    isUploading: false,
    totalFiles: 0,
    uploadedFiles: 0,
    threads: new Map<number, ThreadStatus>(),
    results: {
      success: [],
      fail: [],
      skipped: [],
      warnings: [],
    },
    warnings: [],
    totalBytes: 0,
    uploadedBytes: 0,
    startTime: 0,
    uploadSpeed: 0,
    etaSeconds: null,
    albumStatus: null,
    isCreatingAlbum: false,
  });

  // For speed and ETA calculation (sliding history buffer)
  private progressHistory: UploadProgressSnapshot[] = [];
  // For ETA calculation
  private smoothedEta: number | null = null;
  private lastEtaUpdate: number = 0;
  // Track bytes from completed files
  private completedBytes: number = 0;
  // Track the last known BytesTotal for each file
  private fileBytes: Map<string, number> = new Map();
  // Dedupe decisions can change the bytes that will actually be uploaded.
  private totalBytesAdjustment: number = 0;

  private constructor() {
    // Bind all methods to ensure 'this' context is preserved
    this.resetUploadResults = this.resetUploadResults.bind(this);
    this.clearResults = this.clearResults.bind(this);
    this.cancelUpload = this.cancelUpload.bind(this);
    this.copyResultsAsJson = this.copyResultsAsJson.bind(this);
    this.tickEta = this.tickEta.bind(this);

    this.setupEventListeners();
  }

  public static getInstance(): UploadManager {
    if (!UploadManager.instance) {
      UploadManager.instance = new UploadManager();
    }
    return UploadManager.instance;
  }

  private setupEventListeners() {
    // Handle upload start
    Events.On("uploadStart", (event: { data: UploadBatchStart }) => {
      this.state.totalFiles = event.data.Total;
      this.state.totalBytes = event.data.TotalBytes; // May be 0 initially
      this.state.uploadedFiles = 0;
      this.state.uploadedBytes = 0;
      this.state.isUploading = true;
      this.state.threads.clear();
      this.state.startTime = Date.now();
      this.state.uploadSpeed = 0;
      this.completedBytes = 0;
      this.fileBytes.clear();
      this.totalBytesAdjustment = 0;
      this.state.etaSeconds = null;
      this.smoothedEta = null;
      this.lastEtaUpdate = 0;
      this.progressHistory = [];
      this.resetUploadResults();
      this.state.warnings = [];
    });

    // Handle async total bytes update (calculated after uploadStart)
    Events.On("uploadTotalBytes", (event: { data: number }) => {
      this.state.totalBytes = Math.max(0, event.data + this.totalBytesAdjustment);
    });

    Events.On("uploadTotalBytesDelta", (event: { data: number }) => {
      this.totalBytesAdjustment += event.data;
      this.state.totalBytes = Math.max(0, this.state.totalBytes + event.data);
    });

    Events.On("uploadWarning", (event: { data: PreflightWarning }) => {
      this.state.warnings.push(event.data);
      if (!isSkippedUploadWarning(event.data.Code)) {
        this.state.results.warnings.push({
          paths: event.data.Paths,
          code: event.data.Code,
          reason: event.data.Message,
        });
      }
    });

    // Handle thread status updates
    Events.On("ThreadStatus", (event: { data: ThreadStatus }) => {
      const thread = event.data;

      if (thread.Status === 'uploading' && thread.FilePath && thread.BytesTotal > 0) {
        this.fileBytes.set(thread.FilePath, thread.BytesTotal);
      }

      // Suppress individual toast flood on thread error:
      // Status is shown live in active threads and collected in Results.
      
      this.state.threads.set(thread.WorkerID, thread);
      this.updateBytesAndSpeed();
    });

    // Handle file status updates
    Events.On("FileStatus", (event: { data: FileUploadResult }) => {
      const { Path, Paths } = event.data;

      this.state.uploadedFiles += recordUploadResult(this.state.results, event.data);
      if (!event.data.IsError) {
        const completedFileBytes = this.fileBytes.get(Path);
        if (completedFileBytes && completedFileBytes > 0) {
          this.completedBytes += completedFileBytes;
        }
      }
      for (const completedPath of Paths?.length ? Paths : [Path]) {
        this.fileBytes.delete(completedPath);
      }
      this.updateBytesAndSpeed();

      // Skipped-only batches can begin and end within one backend event burst.
      // Finishing locally prevents a missed terminal event from leaving the timer running.
      if (
        this.state.totalFiles > 0
        && this.state.uploadedFiles >= this.state.totalFiles
        && this.state.results.success.length === 0
        && this.state.results.fail.length === 0
      ) {
        this.state.isUploading = false;
        window.dispatchEvent(new CustomEvent('uploadFinished', { detail: { results: this.state.results } }));
      }
    });

    // Handle upload stop
    Events.On("uploadStop", () => {
      const wasUploading = this.state.isUploading;
      this.state.isUploading = false;
      if (wasUploading) {
        window.dispatchEvent(new CustomEvent('uploadFinished', { detail: { results: this.state.results } }));
      }
    });

    // Handle album creation progress
    Events.On("albumProgress", (event: { data: AlbumStatus }) => {
      this.state.albumStatus = event.data;
      this.state.isCreatingAlbum = true;
    });

    // Handle album creation complete
    Events.On("albumComplete", (event: { data: AlbumStatus }) => {
      this.state.albumStatus = event.data;
      this.state.isCreatingAlbum = false;
    });

    // Handle album creation error
    Events.On("albumError", (event: { data: AlbumError }) => {
      this.state.isCreatingAlbum = false;
      // Emit a custom event that App.vue can listen to for showing toast
      window.dispatchEvent(new CustomEvent('albumError', { detail: event.data }));
    });
  }

  private updateBytesAndSpeed() {
    // Calculate bytes from currently active uploads
    let activeUploadedBytes = 0;

    this.state.threads.forEach((thread) => {
      if (thread.Status === 'uploading' && thread.BytesTotal > 0) {
        activeUploadedBytes += thread.BytesUploaded;
      } else if (thread.Status === 'finalizing' && thread.FilePath) {
        activeUploadedBytes += this.fileBytes.get(thread.FilePath) ?? 0;
      }
    });

    // Total uploaded = completed files + current progress
    const totalUploaded = this.completedBytes + activeUploadedBytes;
    this.state.uploadedBytes = totalUploaded;

    const now = Date.now();

    // Sample progress snapshots at most every 400ms into history buffer
    const lastSnap = this.progressHistory.length > 0 ? this.progressHistory[this.progressHistory.length - 1] : null;
    if (!lastSnap || now - lastSnap.timestamp >= 400) {
      this.progressHistory.push({
        timestamp: now,
        bytes: totalUploaded,
        files: this.state.uploadedFiles,
      });

      // Retain 10 seconds of sliding window history
      const cutoff = now - 10000;
      while (this.progressHistory.length > 2 && this.progressHistory[0].timestamp < cutoff) {
        this.progressHistory.shift();
      }

      // Compute rolling speed across the sliding window (smooths inter-file lulls)
      if (this.progressHistory.length >= 2) {
        const oldest = this.progressHistory[0];
        const spanMs = now - oldest.timestamp;
        if (spanMs >= 800) {
          const bytesSpan = totalUploaded - oldest.bytes;
          this.state.uploadSpeed = Math.max(0, (bytesSpan / spanMs) * 1000);
        }
      }
    }

    this.updateEta();
  }

  /**
   * Ticks down ETA by 1 second during active uploads for natural wall-clock countdown.
   */
  public tickEta() {
    if (!this.state.isUploading || this.state.etaSeconds === null || this.state.startTime === 0) {
      return;
    }
    if (this.state.etaSeconds > 1) {
      this.state.etaSeconds -= 1;
      if (this.smoothedEta !== null && this.smoothedEta > 1) {
        this.smoothedEta = Math.max(0, this.smoothedEta - 1);
      }
    }
  }

  public updateEta() {
    const now = Date.now();
    if (!this.state.isUploading || this.state.startTime === 0) {
      this.state.etaSeconds = null;
      this.smoothedEta = null;
      return;
    }

    const elapsedMs = now - this.state.startTime;
    // Allow initial 3.5 seconds for worker threads to start transferring and calibrate
    if (elapsedMs < 3500) {
      this.state.etaSeconds = null;
      return;
    }

    // Limit recalculation frequency to at most once per 500ms
    if (now - this.lastEtaUpdate < 500 && this.state.etaSeconds !== null) {
      return;
    }

    // Calculate composite progress: blend 65% byte progress with 35% file completion progress
    // to properly account for per-file network/commit latency in multi-file batches.
    let compositeProgress = 0;
    if (this.state.totalBytes > 0 && this.state.totalFiles > 0) {
      const byteRatio = Math.min(1, Math.max(0, this.state.uploadedBytes / this.state.totalBytes));
      const fileRatio = Math.min(1, Math.max(0, this.state.uploadedFiles / this.state.totalFiles));
      compositeProgress = 0.65 * byteRatio + 0.35 * fileRatio;
    } else if (this.state.totalFiles > 0) {
      compositeProgress = Math.min(1, Math.max(0, this.state.uploadedFiles / this.state.totalFiles));
    } else if (this.state.totalBytes > 0) {
      compositeProgress = Math.min(1, Math.max(0, this.state.uploadedBytes / this.state.totalBytes));
    }

    if (compositeProgress >= 1 || (this.state.totalFiles > 0 && this.state.uploadedFiles >= this.state.totalFiles)) {
      this.state.etaSeconds = 0;
      this.smoothedEta = 0;
      this.lastEtaUpdate = now;
      return;
    }

    // 1. Cumulative session rate (progress per ms)
    const cumulativeRate = compositeProgress / elapsedMs;

    // 2. Rolling window rate from sliding history buffer (past 8-10 seconds)
    let windowRate = cumulativeRate;
    if (this.progressHistory.length >= 2) {
      const oldest = this.progressHistory[0];
      const dt = now - oldest.timestamp;
      if (dt >= 2000) {
        let oldProg = 0;
        if (this.state.totalBytes > 0 && this.state.totalFiles > 0) {
          const bRatio = Math.min(1, Math.max(0, oldest.bytes / this.state.totalBytes));
          const fRatio = Math.min(1, Math.max(0, oldest.files / this.state.totalFiles));
          oldProg = 0.65 * bRatio + 0.35 * fRatio;
        } else if (this.state.totalFiles > 0) {
          oldProg = Math.min(1, Math.max(0, oldest.files / this.state.totalFiles));
        } else if (this.state.totalBytes > 0) {
          oldProg = Math.min(1, Math.max(0, oldest.bytes / this.state.totalBytes));
        }
        const dProg = Math.max(0, compositeProgress - oldProg);
        windowRate = dProg / dt;
      }
    }

    // Blend cumulative session rate with windowed rate (50% cumulative, 50% windowed)
    // Cumulative anchors against pauses; windowed adapts to genuine line changes.
    let effectiveRate = 0.5 * windowRate + 0.5 * cumulativeRate;
    if (effectiveRate <= 0) {
      effectiveRate = cumulativeRate;
    }

    let rawEta: number | null = null;
    const remainingProgress = Math.max(0, 1 - compositeProgress);
    if (effectiveRate > 0) {
      rawEta = (remainingProgress / effectiveRate) / 1000; // convert ms to seconds
    }

    if (rawEta !== null && isFinite(rawEta) && rawEta >= 0) {
      if (this.smoothedEta === null) {
        this.smoothedEta = rawEta;
      } else {
        const dtSec = Math.max(0.1, (now - this.lastEtaUpdate) / 1000);
        if (rawEta < this.smoothedEta) {
          // Faster progress: adapt with alpha = 0.20
          this.smoothedEta = 0.80 * this.smoothedEta + 0.20 * rawEta;
        } else {
          // Slower / momentary stall: adapt with heavily damped alpha = 0.05
          const candidate = 0.95 * this.smoothedEta + 0.05 * rawEta;
          // Clamp upward jump so a pause cannot increase ETA by more than 1.5s per elapsed second
          const maxAllowed = this.smoothedEta + dtSec * 1.5;
          this.smoothedEta = Math.min(candidate, maxAllowed);
        }
      }
      this.state.etaSeconds = Math.max(0, Math.round(this.smoothedEta));
    } else {
      this.state.etaSeconds = null;
    }

    this.lastEtaUpdate = now;
  }

  public resetUploadResults() {
    this.state.results.success = [];
    this.state.results.fail = [];
    this.state.results.skipped = [];
    this.state.results.warnings = [];
    this.state.etaSeconds = null;
    this.smoothedEta = null;
    this.lastEtaUpdate = 0;
    this.progressHistory = [];
  }

  public clearResults() {
    this.resetUploadResults();
    this.state.totalFiles = 0;
    this.state.uploadedFiles = 0;
    this.state.totalBytes = 0;
    this.state.uploadedBytes = 0;
    this.state.uploadSpeed = 0;
    this.state.etaSeconds = null;
    this.smoothedEta = null;
    this.lastEtaUpdate = 0;
    this.state.warnings = [];
    this.state.albumStatus = null;
    this.state.threads.clear();
    this.progressHistory = [];
  }

  public cancelUpload() {
    Events.Emit("uploadCancel");
  }

  public async copyResultsAsJson() {
    const resultsJson = JSON.stringify(this.state.results, null, 2);
    try {
      await Clipboard.SetText(resultsJson);
      console.log("Upload results copied to clipboard");
      return true;
    } catch (error) {
      console.error("Failed to copy results:", error);
      return false;
    }
  }
}

// Create and export a single instance
export const uploadManager = UploadManager.getInstance();
