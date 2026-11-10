import { apiClient } from './apiClient';
import {
  ReferenceAsset,
  ReferenceCategory,
  ReferenceDataClass,
  ReferenceDepartment,
  ReferenceEvidenceType,
  ReferenceEventType,
  ReferenceImpactType,
  ReferenceLocation,
  ReferenceMeasurementUnit,
  ReferenceRelationshipStatus,
  ReferenceScheduledActivity,
  ReferenceService,
  ReferenceSeverityLevel,
  ReferenceStatus,
  ReferenceStatusTransition,
} from '../types';

// Simple in-memory cache to prevent repeated reference data fetches
const cache: Record<string, any[]> = {};

export const referenceService = {
  async getReference<T = any>(name: string, forceFresh = false): Promise<T[]> {
    if (!forceFresh && cache[name]) {
      return cache[name] as T[];
    }
    const response = await apiClient.get<T[]>(`/reference/${name}`);
    cache[name] = response.data;
    return response.data;
  },

  getCategories(): Promise<ReferenceCategory[]> {
    return this.getReference<ReferenceCategory>('event_categories');
  },

  getEventTypes(): Promise<ReferenceEventType[]> {
    return this.getReference<ReferenceEventType>('event_types');
  },

  getStatuses(): Promise<ReferenceStatus[]> {
    return this.getReference<ReferenceStatus>('event_statuses');
  },

  getStatusTransitions(): Promise<ReferenceStatusTransition[]> {
    return this.getReference<ReferenceStatusTransition>('status_transitions');
  },

  getSeverityLevels(): Promise<ReferenceSeverityLevel[]> {
    return this.getReference<ReferenceSeverityLevel>('severity_levels');
  },

  getRelationshipStatuses(): Promise<ReferenceRelationshipStatus[]> {
    return this.getReference<ReferenceRelationshipStatus>('relationship_statuses');
  },

  getEvidenceTypes(): Promise<ReferenceEvidenceType[]> {
    return this.getReference<ReferenceEvidenceType>('evidence_types');
  },

  getImpactTypes(): Promise<ReferenceImpactType[]> {
    return this.getReference<ReferenceImpactType>('impact_types');
  },

  getMeasurementUnits(): Promise<ReferenceMeasurementUnit[]> {
    return this.getReference<ReferenceMeasurementUnit>('measurement_units');
  },

  getDataClasses(): Promise<ReferenceDataClass[]> {
    return this.getReference<ReferenceDataClass>('data_classes');
  },

  getDepartments(): Promise<ReferenceDepartment[]> {
    return this.getReference<ReferenceDepartment>('departments');
  },

  getLocations(): Promise<ReferenceLocation[]> {
    return this.getReference<ReferenceLocation>('locations');
  },

  getAssets(): Promise<ReferenceAsset[]> {
    return this.getReference<ReferenceAsset>('assets');
  },

  getServices(): Promise<ReferenceService[]> {
    return this.getReference<ReferenceService>('services');
  },

  getScheduledActivities(): Promise<ReferenceScheduledActivity[]> {
    return this.getReference<ReferenceScheduledActivity>('scheduled_activities');
  },

  clearCache() {
    for (const key of Object.keys(cache)) {
      delete cache[key];
    }
  },
};

