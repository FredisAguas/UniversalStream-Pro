export enum DownloadStatus {
  QUEUED = 'QUEUED',
  DOWNLOADING = 'DOWNLOADING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  PAUSED = 'PAUSED'
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  progress: number;
  speed: string;
  size: string;
  status: DownloadStatus;
  format: string;
  addedAt: Date;
}

export interface Settings {
  downloadPath: string;
  maxConcurrentDownloads: number;
  defaultQuality: '4k' | '1080p' | '720p' | '480p';
  autoConvert: boolean;
  theme: 'dark' | 'light';
  notifications: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
