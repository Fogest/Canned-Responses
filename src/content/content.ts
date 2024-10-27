// src/content/content.ts

interface ResponsePickerOptions {
  responses: Array<{
    id: string;
    title: string;
    content: string;
    isHtml: boolean;
  }>;
}

class ResponsePicker {
  private container: HTMLDivElement;
  private activeElement: HTMLElement | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 999999;
      display: none;
    `;
    document.body.appendChild(this.container);

    // Close picker when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.hide();
      }
    });
  }

  show(options: ResponsePickerOptions, element: HTMLElement) {
    this.activeElement = element;
    this.container.innerHTML = options.responses
      .map(
        (response) => `
          <div class="response-item" 
               data-id="${response.id}"
               style="padding: 8px 12px; cursor: pointer; hover:background-color: #f5f5f5;">
            ${response.title}
          </div>
        `
      )
      .join("");

    // Position the picker near the element
    const rect = element.getBoundingClientRect();
    this.container.style.top = `${rect.bottom + window.scrollY}px`;
    this.container.style.left = `${rect.left + window.scrollX}px`;
    this.container.style.display = "block";

    // Add click handlers
    this.container.querySelectorAll(".response-item").forEach((item) => {
      item.addEventListener("click", () => {
        const response = options.responses.find(
          (r) => r.id === item.getAttribute("data-id")
        );
        if (response && this.activeElement) {
          this.insertResponse(response);
          this.hide();
        }
      });
    });
  }

  hide() {
    this.container.style.display = "none";
    this.activeElement = null;
  }

  private insertResponse(response: ResponsePickerOptions["responses"][0]) {
    if (!this.activeElement) return;

    if (response.isHtml) {
      // Handle HTML content
      if (this.activeElement instanceof HTMLElement) {
        if ("contentEditable" in this.activeElement) {
          this.activeElement.innerHTML += response.content;
        } else {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(this.activeElement);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
          document.execCommand("insertHTML", false, response.content);
        }
      }
    } else {
      // Handle plain text
      if (
        this.activeElement instanceof HTMLInputElement ||
        this.activeElement instanceof HTMLTextAreaElement
      ) {
        const start = this.activeElement.selectionStart || 0;
        const end = this.activeElement.selectionEnd || 0;
        this.activeElement.value =
          this.activeElement.value.substring(0, start) +
          response.content +
          this.activeElement.value.substring(end);
        this.activeElement.selectionStart = this.activeElement.selectionEnd =
          start + response.content.length;
      }
    }
  }
}

// Initialize response picker
const picker = new ResponsePicker();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SHOW_RESPONSE_PICKER") {
    const activeElement = document.activeElement as HTMLElement;
    picker.show(message, activeElement);
  }
});
