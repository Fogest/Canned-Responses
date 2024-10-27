// src/popup/popup.ts

import { StorageData, CannedResponse, DEFAULT_STORAGE } from "../types";
import { storageService } from "../services/storage";

declare const tinymce: any;

class PopupManager {
  private editor: any;
  private currentResponse: CannedResponse | null = null;
  private responses: CannedResponse[] = [];

  constructor() {
    this.initializePopup();
  }

  private async initializePopup() {
    await this.loadData();
    this.initializeTabs();
    this.initializeEventListeners();
    this.initializeEditor();
    this.renderResponses();
    this.updateSyncStatus();
  }

  private async loadData() {
    const data = await storageService.getStorageData();
    this.responses = data.responses;
    this.updateSettingsUI(data);
  }

  private initializeTabs() {
    const tabs = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        contents.forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        const targetId = tab.id.replace("Tab", "");
        document.getElementById(targetId)?.classList.add("active");
      });
    });
  }

  private initializeEventListeners() {
    // New response button
    document.getElementById("newResponseBtn")?.addEventListener("click", () => {
      this.openEditor();
    });

    // Search input
    document.getElementById("searchInput")?.addEventListener("input", (e) => {
      const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
      this.filterResponses(searchTerm);
    });

    // Editor modal
    document.getElementById("responseType")?.addEventListener("change", (e) => {
      this.toggleEditor((e.target as HTMLSelectElement).value === "html");
    });

    document.getElementById("addWebsite")?.addEventListener("click", () => {
      this.addWebsiteInput();
    });

    document.getElementById("saveResponse")?.addEventListener("click", () => {
      this.saveResponse();
    });

    document.getElementById("closeModal")?.addEventListener("click", () => {
      this.closeEditor();
    });

    document.getElementById("cancelEdit")?.addEventListener("click", () => {
      this.closeEditor();
    });

    // Force sync button
    document
      .getElementById("forceSyncBtn")
      ?.addEventListener("click", async () => {
        const button = document.getElementById(
          "forceSyncBtn"
        ) as HTMLButtonElement;
        if (button) {
          button.disabled = true;
          button.textContent = "Syncing...";
        }

        try {
          await chrome.runtime.sendMessage({ type: "FORCE_SYNC" });
          await this.loadData();
          this.renderResponses();
        } catch (error) {
          console.error("Sync failed:", error);
          alert("Sync failed. Please try again.");
        }

        if (button) {
          button.disabled = false;
          button.textContent = "Sync Now";
        }
      });
  }

  private initializeEditor() {
    tinymce.init({
      selector: "#richTextEditor",
      height: 300,
      menubar: false,
      plugins: [
        "advlist",
        "autolink",
        "lists",
        "link",
        "charmap",
        "preview",
        "anchor",
        "searchreplace",
        "visualblocks",
        "code",
        "fullscreen",
        "insertdatetime",
        "media",
        "table",
        "code",
        "help",
        "wordcount",
      ],
      toolbar:
        "undo redo | formatselect | " +
        "bold italic backcolor | alignleft aligncenter " +
        "alignright alignjustify | bullist numlist outdent indent | " +
        "removeformat | help",
      content_style:
        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px }',
      setup: (editor: any) => {
        this.editor = editor;
      },
      // Add GPL license key
      license_key: "gpl",
    });
  }

  private renderResponses() {
    const container = document.getElementById("responsesContainer");
    if (!container) return;

    if (this.responses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No responses yet. Click "New Response" to create one.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.responses
      .map(
        (response) => `
        <div class="response-item" data-id="${response.id}">
          <div class="response-title">${response.title}</div>
          <div class="response-meta">
            ${
              response.websites.length
                ? `Sites: ${response.websites.join(", ")}`
                : "Global"
            }
            · ${response.isHtml ? "HTML" : "Text"}
          </div>
          <div class="response-actions">
            <button class="button small edit-response">Edit</button>
            <button class="button small danger delete-response">Delete</button>
          </div>
        </div>
      `
      )
      .join("");

    // Add event listeners for edit and delete buttons
    container.querySelectorAll(".edit-response").forEach((button) => {
      button.addEventListener("click", (e) => {
        const id = (e.target as Element)
          .closest(".response-item")
          ?.getAttribute("data-id");
        if (id) this.editResponse(id);
        e.stopPropagation();
      });
    });

    container.querySelectorAll(".delete-response").forEach((button) => {
      button.addEventListener("click", (e) => {
        const id = (e.target as Element)
          .closest(".response-item")
          ?.getAttribute("data-id");
        if (id) this.deleteResponse(id);
        e.stopPropagation();
      });
    });
  }

  private filterResponses(searchTerm: string) {
    const filtered = this.responses.filter(
      (response) =>
        response.title.toLowerCase().includes(searchTerm) ||
        response.websites.some((site) =>
          site.toLowerCase().includes(searchTerm)
        )
    );
    this.renderFilteredResponses(filtered);
  }

  private renderFilteredResponses(filtered: CannedResponse[]) {
    const container = document.getElementById("responsesContainer");
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No matching responses found.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map(
        (response) => `
        <div class="response-item" data-id="${response.id}">
          <div class="response-title">${response.title}</div>
          <div class="response-meta">
            ${
              response.websites.length
                ? `Sites: ${response.websites.join(", ")}`
                : "Global"
            }
            · ${response.isHtml ? "HTML" : "Text"}
          </div>
          <div class="response-actions">
            <button class="button small edit-response">Edit</button>
            <button class="button small danger delete-response">Delete</button>
          </div>
        </div>
      `
      )
      .join("");

    // Reattach event listeners
    container.querySelectorAll(".edit-response").forEach((button) => {
      button.addEventListener("click", (e) => {
        const id = (e.target as Element)
          .closest(".response-item")
          ?.getAttribute("data-id");
        if (id) this.editResponse(id);
        e.stopPropagation();
      });
    });

    container.querySelectorAll(".delete-response").forEach((button) => {
      button.addEventListener("click", (e) => {
        const id = (e.target as Element)
          .closest(".response-item")
          ?.getAttribute("data-id");
        if (id) this.deleteResponse(id);
        e.stopPropagation();
      });
    });
  }

  private async updateSettingsUI(data: StorageData) {
    const useGoogleDrive = document.getElementById(
      "useGoogleDrive"
    ) as HTMLInputElement;
    const syncInterval = document.getElementById(
      "syncInterval"
    ) as HTMLInputElement;
    const syncSettings = document.getElementById("syncSettings");
    const lastSyncTime = document.getElementById("lastSyncTime");

    if (useGoogleDrive) {
      useGoogleDrive.checked = data.config.useGoogleDrive;
      useGoogleDrive.addEventListener("change", async (e) => {
        const checkbox = e.target as HTMLInputElement;
        try {
          if (checkbox.checked) {
            await storageService.enableGoogleDrive();
          } else {
            await storageService.disableGoogleDrive();
          }
          await this.loadData();
        } catch (error) {
          console.error("Failed to update Google Drive settings:", error);
          checkbox.checked = !checkbox.checked; // Revert the checkbox
          alert("Failed to update Google Drive settings. Please try again.");
        }
      });
    }

    if (syncInterval) {
      syncInterval.value = data.config.syncInterval.toString();
      syncInterval.addEventListener("change", async () => {
        const newInterval = parseInt(syncInterval.value);
        if (newInterval < 15) {
          syncInterval.value = "15";
          return;
        }

        const newData = await storageService.getStorageData();
        await storageService.saveStorageData({
          ...newData,
          config: {
            ...newData.config,
            syncInterval: newInterval,
          },
        });
      });
    }

    if (syncSettings) {
      syncSettings.style.display = data.config.useGoogleDrive
        ? "block"
        : "none";
    }

    if (lastSyncTime && data.config.lastSync) {
      lastSyncTime.textContent = `Last synced: ${new Date(
        data.config.lastSync
      ).toLocaleString()}`;
    }
  }

  private openEditor(response?: CannedResponse) {
    this.currentResponse = response || null;
    const modal = document.getElementById("editorModal");
    const titleInput = document.getElementById(
      "responseTitle"
    ) as HTMLInputElement;
    const typeSelect = document.getElementById(
      "responseType"
    ) as HTMLSelectElement;
    const websitesList = document.getElementById("websitesList");

    if (modal) modal.style.display = "block";
    if (titleInput) titleInput.value = response?.title || "";
    if (typeSelect) {
      typeSelect.value = response?.isHtml ? "html" : "text";
      this.toggleEditor(response?.isHtml || false);
    }

    if (websitesList) {
      websitesList.innerHTML = "";
      if (response?.websites.length) {
        response.websites.forEach((site) => this.addWebsiteInput(site));
      } else {
        this.addWebsiteInput();
      }
    }

    if (response) {
      if (response.isHtml) {
        this.editor.setContent(response.content);
      } else {
        (
          document.getElementById("responseContent") as HTMLTextAreaElement
        ).value = response.content;
      }
    }
  }

  private closeEditor() {
    const modal = document.getElementById("editorModal");
    if (modal) modal.style.display = "none";
    this.currentResponse = null;
    this.editor.setContent("");
    (document.getElementById("responseContent") as HTMLTextAreaElement).value =
      "";
  }

  private toggleEditor(isHtml: boolean) {
    const plainEditor = document.getElementById("plainTextEditor");
    const richEditor = document.getElementById("richTextEditor");

    if (plainEditor) plainEditor.style.display = isHtml ? "none" : "block";
    if (richEditor) richEditor.style.display = isHtml ? "block" : "none";
  }

  private addWebsiteInput(value: string = "") {
    const websitesList = document.getElementById("websitesList");
    if (!websitesList) return;

    const input = document.createElement("div");
    input.className = "website-input";
    input.innerHTML = `
      <input type="text" value="${value}" placeholder="e.g., example.com">
      <button class="remove-website">&times;</button>
    `;

    input.querySelector(".remove-website")?.addEventListener("click", () => {
      input.remove();
    });

    websitesList.insertBefore(input, websitesList.lastElementChild);
  }

  private async saveResponse() {
    const titleInput = document.getElementById(
      "responseTitle"
    ) as HTMLInputElement;
    const typeSelect = document.getElementById(
      "responseType"
    ) as HTMLSelectElement;
    const websiteInputs = document.querySelectorAll(
      ".website-input input"
    ) as NodeListOf<HTMLInputElement>;

    const title = titleInput.value.trim();
    const isHtml = typeSelect.value === "html";
    const websites = Array.from(websiteInputs)
      .map((input) => input.value.trim())
      .filter(Boolean);

    const content = isHtml
      ? this.editor.getContent()
      : (document.getElementById("responseContent") as HTMLTextAreaElement)
          .value;

    if (!title || !content) {
      alert("Please fill in all required fields");
      return;
    }

    const response: CannedResponse = {
      id: this.currentResponse?.id || crypto.randomUUID(),
      title,
      content,
      isHtml,
      websites,
      createdAt: this.currentResponse?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = await storageService.getStorageData();
    const responses = this.currentResponse
      ? data.responses.map((r) => (r.id === response.id ? response : r))
      : [...data.responses, response];

    await storageService.saveStorageData({
      ...data,
      responses,
    });

    this.responses = responses;
    this.renderResponses();
    this.closeEditor();
  }

  private async deleteResponse(id: string) {
    if (!confirm("Are you sure you want to delete this response?")) return;

    const data = await storageService.getStorageData();
    const responses = data.responses.filter((r) => r.id !== id);

    await storageService.saveStorageData({
      ...data,
      responses,
    });

    this.responses = responses;
    this.renderResponses();
  }

  private async editResponse(id: string) {
    const response = this.responses.find((r) => r.id === id);
    if (response) {
      this.openEditor(response);
    }
  }

  private updateSyncStatus() {
    const lastSyncTime = document.getElementById("lastSyncTime");
    if (!lastSyncTime) return;

    chrome.storage.local.get("config", (result) => {
      if (result.config?.lastSync) {
        lastSyncTime.textContent = `Last synced: ${new Date(
          result.config.lastSync
        ).toLocaleString()}`;
      }
    });
  }
}

// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
