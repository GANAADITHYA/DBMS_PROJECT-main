// TypeScript definitions matching CAMPUS MEMORY backend Pydantic schemas

export type UserRole =
  | 'administrator'
  | 'event_reporter'
  | 'event_investigator'
  | 'decision_maker';

export interface User {
  user_id: string;
  email: string;
  display_name: string;
  roles: string[];
  is_active?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  display_name: string;
  role_code: 'event_reporter';
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
  expires_in?: number | null;
  application_user: User;
}

export interface SignupResponse {
  status: string;
  message: string;
  user_id: string;
  email_confirmation_required: boolean;
  access_token?: string | null;
  refresh_token?: string | null;
  token_type?: string | null;
  expires_in?: number | null;
  application_user: User;
}

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface EventSummary {
  event_id: string;
  event_code: string;
  title: string;
  category_code: string;
  category_name?: string | null;
  event_type_id: string;
  event_type_name?: string | null;
  severity_code: string;
  severity_name?: string | null;
  status_code: string;
  status_name?: string | null;
  is_terminal?: boolean | null;
  location_id?: string | null;
  location_name?: string | null;
  asset_id?: string | null;
  asset_name?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  started_at: string;
  ended_at?: string | null;
  created_by: string;
  created_at: string;
}

export interface EventDetail extends EventSummary {
  description: string;
  scheduled_activity_id?: string | null;
  scheduled_activity_title?: string | null;
  data_class_code: string;
  source_note?: string | null;
  last_modified_by: string;
  updated_at: string;
}

export interface EventCreate {
  event_code: string;
  title: string;
  description: string;
  category_code: string;
  event_type_id: string;
  severity_code: string;
  location_id?: string | null;
  asset_id?: string | null;
  service_id?: string | null;
  scheduled_activity_id?: string | null;
  started_at: string;
  data_class_code: string;
}

export interface EventUpdate {
  title?: string | null;
  description?: string | null;
  category_code?: string | null;
  event_type_id?: string | null;
  severity_code?: string | null;
  location_id?: string | null;
  asset_id?: string | null;
  service_id?: string | null;
  scheduled_activity_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  source_note?: string | null;
}

export interface EventStatusChange {
  status_code: string;
  reason: string;
}

export interface EventStatusHistoryItem {
  history_id: string;
  event_id: string;
  old_status_code: string | null;
  new_status_code: string;
  changed_at: string;
  changed_by: string;
  reason: string;
  is_initial: boolean;
}

export interface EventAsOfItem {
  event_id: string;
  event_code: string;
  title: string;
  status_as_recorded: string;
  status_recorded_at: string;
  history_reason: string;
  reconstruction_note: string;
}

