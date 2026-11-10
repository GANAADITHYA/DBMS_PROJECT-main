import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Building,
  Calendar,
  CheckCircle2,
  Edit,
  ExternalLink,
  FileCheck,
  FileSearch,
  GitBranch,
  History,
  Plus,
  RefreshCw,
  Shield,
  XCircle,
  Zap,
} from 'lucide-react';
import { eventService } from '../../services/eventService';
import { relationshipService } from '../../services/relationshipService';
import { impactService } from '../../services/impactService';
import { evidenceService } from '../../services/evidenceService';
import { investigationService } from '../../services/investigationService';
import { referenceService } from '../../services/referenceService';
import {
  EventDetail,
  EventStatusHistoryItem,
  ImpactRead,
  InvestigationResult,
  ReferenceStatusTransition,
  RelationshipRead,
} from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import {
  formatConfidence,
  formatDate,
  getSeverityBadgeProps,
  getStatusBadgeProps,
} from '../../utils/formatters';

export const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  // Core Data
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [historyItems, setHistoryItems] = useState<EventStatusHistoryItem[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRead[]>([]);
  const [impacts, setImpacts] = useState<ImpactRead[]>([]);
  const [rootCauses, setRootCauses] = useState<InvestigationResult | null>(null);
  const [validTransitions, setValidTransitions] = useState<ReferenceStatusTransition[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'impacts' | 'investigation' | 'history'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Close / Void Modal State
  const [terminalModalType, setTerminalModalType] = useState<'close' | 'void' | null>(null);
  const [terminalReason, setTerminalReason] = useState('');
  const [isTerminalSubmitting, setIsTerminalSubmitting] = useState(false);

  // Add Impact Modal State
  const [addImpactOpen, setAddImpactOpen] = useState(false);
  const [impactTypeCode, setImpactTypeCode] = useState('');
  const [impactQty, setImpactQty] = useState('1');
  const [impactUnitCode, setImpactUnitCode] = useState('');
  const [impactVerifStatus, setImpactVerifStatus] = useState<'verified' | 'estimated'>('verified');
  const [impactEstimateBasis, setImpactEstimateBasis] = useState('');
  const [impactObjectDesc, setImpactObjectDesc] = useState('');
  const [impactTypes, setImpactTypes] = useState<any[]>([]);
  const [measurementUnits, setMeasurementUnits] = useState<any[]>([]);
  const [isSubmittingImpact, setIsSubmittingImpact] = useState(false);

  // Add Evidence Modal State (attached to a relationship)
  const [evidenceModalRelId, setEvidenceModalRelId] = useState<string | null>(null);
  const [evidenceTypeCode, setEvidenceTypeCode] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceTypes, setEvidenceTypes] = useState<any[]>([]);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  // Relationship Confirm / Downgrade Modal State
  const [relActionModal, setRelActionModal] = useState<{
    relId: string;
    type: 'confirm' | 'downgrade';
  } | null>(null);
  const [relActionReason, setRelActionReason] = useState('');
  const [relDowngradeStatus, setRelDowngradeStatus] = useState<'suspected' | 'rejected_unrelated'>('suspected');
  const [isSubmittingRelAction, setIsSubmittingRelAction] = useState(false);

  const loadAllEventData = async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [evtData, histData, relsData, impsData, transitions] = await Promise.all([
        eventService.getEvent(eventId),
        eventService.getStatusHistory(eventId).catch(() => []),
        relationshipService.listEventRelationships(eventId).catch(() => []),
        impactService.listImpacts(eventId).catch(() => []),
        referenceService.getStatusTransitions().catch(() => []),
      ]);

      setEvent(evtData);
      setHistoryItems(histData);
      setRelationships(relsData);
      setImpacts(impsData);

      // Find valid transitions from current status
      const currStatus = evtData.status_code;
      const available = transitions.filter(
        (t) => t.from_status_code === currStatus && t.is_active
      );
      setValidTransitions(available);
      if (available.length > 0) {
        setTargetStatus(available[0].to_status_code);
      }

      // Pre-load reference lists for impacts and evidence
      const [impTypes, units, evTypes] = await Promise.all([
        referenceService.getImpactTypes().catch(() => []),
        referenceService.getMeasurementUnits().catch(() => []),
        referenceService.getEvidenceTypes().catch(() => []),
      ]);
      setImpactTypes(impTypes);
      setMeasurementUnits(units);
      setEvidenceTypes(evTypes);
      if (impTypes.length > 0) {
        setImpactTypeCode(impTypes[0].code);
        setImpactUnitCode(impTypes[0].default_unit_code || (units[0]?.code || 'count'));
      }
      if (evTypes.length > 0) {
        setEvidenceTypeCode(evTypes[0].code);
      }

      // Root causes for investigation
      investigationService
        .getRootCauses(eventId, 'confirmed_only')
        .then((rc) => setRootCauses(rc))
        .catch(() => setRootCauses(null));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load incident record.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllEventData();
  }, [eventId]);

  // Handle Non-terminal Status Change
  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !targetStatus || !statusReason.trim()) return;

    setIsUpdatingStatus(true);
    setError(null);
    try {
      const updated = await eventService.changeStatus(eventId, targetStatus, statusReason.trim());
      setEvent(updated);
      setStatusModalOpen(false);
      setStatusReason('');
      setSuccessMessage(`Status updated to ${targetStatus}.`);
      loadAllEventData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update event status.'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Terminal Close / Void
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !terminalModalType || !terminalReason.trim()) return;

    setIsTerminalSubmitting(true);
    setError(null);
    try {
      let updated: EventDetail;
      if (terminalModalType === 'close') {
        updated = await eventService.closeEvent(eventId, terminalReason.trim());
        setSuccessMessage('Incident has been officially closed.');
      } else {
        updated = await eventService.voidEvent(eventId, terminalReason.trim());
        setSuccessMessage('Incident has been marked void in provenance history.');
      }
      setEvent(updated);
      setTerminalModalType(null);
      setTerminalReason('');
      loadAllEventData();
    } catch (err) {
      setError(extractErrorMessage(err, `Failed to ${terminalModalType} event.`));
    } finally {
      setIsTerminalSubmitting(false);
    }
  };

  // Handle Add Impact
  const handleAddImpactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    if (impactVerifStatus === 'estimated' && !impactEstimateBasis.trim()) {
      setError('An estimate basis is mandatory when verification status is estimated.');
      return;
    }

    setIsSubmittingImpact(true);
    setError(null);
    try {
      await impactService.addImpact(eventId, {
        impact_type_code: impactTypeCode,
        quantity: parseFloat(impactQty) || 0,
        unit_code: impactUnitCode,
        verification_status: impactVerifStatus,
        estimate_basis: impactVerifStatus === 'estimated' ? impactEstimateBasis.trim() : null,
        affected_object_description: impactObjectDesc.trim() || undefined,
        data_class_code: event?.data_class_code || 'internal',
      });
      setAddImpactOpen(false);
      setImpactQty('1');
      setImpactEstimateBasis('');
      setImpactObjectDesc('');
      setSuccessMessage('Impact record added successfully.');
      loadAllEventData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to record impact.'));
    } finally {
      setIsSubmittingImpact(false);
    }
  };

  // Handle Add Evidence to Relationship
  const handleAddEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceModalRelId || !evidenceDesc.trim()) return;

    setIsSubmittingEvidence(true);
    setError(null);
    try {
      await evidenceService.addEvidence(evidenceModalRelId, {
        evidence_type_code: evidenceTypeCode,
        description: evidenceDesc.trim(),
        source_reference: evidenceRef.trim() || null,
        source_url: evidenceUrl.trim() || null,
        data_class_code: event?.data_class_code || 'internal',
      });
      setEvidenceModalRelId(null);
      setEvidenceDesc('');
      setEvidenceRef('');
      setEvidenceUrl('');
      setSuccessMessage('Evidence attached to relationship successfully.');
      loadAllEventData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to attach evidence.'));
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Handle Relationship Confirm or Downgrade
  const handleRelActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relActionModal || !relActionReason.trim()) return;

    setIsSubmittingRelAction(true);
    setError(null);
    try {
      if (relActionModal.type === 'confirm') {
        await relationshipService.confirmRelationship(
          relActionModal.relId,
          relActionReason.trim()
        );
        setSuccessMessage('Relationship confirmed.');
      } else {
        await relationshipService.downgradeRelationship(
          relActionModal.relId,
          relDowngradeStatus,
          relActionReason.trim()
        );
        setSuccessMessage(`Relationship status updated to ${relDowngradeStatus}.`);
      }
      setRelActionModal(null);
      setRelActionReason('');
      loadAllEventData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update relationship status.'));
    } finally {
      setIsSubmittingRelAction(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading incident dossier..." fullHeight />;
  }

  if (!event) {
    return (
      <EmptyState
        title="Incident Record Not Found"
        description="The requested campus event ID does not exist or has been removed."
        actionLabel="Back to Events"
        onAction={() => navigate('/events')}
      />
    );
  }

  const statusBadge = getStatusBadgeProps(event.status_code);
  const severityBadge = getSeverityBadgeProps(event.severity_code);
  const isTerminal = event.is_terminal || event.status_code === 'closed' || event.status_code === 'void';

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Events', path: '/events' },
          { label: event.event_code },
        ]}
      />

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {event.event_code}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border ${severityBadge.bg} ${severityBadge.text} ${severityBadge.border}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${severityBadge.dotColor}`} />
                {severityBadge.label} Severity
              </span>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
              >
                {statusBadge.label}
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                {event.category_name || event.category_code}
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Started: {formatDate(event.started_at)}
              </span>
              {event.location_name && (
                <span className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {event.location_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-slate-400" />
                Classification: <span className="uppercase font-medium text-slate-700">{event.data_class_code}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/events/${event.event_id}/edit`)}
              disabled={isTerminal}
              leftIcon={<Edit className="h-3.5 w-3.5" />}
            >
              Edit
            </Button>

            {!isTerminal && validTransitions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOpen(true)}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Advance Status
              </Button>
            )}

            {!isTerminal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTerminalModalType('close')}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              >
                Close Event
              </Button>
            )}

            {!isTerminal && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setTerminalModalType('void')}
                leftIcon={<XCircle className="h-3.5 w-3.5" />}
              >
                Void
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={loadAllEventData}
              title="Reload details"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          title="Operation Notice"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {[
            { id: 'overview', label: 'Overview & Context', icon: FileCheck },
            { id: 'relationships', label: `Relationships (${relationships.length})`, icon: GitBranch },
            { id: 'impacts', label: `Impacts (${impacts.length})`, icon: Zap },
            { id: 'investigation', label: 'Root Cause & Radius', icon: FileSearch },
            { id: 'history', label: `Audit Timeline (${historyItems.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-3 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-[#173D70] text-[#173D70] font-bold'
                    : 'border-transparent text-[#64748B] hover:border-[#CBD5E1] hover:text-[#173D70]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Overview & Context */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                Incident Description
              </h2>
              <p className="mt-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
              {event.source_note && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                  <span className="font-semibold text-slate-800">Source Note: </span>
                  {event.source_note}
                </div>
              )}
            </div>

            {/* Quick Investigation Report Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Institutional Investigation Report
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full synthesized report including graph traversal, timeline provenance, and impacts.
                </p>
              </div>
              <Link
                to={`/reports/investigation/${event.event_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 shadow-xs"
              >
                <span>View Full Report</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              </Link>
            </div>
          </div>

          {/* Operational Context Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Linked Context Entities
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-slate-400 font-medium">Location</span>
                  <span className="font-medium text-slate-800">
                    {event.location_name || '—'}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 font-medium">Linked Asset</span>
                  <span className="font-medium text-slate-800">
                    {event.asset_name || '—'}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 font-medium">Critical Service</span>
                  <span className="font-medium text-slate-800">
                    {event.service_name || '—'}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 font-medium">Scheduled Activity</span>
                  <span className="font-medium text-slate-800">
                    {event.scheduled_activity_title || '—'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-slate-400 font-medium">Last Modified</span>
                  <span className="font-mono text-[11px] text-slate-600">
                    {formatDate(event.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Relationships */}
      {activeTab === 'relationships' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Event Causal Relationships
              </h2>
              <p className="text-xs text-slate-500">
                Directed connections identifying cause and cascading effect events.
              </p>
            </div>
            <Link
              to={`/relationships?cause_event_id=${event.event_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Link New Relationship</span>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Connected Event</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Confidence</th>
                    <th className="px-5 py-3 font-medium">Explanation</th>
                    <th className="px-5 py-3 font-medium">Evidence Count</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {relationships.length > 0 ? (
                    relationships.map((rel) => {
                      const isCause = rel.cause_event_id === event.event_id;
                      const otherEventId = isCause ? rel.effect_event_id : rel.cause_event_id;
                      const otherEventCode = isCause ? rel.effect_event_code : rel.cause_event_code;
                      const otherEventTitle = isCause ? rel.effect_title : rel.cause_title;

                      return (
                        <tr key={rel.relationship_id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${
                                isCause
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              }`}
                            >
                              {isCause ? 'Cause → Effect' : 'Effect ← Cause'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Link
                              to={`/events/${otherEventId}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {otherEventCode || 'Event'}
                            </Link>
                            <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {otherEventTitle}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium border ${
                                rel.relationship_status_code === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : rel.relationship_status_code === 'suspected'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {rel.relationship_status_code}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-medium font-tabular text-slate-800">
                            {formatConfidence(rel.confidence_score)}
                          </td>
                          <td className="px-5 py-3.5 max-w-[200px] text-slate-600 truncate">
                            {rel.explanation}
                          </td>
                          <td className="px-5 py-3.5 font-tabular">
                            {rel.evidence_count ?? 0}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => setEvidenceModalRelId(rel.relationship_id)}
                              className="text-xs font-medium text-teal-700 hover:text-teal-900"
                            >
                              + Evidence
                            </button>
                            {rel.relationship_status_code !== 'confirmed' && (
                              <button
                                onClick={() =>
                                  setRelActionModal({
                                    relId: rel.relationship_id,
                                    type: 'confirm',
                                  })
                                }
                                className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                              >
                                Confirm
                              </button>
                            )}
                            {rel.relationship_status_code === 'confirmed' && (
                              <button
                                onClick={() =>
                                  setRelActionModal({
                                    relId: rel.relationship_id,
                                    type: 'downgrade',
                                  })
                                }
                                className="text-xs font-medium text-amber-700 hover:text-amber-900"
                              >
                                Downgrade
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        No relationships linked to this event yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Impacts */}
      {activeTab === 'impacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recorded Incident Impacts
              </h2>
              <p className="text-xs text-slate-500">
                Quantifiable campus disruptions, financial costs, casualties, and downtime.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setAddImpactOpen(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Impact
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Impact Type</th>
                    <th className="px-5 py-3 font-medium">Quantity</th>
                    <th className="px-5 py-3 font-medium">Unit</th>
                    <th className="px-5 py-3 font-medium">Verification Status</th>
                    <th className="px-5 py-3 font-medium">Affected Object / Description</th>
                    <th className="px-5 py-3 font-medium">Estimate Basis</th>
                    <th className="px-5 py-3 font-medium">Recorded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {impacts.length > 0 ? (
                    impacts.map((imp) => (
                      <tr key={imp.impact_id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {imp.impact_type_name || imp.impact_type_code}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                          {imp.quantity}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {imp.unit_name || imp.unit_code}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium border ${
                              imp.verification_status === 'verified'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {imp.verification_status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate">
                          {imp.affected_object_description || 'Direct Incident Target'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 max-w-[200px] truncate">
                          {imp.estimate_basis || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-tabular">
                          {formatDate(imp.recorded_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        No impact records linked to this incident.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Investigation & Root Causes */}
      {activeTab === 'investigation' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Root Cause Traversal
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Recursive graph analysis following confirmed causal relationships backwards in time.
            </p>

            {rootCauses && rootCauses.nodes && rootCauses.nodes.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="text-xs text-slate-600 italic">
                  {rootCauses.uniqueness_note}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rootCauses.nodes.map((node) => (
                    <div
                      key={node.event_id}
                      className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/events/${node.event_id}`}
                          className="font-mono text-xs font-bold text-blue-600 hover:underline"
                        >
                          {node.event_code}
                        </Link>
                        <Badge variant="info">Depth: {node.minimum_depth}</Badge>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-800">
                        {node.title}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        Path steps: {node.path_event_ids?.length || 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-400">
                No upstream root causes identified through confirmed relationships.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Status History Timeline */}
      {activeTab === 'history' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Provenance Status History
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Immutable transition audit records stored with change reasoning.
          </p>

          <div className="mt-6 flow-root">
            <ul className="-mb-8">
              {historyItems.map((item, idx) => {
                const isLast = idx === historyItems.length - 1;
                const statusProps = getStatusBadgeProps(item.new_status_code);

                return (
                  <li key={item.history_id}>
                    <div className="relative pb-8">
                      {!isLast && (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white text-slate-600 text-xs font-bold">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-xs font-medium text-slate-900">
                              Status changed to{' '}
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold border ${statusProps.bg} ${statusProps.text} ${statusProps.border}`}
                              >
                                {statusProps.label}
                              </span>
                              {item.old_status_code && (
                                <span className="text-slate-400 font-normal">
                                  {' '}
                                  (from {item.old_status_code})
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              "{item.reason}"
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-xs text-slate-500 font-tabular">
                            {formatDate(item.changed_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Modal: Advance Status */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Advance Incident Status"
        description="Select a permitted workflow transition and record mandatory operational reasoning."
      >
        <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Target Status
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
            >
              {validTransitions.map((t) => (
                <option key={t.to_status_code} value={t.to_status_code}>
                  {t.to_status_code} {t.description ? `— ${t.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Operational Reason *
            </label>
            <textarea
              required
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="State the findings or rationale for this status progression..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isUpdatingStatus}>
              Confirm Transition
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Terminal Action (Close / Void) */}
      <Modal
        isOpen={terminalModalType !== null}
        onClose={() => setTerminalModalType(null)}
        title={terminalModalType === 'close' ? 'Close Incident' : 'Void Incident'}
        description={
          terminalModalType === 'close'
            ? 'Closing marks the incident as formally concluded. A closing reason is recorded in provenance history.'
            : 'Voiding marks an erroneous or voided report. Events cannot be hard deleted.'
        }
      >
        <form onSubmit={handleTerminalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Mandatory Reason *
            </label>
            <textarea
              required
              rows={3}
              value={terminalReason}
              onChange={(e) => setTerminalReason(e.target.value)}
              placeholder={
                terminalModalType === 'close'
                  ? 'Resolution details, remedial actions completed...'
                  : 'Reason for voiding this incident record...'
              }
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTerminalModalType(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={terminalModalType === 'close' ? 'primary' : 'destructive'}
              isLoading={isTerminalSubmitting}
            >
              Confirm {terminalModalType === 'close' ? 'Closure' : 'Void'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Impact */}
      <Modal
        isOpen={addImpactOpen}
        onClose={() => setAddImpactOpen(false)}
        title="Record Incident Impact"
        description="Quantify damages, operational disruption, financial loss, or safety consequences."
      >
        <form onSubmit={handleAddImpactSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Impact Type *
              </label>
              <select
                value={impactTypeCode}
                onChange={(e) => setImpactTypeCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                {impactTypes.map((it) => (
                  <option key={it.code} value={it.code}>
                    {it.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Measurement Unit *
              </label>
              <select
                value={impactUnitCode}
                onChange={(e) => setImpactUnitCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                {measurementUnits.map((mu) => (
                  <option key={mu.code} value={mu.code}>
                    {mu.display_name} ({mu.symbol || mu.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Quantity *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={impactQty}
                onChange={(e) => setImpactQty(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Verification Status *
              </label>
              <select
                value={impactVerifStatus}
                onChange={(e) => setImpactVerifStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="verified">Verified</option>
                <option value="estimated">Estimated</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Affected Object Description
            </label>
            <input
              type="text"
              value={impactObjectDesc}
              onChange={(e) => setImpactObjectDesc(e.target.value)}
              placeholder="e.g., Server Rack B, East Wing Classrooms"
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          {impactVerifStatus === 'estimated' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Estimate Basis * (Required for Estimated Impacts)
              </label>
              <input
                type="text"
                required
                value={impactEstimateBasis}
                onChange={(e) => setImpactEstimateBasis(e.target.value)}
                placeholder="e.g., Preliminary facilities damage quote, attendance log"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddImpactOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingImpact}>
              Save Impact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Evidence to Relationship */}
      <Modal
        isOpen={evidenceModalRelId !== null}
        onClose={() => setEvidenceModalRelId(null)}
        title="Attach Evidence to Relationship"
        description="Link documents, logs, sensor data, or witness testimony supporting this causal relationship."
      >
        <form onSubmit={handleAddEvidenceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Evidence Type *
            </label>
            <select
              value={evidenceTypeCode}
              onChange={(e) => setEvidenceTypeCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
            >
              {evidenceTypes.map((et) => (
                <option key={et.code} value={et.code}>
                  {et.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Evidence Description *
            </label>
            <textarea
              required
              rows={3}
              value={evidenceDesc}
              onChange={(e) => setEvidenceDesc(e.target.value)}
              placeholder="State what this evidence demonstrates regarding the causal link..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Source Reference / Document ID
            </label>
            <input
              type="text"
              value={evidenceRef}
              onChange={(e) => setEvidenceRef(e.target.value)}
              placeholder="e.g., CCTV Log Archive #2026-B4, Security Dispatch Audio #12"
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Source URL (Optional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://intranet.campus.edu/evidence/..."
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEvidenceModalRelId(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingEvidence}>
              Attach Evidence
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm or Downgrade Relationship */}
      <Modal
        isOpen={relActionModal !== null}
        onClose={() => setRelActionModal(null)}
        title={
          relActionModal?.type === 'confirm'
            ? 'Confirm Causal Relationship'
            : 'Downgrade Causal Relationship'
        }
        description={
          relActionModal?.type === 'confirm'
            ? 'Confirming verifies that this relationship has supporting evidence.'
            : 'Downgrade to suspected or rejected with mandatory reason.'
        }
      >
        <form onSubmit={handleRelActionSubmit} className="space-y-4">
          {relActionModal?.type === 'downgrade' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                New Relationship Status
              </label>
              <select
                value={relDowngradeStatus}
                onChange={(e) => setRelDowngradeStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="suspected">Suspected (Preliminary)</option>
                <option value="rejected_unrelated">Rejected (Unrelated)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Operational Reason *
            </label>
            <textarea
              required
              rows={3}
              value={relActionReason}
              onChange={(e) => setRelActionReason(e.target.value)}
              placeholder="State the justification for this relationship status change..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRelActionModal(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingRelAction}>
              {relActionModal?.type === 'confirm' ? 'Confirm Relationship' : 'Downgrade Relationship'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
