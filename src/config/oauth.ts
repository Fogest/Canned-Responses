// src/config/oauth.ts

export const GOOGLE_CONFIG = {
  // You'll get these values from Google Cloud Console
  CLIENT_ID:
    "407946043666-thlofogbftj8jl5mrmtii4oqq7n65oml.apps.googleusercontent.com",
  API_KEY: "AIzaSyBsbo52sTXz-Q9RzM57EnmNjqSS6j7Ff3k",
  // These are the permissions we need
  SCOPES: [
    "https://www.googleapis.com/auth/drive.file", // Permission to create/modify specific files
    "https://www.googleapis.com/auth/drive.appdata", // Permission to store app-specific data
  ],
  // Discovery docs for the Google Drive API
  DISCOVERY_DOCS: [
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
  ],
};
