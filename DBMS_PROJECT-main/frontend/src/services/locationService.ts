import { apiClient } from './apiClient';
import {
  BuildingSummary,
  LocationStats,
  ReferenceLocation,
  RoomCreatePayload,
  RoomUpdatePayload,
} from '../types';

export const locationService = {
  async getStats(): Promise<LocationStats> {
    const response = await apiClient.get<LocationStats>('/locations/stats');
    return response.data;
  },

  async getBuildings(): Promise<BuildingSummary[]> {
    const response = await apiClient.get<BuildingSummary[]>('/locations/buildings');
    return response.data;
  },

  async getBuildingRooms(buildingId: string): Promise<ReferenceLocation[]> {
    const response = await apiClient.get<ReferenceLocation[]>(
      `/locations/buildings/${buildingId}/rooms`
    );
    return response.data;
  },

  async getAllLocations(params?: {
    location_type?: string;
    parent_location_id?: string;
    search?: string;
  }): Promise<ReferenceLocation[]> {
    const response = await apiClient.get<ReferenceLocation[]>('/locations', { params });
    return response.data;
  },

  async createRoom(payload: RoomCreatePayload): Promise<ReferenceLocation> {
    const response = await apiClient.post<ReferenceLocation>('/locations/rooms', payload);
    return response.data;
  },

  async updateRoom(
    locationId: string,
    payload: RoomUpdatePayload
  ): Promise<ReferenceLocation> {
    const response = await apiClient.patch<ReferenceLocation>(
      `/locations/${locationId}`,
      payload
    );
    return response.data;
  },

  async deleteRoom(locationId: string): Promise<void> {
    await apiClient.delete(`/locations/${locationId}`);
  },
};
