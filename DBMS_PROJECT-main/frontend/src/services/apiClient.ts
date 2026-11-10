import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { BackendErrorResponse } from '../types';

// The backend endpoints are under /api/v1
// Normalize base URL: if user provides http://127.0.0.1:8000 or http://127.0.0.1:8000/api/v1, standardize to ending with /api/v1
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
export const API_BASE_URL = rawBaseUrl.endsWith('/api/v1')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api/v1`;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

export const TOKEN_STORAGE_KEY = 'campus_memory_access_token';
export const USER_STORAGE_KEY = 'campus_memory_user';

// Request interceptor: attach Bearer token and optional request ID
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract error message and handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<BackendErrorResponse>) => {
    if (error.response?.status === 401) {
      // Clear token and fire session expired event if unauthenticated
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts a friendly, accurate error message from the backend error structure.
 */
export function extractErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred'): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<BackendErrorResponse>;
    const responseData = axiosErr.response?.data;

    // Backend error structure: { error: { code, message, request_id, details } }
    if (responseData?.error?.message) {
      const issues = responseData.error.details?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const issueDescriptions = issues
          .map((iss) => {
            const field = Array.isArray(iss.loc) ? iss.loc.join('.') : '';
            return field ? `${field}: ${iss.msg}` : iss.msg;
          })
          .filter(Boolean)
          .join('; ');
        if (issueDescriptions) {
          return `${responseData.error.message} (${issueDescriptions})`;
        }
      }
      return responseData.error.message;
    }

    // Standard FastAPI error fallback: { detail: ... }
    const anyData = responseData as any;
    if (anyData?.detail) {
      if (typeof anyData.detail === 'string') return anyData.detail;
      if (Array.isArray(anyData.detail)) {
        return anyData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      }
    }

    if (axiosErr.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (axiosErr.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    if (axiosErr.response?.status === 409) {
      return 'Operation conflict. A constraint or requirement was not met.';
    }
    if (axiosErr.response?.status === 503) {
      return 'Backend or database service is temporarily unavailable.';
    }
    if (axiosErr.message === 'Network Error') {
      return 'Cannot reach the backend server. Please verify FastAPI is running at ' + API_BASE_URL;
    }
    return axiosErr.message || fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

