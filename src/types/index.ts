export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  isHtml: boolean;
  websites: string[]; // Empty array means global
  createdAt: string;
  updatedAt: string;
}

export interface StorageConfig {
  useGoogleDrive: boolean;
  lastSync?: string;
  syncInterval: number; // in minutes
  googleDriveFileId?: string;
}

export interface StorageData {
  responses: CannedResponse[];
  config: StorageConfig;
}

export const DEFAULT_CONFIG: StorageConfig = {
  useGoogleDrive: false,
  syncInterval: 60, // 1 hour
};

export const DEFAULT_STORAGE: StorageData = {
  responses: [],
  config: DEFAULT_CONFIG,
};
