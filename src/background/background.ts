// src/background/background.ts

import { storageService } from "../services/storage";
import { CannedResponse } from "../types";

// Initialize context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "canned-responses",
    title: "Canned Responses",
    contexts: ["editable"],
  });
});

// Handle periodic sync
let syncInterval: ReturnType<typeof setInterval> | undefined;

async function setupSync() {
  const data = await storageService.getStorageData();

  if (syncInterval) {
    clearInterval(syncInterval);
  }

  if (data.config.useGoogleDrive) {
    syncInterval = setInterval(() => {
      storageService.syncFromGoogleDrive().catch((error: Error) => {
        console.error("Sync failed:", error);
      });
    }, data.config.syncInterval * 60 * 1000);
  }
}

// Initial sync on startup
chrome.runtime.onStartup.addListener(() => {
  setupSync();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.config) {
    setupSync();
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const data = await storageService.getStorageData();
  const url = new URL(tab.url!);
  const domain = url.hostname;

  // Filter responses for this domain or global responses
  const applicableResponses = data.responses.filter(
    (response: CannedResponse) =>
      response.websites.length === 0 ||
      response.websites.some((website) => domain.includes(website))
  );

  // Send responses to content script
  chrome.tabs.sendMessage(tab.id, {
    type: "SHOW_RESPONSE_PICKER",
    responses: applicableResponses,
  });
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FORCE_SYNC") {
    storageService
      .syncFromGoogleDrive()
      .then(() => sendResponse({ success: true }))
      .catch((error: Error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true;
  }
});
