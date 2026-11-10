import { apiClient } from './apiClient';
import { ImpactCreate, ImpactRead, ImpactUpdate } from '../types';

export const impactService = {
  async addImpact(eventId: string, payload: ImpactCreate): Promise<ImpactRead> {
    const response = await apiClient.post<ImpactRead>(`/events/${eventId}/impacts`, payload);
    return response.data;
  },

  async listImpacts(eventId: string): Promise<ImpactRead[]> {
    const response = await apiClient.get<ImpactRead[]>(`/events/${eventId}/impacts`);
    return response.data;
  },

  async updateImpact(impactId: string, payload: ImpactUpdate): Promise<ImpactRead> {
    const response = await apiClient.patch<ImpactRead>(`/impacts/${impactId}`, payload);
    return response.data;
  },
};

