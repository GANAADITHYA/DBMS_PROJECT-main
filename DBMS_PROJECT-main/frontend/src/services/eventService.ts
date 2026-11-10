import { apiClient } from './apiClient';
import {
  EventAsOfItem,
  EventCreate,
  EventDetail,
  EventListQueryParams,
  EventStatusHistoryItem,
  EventSummary,
  EventUpdate,
  Page,
} from '../types';

export const eventService = {
  async listEvents(params?: EventListQueryParams): Promise<Page<EventSummary>> {
    const response = await apiClient.get<Page<EventSummary>>('/events', { params });
    return response.data;
  },

  async getEvent(eventId: string): Promise<EventDetail> {
    const response = await apiClient.get<EventDetail>(`/events/${eventId}`);
    return response.data;
  },

  async createEvent(payload: EventCreate): Promise<EventDetail> {
    const response = await apiClient.post<EventDetail>('/events', payload);
    return response.data;
  },

  async updateEvent(eventId: string, payload: EventUpdate): Promise<EventDetail> {
    const response = await apiClient.patch<EventDetail>(`/events/${eventId}`, payload);
    return response.data;
  },

  async changeStatus(eventId: string, statusCode: string, reason: string): Promise<EventDetail> {
    const response = await apiClient.patch<EventDetail>(`/events/${eventId}/status`, {
      status_code: statusCode,
      reason,
    });
    return response.data;
  },

  async closeEvent(eventId: string, reason: string): Promise<EventDetail> {
    const response = await apiClient.post<EventDetail>(`/events/${eventId}/close`, { reason });
    return response.data;
  },

  async voidEvent(eventId: string, reason: string): Promise<EventDetail> {
    const response = await apiClient.post<EventDetail>(`/events/${eventId}/void`, { reason });
    return response.data;
  },

  async getStatusHistory(eventId: string): Promise<EventStatusHistoryItem[]> {
    const response = await apiClient.get<EventStatusHistoryItem[]>(`/events/${eventId}/status-history`);
    return response.data;
  },

  async getEventsAsOf(params: {
    at: string;
    status_code?: string;
    category_code?: string;
    page?: number;
    page_size?: number;
  }): Promise<Page<EventAsOfItem>> {
    const response = await apiClient.get<Page<EventAsOfItem>>('/events/as-of', { params });
    return response.data;
  },
};

