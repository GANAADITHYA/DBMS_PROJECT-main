import { apiClient, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './apiClient';
import {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  User,
} from '../types';

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload);
    const data = response.data;
    if (data.access_token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.application_user));
    }
    return data;
  },

  async signup(payload: SignupRequest): Promise<SignupResponse> {
    const response = await apiClient.post<SignupResponse>('/auth/signup', payload);
    const data = response.data;
    if (data.access_token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.application_user));
    }
    return data;
  },

  getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    const response = await apiClient.get('/health');
    return response.data;
  },

  async checkReadiness(): Promise<{ status: string }> {
    const response = await apiClient.get('/health/ready');
    return response.data;
  },
};

