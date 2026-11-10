import { apiClient } from './apiClient';
import { EvidenceCreate, EvidenceRead } from '../types';

export const evidenceService = {
  async addEvidence(relationshipId: string, payload: EvidenceCreate): Promise<EvidenceRead> {
    const response = await apiClient.post<EvidenceRead>(
      `/relationships/${relationshipId}/evidence`,
      payload
    );
    return response.data;
  },
};

