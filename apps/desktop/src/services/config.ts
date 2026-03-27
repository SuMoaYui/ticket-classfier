/**
 * API Configuration — defaults that can be overridden via Electron IPC persistence.
 */

/** Default backend URL (local dev server) */
export const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

/** Default API key (empty — user must configure) */
export const DEFAULT_API_KEY = '';

/**
 * Runtime config holder.  Updated from persisted values on app start.
 */
export const apiConfig = {
  baseUrl: DEFAULT_API_BASE_URL,
  apiKey: DEFAULT_API_KEY,
};

/**
 * Update the runtime config (called after reading persisted values from Electron).
 */
export function setApiConfig(baseUrl: string, apiKey: string): void {
  apiConfig.baseUrl = baseUrl || DEFAULT_API_BASE_URL;
  apiConfig.apiKey = apiKey || DEFAULT_API_KEY;
}