export interface EventListQueryParams {
  category_code?: string;
  event_type_id?: string;
  status_code?: string;
  severity_code?: string;
  location_id?: string;
  asset_id?: string;
  service_id?: string;
  started_after?: string;
  started_before?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface RelationshipRead {
  relationship_id: string;
  cause_event_id: string;
  cause_event_code?: string | null;
  cause_title?: string | null;
  effect_event_id: string;
  effect_event_code?: string | null;
  effect_title?: string | null;
  relationship_status_code: string;
  confidence_score: number | string;
  explanation: string;
  temporal_override_reason?: string | null;
  data_class_code: string;
  created_by: string;
  created_at: string;
  last_modified_by: string;
  updated_at: string;
  evidence_count?: number | null;
}

export interface RelationshipCreate {
  cause_event_id: string;
  effect_event_id: string;
  confidence_score: number;
  explanation: string;
  temporal_override_reason?: string | null;
  data_class_code: string;
}

export interface RelationshipHistoryItem {
  history_id: string;
  relationship_id: string;
  change_kind: string;
  old_status_code: string | null;
  new_status_code: string | null;
  old_confidence: number | null;
  new_confidence: number | null;
  changed_at: string;
  changed_by: string;
  reason: string;
}

export interface EvidenceRead {
  evidence_id: string;
  relationship_id: string;
  evidence_type_code: string;
  description: string;
  source_reference?: string | null;
  source_url?: string | null;
  recorded_by: string;
  recorded_at: string;
  data_class_code: string;
}

export interface EvidenceCreate {
  evidence_type_code: string;
  description: string;
  source_reference?: string | null;
  source_url?: string | null;
  data_class_code: string;
}

export interface ImpactRead {
  impact_id: string;
  event_id: string;
  impact_type_code: string;
  impact_type_name?: string | null;
  affected_location_id?: string | null;
  affected_asset_id?: string | null;
  affected_service_id?: string | null;
  affected_activity_id?: string | null;
  affected_department_id?: string | null;
  affected_object_description?: string | null;
  quantity: number | string;
  unit_code: string;
  unit_name?: string | null;
  verification_status: 'verified' | 'estimated';
  estimate_basis?: string | null;
  recorded_by: string;
  recorded_at: string;
  data_class_code: string;
}

export interface ImpactCreate {
  impact_type_code: string;
  affected_location_id?: string | null;
  affected_asset_id?: string | null;
  affected_service_id?: string | null;
  affected_activity_id?: string | null;
  affected_department_id?: string | null;
  affected_object_description?: string | null;
  quantity: number;
  unit_code: string;
  verification_status: 'verified' | 'estimated';
  estimate_basis?: string | null;
  data_class_code: string;
}

export interface ImpactUpdate {
  quantity?: number;
  unit_code?: string;
  verification_status?: 'verified' | 'estimated';
  estimate_basis?: string | null;
  affected_object_description?: string | null;
}

export interface ImpactAggregateItem {
  affected_object_key: string;
  impact_type_code: string;
  impact_type_name: string;
  unit_code: string;
  unit_name: string;
  verification_status: string;
  headline_quantity: number | string;
  impact_record_count: number;
  impact_ids: string[];
  possible_duplicate_impact_ids: string[];
  aggregation_note: string;
}

export interface TraversalNode {
  event_id: string;
  event_code: string;
  title: string;
  minimum_depth: number;
  path_event_ids: string[];
}

export interface InvestigationResult {
  start_event_id: string;
  link_mode: 'confirmed_only' | 'include_suspected';
  uniqueness_note: string;
  nodes: TraversalNode[];
}

export interface BlastRadiusResult extends InvestigationResult {
  impacts: ImpactAggregateItem[];
  impact_grouping_note: string;
}

export interface NamedCount {
  code: string;
  display_name: string;
  event_count: number;
}

export interface DashboardSummary {
  open_event_count: number;
  open_by_category: NamedCount[];
  open_by_severity: NamedCount[];
  recent_open_events: EventSummary[];
}

export interface RecurrenceItem {
  object_kind: string;
  object_id: string;
  object_code: string;
  object_name: string;
  event_count: number;
}

export interface RecurrenceReport {
  started_after: string;
  started_before: string;
  locations: RecurrenceItem[];
  assets: RecurrenceItem[];
  note: string;
}

export interface EventSummaryGroup {
  category_code: string;
  category_name: string;
  status_code: string;
  status_name: string;
  event_count: number;
}

export interface EventSummaryReport {
  started_after: string;
  started_before: string;
  groups: EventSummaryGroup[];
  total_events: number;
}

export interface EventInvestigationReport {
  event: EventDetail;
  reconstruction_limitation: string;
  root_causes: InvestigationResult;
  blast_radius: BlastRadiusResult;
  evidence: EvidenceRead[];
  raw_impact_totals_by_type_unit: any[];
}

// Reference Data Definitions
export interface ReferenceCategory {
  code: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

export interface ReferenceEventType {
  event_type_id: string;
  category_code: string;
  type_code: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

export interface ReferenceStatus {
  code: string;
  display_name: string;
  description: string;
  is_terminal: boolean;
  is_active: boolean;
}

export interface ReferenceStatusTransition {
  from_status_code: string;
  to_status_code: string;
  requires_reason: boolean;
  is_active: boolean;
  description: string;
}

export interface ReferenceSeverityLevel {
  code: string;
  display_name: string;
  severity_rank: number;
  description: string;
  is_active: boolean;
}

export interface ReferenceRelationshipStatus {
  code: string;
  display_name: string;
  description: string;
  is_traversable: boolean;
  is_active: boolean;
}

export interface ReferenceEvidenceType {
  code: string;
  display_name: string;
  description: string;
  requires_reference: boolean;
  is_active: boolean;
}

export interface ReferenceImpactType {
  code: string;
  display_name: string;
  description: string;
  default_unit_code: string;
  is_active: boolean;
}

export interface ReferenceMeasurementUnit {
  code: string;
  display_name: string;
  symbol: string;
  dimension_code: string;
  decimal_places: number;
  is_active: boolean;
}

export interface ReferenceDataClass {
  code: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

export interface ReferenceDepartment {
  department_id: string;
  department_code: string;
  name: string;
  is_active: boolean;
}

export interface ReferenceLocation {
  location_id: string;
  location_code: string;
  name: string;
  location_type: string;
  parent_location_id: string | null;
  parent_name?: string | null;
  map_number?: number | null;
  floor_number?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface BuildingSummary {
  location_id: string;
  location_code: string;
  name: string;
  location_type: string;
  map_number: number | null;
  description?: string | null;
  is_active: boolean;
  room_count: number;
  floors: string[];
}

export interface LocationStats {
  total_locations: number;
  total_buildings: number;
  total_classrooms: number;
  total_laboratories: number;
  total_floors: number;
  total_facilities: number;
  total_rooms: number;
}

export interface RoomCreatePayload {
  parent_location_id: string;
  name: string;
  location_code: string;
  location_type: string;
  floor_number: string;
  department_id?: string | null;
  description?: string | null;
}

export interface RoomUpdatePayload {
  name?: string;
  location_code?: string;
  location_type?: string;
  floor_number?: string;
  department_id?: string | null;
  description?: string | null;
}

export interface ReferenceAsset {
  asset_id: string;
  asset_code: string;
  name: string;
  asset_type: string;
  location_id: string | null;
  asset_status: string;
}

export interface ReferenceService {
  service_id: string;
  service_code: string;
  name: string;
  service_type: string;
  service_status: string;
}

export interface ReferenceScheduledActivity {
  scheduled_activity_id: string;
  activity_code: string;
  title: string;
  course_code: string | null;
  starts_at: string;
  ends_at: string;
  activity_status: string;
}

export interface BackendErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: {
      issues?: Array<{
        type?: string;
        loc?: (string | number)[];
        msg?: string;
        ctx?: Record<string, any>;
      }>;
      [key: string]: any;
    };
  };
}

