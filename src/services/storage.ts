// src/services/storage.ts

import {
  StorageData,
  StorageConfig,
  CannedResponse,
  DEFAULT_STORAGE,
} from "../types";
import { googleDriveService } from "./google-drive";

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async getStorageData(): Promise<StorageData> {
    const data = await new Promise<StorageData>((resolve) => {
      chrome.storage.local.get(["responses", "config"], (result) => {
        if (!result.responses || !result.config) {
          resolve(DEFAULT_STORAGE);
        } else {
          resolve(result as StorageData);
        }
      });
    });

    if (data.config.useGoogleDrive) {
      try {
        const responses = await googleDriveService.loadResponses();
        return {
          ...data,
          responses,
        };
      } catch (error) {
        console.error("Failed to load from Google Drive:", error);
      }
    }

    return data;
  }

  async saveStorageData(data: StorageData): Promise<void> {
    await chrome.storage.local.set(data);

    if (data.config.useGoogleDrive && data.config.googleDriveFileId) {
      try {
        await googleDriveService.saveResponses(data.responses);
        await chrome.storage.local.set({
          config: {
            ...data.config,
            lastSync: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("Failed to save to Google Drive:", error);
        throw error;
      }
    }
  }

  async syncFromGoogleDrive(): Promise<void> {
    const data = await this.getStorageData();
    if (!data.config.useGoogleDrive) {
      return;
    }

    try {
      const responses = await googleDriveService.loadResponses();
      await this.saveStorageData({
        ...data,
        responses,
        config: {
          ...data.config,
          lastSync: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to sync from Google Drive:", error);
      throw error;
    }
  }

  async enableGoogleDrive(): Promise<void> {
    try {
      await googleDriveService.initialize();
      const data = await this.getStorageData();
      await this.saveStorageData({
        ...data,
        config: {
          ...data.config,
          useGoogleDrive: true,
        },
      });
    } catch (error) {
      console.error("Failed to enable Google Drive:", error);
      throw error;
    }
  }

  async disableGoogleDrive(): Promise<void> {
    try {
      await googleDriveService.revokeAccess();
      const data = await this.getStorageData();
      await this.saveStorageData({
        ...data,
        config: {
          ...data.config,
          useGoogleDrive: false,
          googleDriveFileId: undefined,
          lastSync: undefined,
        },
      });
    } catch (error) {
      console.error("Failed to disable Google Drive:", error);
      throw error;
    }
  }
}

export const storageService = StorageService.getInstance();
