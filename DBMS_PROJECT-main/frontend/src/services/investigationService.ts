import { apiClient } from './apiClient';
import { BlastRadiusResult, InvestigationResult } from '../types';

export const investigationService = {
  async getRootCauses(
    eventId: string,
    linkMode: 'confirmed_only' | 'include_suspected' = 'confirmed_only'
  ): Promise<InvestigationResult> {
    const response = await apiClient.get<InvestigationResult>(
      `/events/${eventId}/root-causes`,
      { params: { link_mode: linkMode } }
    );
    return response.data;
  },

  async getBlastRadius(
    eventId: string,
    linkMode: 'confirmed_only' | 'include_suspected' = 'confirmed_only'
  ): Promise<BlastRadiusResult> {
    const response = await apiClient.get<BlastRadiusResult>(
      `/events/${eventId}/blast-radius`,
      { params: { link_mode: linkMode } }
    );
    return response.data;
  },
};

