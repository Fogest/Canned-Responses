// src/services/google-drive.ts

import { CannedResponse } from "../types";

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private fileId: string | null = null;

  private constructor() {}

  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const token = await this.getAuthToken();
      await this.setupDriveFile(token);
    } catch (error) {
      console.error("Failed to initialize Google Drive service:", error);
      throw error;
    }
  }

  private async getAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error("Failed to get auth token"));
        }
      });
    });
  }

  private async setupDriveFile(token: string): Promise<void> {
    // Check if we already have a file
    const files = await this.listFiles(token);

    if (files.length > 0) {
      this.fileId = files[0].id;
    } else {
      // Create new file
      const file = await this.createFile(token);
      this.fileId = file.id;
    }
  }

  private async listFiles(token: string): Promise<any[]> {
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?" +
        new URLSearchParams({
          q: "name='canned-responses.json' and trashed=false",
          spaces: "appDataFolder",
          fields: "files(id, name, modifiedTime)",
        }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data.files || [];
  }

  private async createFile(token: string): Promise<any> {
    const metadata = {
      name: "canned-responses.json",
      parents: ["appDataFolder"],
    };

    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });

    return response.json();
  }

  async saveResponses(responses: CannedResponse[]): Promise<void> {
    try {
      const token = await this.getAuthToken();
      if (!this.fileId) {
        await this.initialize();
      }

      const content = JSON.stringify(responses);

      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${this.fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: content,
        }
      );
    } catch (error) {
      console.error("Failed to save responses to Google Drive:", error);
      throw error;
    }
  }

  async loadResponses(): Promise<CannedResponse[]> {
    try {
      const token = await this.getAuthToken();
      if (!this.fileId) {
        await this.initialize();
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return await response.json();
    } catch (error) {
      console.error("Failed to load responses from Google Drive:", error);
      throw error;
    }
  }

  async revokeAccess(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (!token) {
          resolve();
          return;
        }

        chrome.identity.removeCachedAuthToken({ token }, () => {
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
            .then(() => resolve())
            .catch(reject);
        });
      });
    });
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
