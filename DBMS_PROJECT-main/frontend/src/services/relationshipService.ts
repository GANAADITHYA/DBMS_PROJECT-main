import { apiClient } from './apiClient';
import {
  RelationshipCreate,
  RelationshipHistoryItem,
  RelationshipRead,
} from '../types';

export const relationshipService = {
  async createRelationship(payload: RelationshipCreate): Promise<RelationshipRead> {
    const response = await apiClient.post<RelationshipRead>('/relationships', payload);
    return response.data;
  },

  async listEventRelationships(
    eventId: string,
    direction?: 'incoming' | 'outgoing',
    statusCode?: string
  ): Promise<RelationshipRead[]> {
    const response = await apiClient.get<RelationshipRead[]>(`/events/${eventId}/relationships`, {
      params: { direction, status_code: statusCode },
    });
    return response.data;
  },

  async getRelationshipHistory(relationshipId: string): Promise<RelationshipHistoryItem[]> {
    const response = await apiClient.get<RelationshipHistoryItem[]>(
      `/relationships/${relationshipId}/history`
    );
    return response.data;
  },

  async confirmRelationship(relationshipId: string, reason: string): Promise<RelationshipRead> {
    const response = await apiClient.post<RelationshipRead>(
      `/relationships/${relationshipId}/confirm`,
      { reason }
    );
    return response.data;
  },

  async downgradeRelationship(
    relationshipId: string,
    statusCode: 'suspected' | 'rejected_unrelated',
    reason: string
  ): Promise<RelationshipRead> {
    const response = await apiClient.post<RelationshipRead>(
      `/relationships/${relationshipId}/downgrade`,
      { status_code: statusCode, reason }
    );
    return response.data;
  },
};

