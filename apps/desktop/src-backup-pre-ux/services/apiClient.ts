import { apiConfig } from './config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// ─── Client ─────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  body?: unknown;
}

/**
 * Build the full URL with query parameters.
 */
function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${apiConfig.baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

/**
 * Core fetch wrapper with retry logic.
 */
async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<ApiSuccessResponse<T>> {
  const url = buildUrl(path, options.params);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiConfig.apiKey) {
    headers['X-API-Key'] = apiConfig.apiKey;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  let lastError: Error | null = null;
  const maxRetries = 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      const json = (await response.json()) as ApiResponse<T>;

      if (!json.success) {
        const errorResp = json as ApiErrorResponse;
        throw new ApiError(
          errorResp.error.message,
          errorResp.error.code,
          response.status,
        );
      }

      return json as ApiSuccessResponse<T>;
    } catch (error) {
      lastError = error as Error;

      // Only retry on network errors, not on API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Wait briefly before retry
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error('Request failed');
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>('GET', path, { params }),

  post: <T>(path: string, body: unknown) =>
    request<T>('POST', path, { body }),

  put: <T>(path: string, body: unknown) =>
    request<T>('PUT', path, { body }),

  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};
