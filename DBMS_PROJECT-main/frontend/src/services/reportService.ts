import { apiClient } from './apiClient';
import {
  DashboardSummary,
  EventInvestigationReport,
  EventSummaryReport,
  RecurrenceReport,
} from '../types';

export const reportService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },

  async getRecurrenceReport(
    startedAfter: string,
    startedBefore: string,
    categoryCode?: string
  ): Promise<RecurrenceReport> {
    const response = await apiClient.get<RecurrenceReport>('/analytics/recurrence', {
      params: {
        started_after: startedAfter,
        started_before: startedBefore,
        category_code: categoryCode || undefined,
      },
    });
    return response.data;
  },

  async getEventSummaryReport(
    startedAfter: string,
    startedBefore: string
  ): Promise<EventSummaryReport> {
    const response = await apiClient.get<EventSummaryReport>('/reports/event-summary', {
      params: {
        started_after: startedAfter,
        started_before: startedBefore,
      },
    });
    return response.data;
  },

  async getEventInvestigationReport(eventId: string): Promise<EventInvestigationReport> {
    const response = await apiClient.get<EventInvestigationReport>(
      `/reports/event-investigation/${eventId}`
    );
    return response.data;
  },
};

