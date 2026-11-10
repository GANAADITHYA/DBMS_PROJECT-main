import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { relationshipService } from '../../services/relationshipService';
import { eventService } from '../../services/eventService';
import { evidenceService } from '../../services/evidenceService';
import { referenceService } from '../../services/referenceService';
import {
  EventSummary,
  ReferenceDataClass,
  ReferenceEvidenceType,
  RelationshipHistoryItem,
  RelationshipRead,
} from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatConfidence, formatDate } from '../../utils/formatters';

export const RelationshipsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEventId = searchParams.get('event_id') || searchParams.get('cause_event_id') || '';

  // State
  const [eventsList, setEventsList] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [relationships, setRelationships] = useState<RelationshipRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Relationship Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [causeEventId, setCauseEventId] = useState(initialEventId);
  const [effectEventId, setEffectEventId] = useState('');
  const [confidenceScore, setConfidenceScore] = useState('0.85');
  const [explanation, setExplanation] = useState('');
  const [temporalOverrideReason, setTemporalOverrideReason] = useState('');
  const [dataClassCode, setDataClassCode] = useState('internal');
  const [dataClasses, setDataClasses] = useState<ReferenceDataClass[]>([]);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // History Modal
  const [historyModalRelId, setHistoryModalRelId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<RelationshipHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Confirm / Downgrade Modal
  const [actionModal, setActionModal] = useState<{
    relId: string;
    type: 'confirm' | 'downgrade';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [downgradeStatus, setDowngradeStatus] = useState<'suspected' | 'rejected_unrelated'>('suspected');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Evidence Modal
  const [evidenceModalRelId, setEvidenceModalRelId] = useState<string | null>(null);
  const [evidenceTypeCode, setEvidenceTypeCode] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceTypes, setEvidenceTypes] = useState<ReferenceEvidenceType[]>([]);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  // Initial load: events and reference
  useEffect(() => {
    const init = async () => {
      try {
        const [evPage, dClasses, evTypes] = await Promise.all([
          eventService.listEvents({ page: 1, page_size: 100 }),
          referenceService.getDataClasses().catch(() => []),
          referenceService.getEvidenceTypes().catch(() => []),
        ]);
        setEventsList(evPage.items);
        setDataClasses(dClasses);
        setEvidenceTypes(evTypes);
        if (evTypes.length > 0) setEvidenceTypeCode(evTypes[0].code);

        const chosen = initialEventId || (evPage.items.length > 0 ? evPage.items[0].event_id : '');
        setSelectedEventId(chosen);
        if (!causeEventId && evPage.items.length > 0) setCauseEventId(evPage.items[0].event_id);
        if (!effectEventId && evPage.items.length > 1) setEffectEventId(evPage.items[1].event_id);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to initialize relationship data.'));
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Fetch relationships for the selected event
  const fetchRelationships = async () => {
    if (!selectedEventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await relationshipService.listEventRelationships(selectedEventId);
      setRelationships(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to fetch relationships.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchRelationships();
    }
  }, [selectedEventId]);

  // Handle Create Relationship
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!causeEventId || !effectEventId) {
      setError('Please select both a cause event and an effect event.');
      return;
    }
    if (causeEventId === effectEventId) {
      setError('An event cannot be causally linked to itself.');
      return;
    }
    if (!explanation.trim()) {
      setError('An explanation for the causal link is required.');
      return;
    }

    const confNum = parseFloat(confidenceScore);
    if (isNaN(confNum) || confNum < 0 || confNum > 1) {
      setError('Confidence score must be a number between 0.00 and 1.00.');
      return;
    }

    setIsSubmittingCreate(true);
    setError(null);
    try {
      await relationshipService.createRelationship({
        cause_event_id: causeEventId,
        effect_event_id: effectEventId,
        confidence_score: confNum,
        explanation: explanation.trim(),
        temporal_override_reason: temporalOverrideReason.trim() || null,
        data_class_code: dataClassCode,
      });

      setCreateModalOpen(false);
      setExplanation('');
      setTemporalOverrideReason('');
      setSuccessMessage('Causal relationship created successfully.');
      fetchRelationships();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create relationship.'));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle View History
  const openHistory = async (relId: string) => {
    setHistoryModalRelId(relId);
    setIsLoadingHistory(true);
    try {
      const items = await relationshipService.getRelationshipHistory(relId);
      setHistoryItems(items);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load relationship history.'));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle Confirm or Downgrade Submit
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal || !actionReason.trim()) return;

    setIsSubmittingAction(true);
    setError(null);
    try {
      if (actionModal.type === 'confirm') {
        await relationshipService.confirmRelationship(actionModal.relId, actionReason.trim());
        setSuccessMessage('Relationship confirmed successfully.');
      } else {
        await relationshipService.downgradeRelationship(
          actionModal.relId,
          downgradeStatus,
          actionReason.trim()
        );
        setSuccessMessage(`Relationship downgraded to ${downgradeStatus}.`);
      }
      setActionModal(null);
      setActionReason('');
      fetchRelationships();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to execute status update.'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Add Evidence Submit
  const handleEvidenceSubmit = async (e: React.FormEvent) => {
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
        data_class_code: 'internal',
      });
      setEvidenceModalRelId(null);
      setEvidenceDesc('');
      setEvidenceRef('');
      setEvidenceUrl('');
      setSuccessMessage('Evidence attached to relationship successfully.');
      fetchRelationships();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to attach evidence.'));
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Incident Relationships & Provenance Graph
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Establish, inspect, confirm, or downgrade causal linkages between campus events.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Create Relationship
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          title="Notice"
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

      {/* Event Focus Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Focus Event for Relationship Mapping
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white text-slate-800 focus:border-slate-500 focus:outline-none"
          >
            {eventsList.map((e) => (
              <option key={e.event_id} value={e.event_id}>
                [{e.event_code}] {e.title}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchRelationships}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh Links
        </Button>
      </div>

      {/* Relationships Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Linked Causal Connections
            </h2>
            <p className="text-xs text-slate-500">
              Direct upstream causes and downstream effects connected to the focused event.
            </p>
          </div>
          <Badge variant="neutral">
            {relationships.length} connection(s)
          </Badge>
        </div>

        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner label="Loading relationships..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Cause Event</th>
                  <th className="px-5 py-3 font-medium"></th>
                  <th className="px-5 py-3 font-medium">Effect Event</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Confidence</th>
                  <th className="px-5 py-3 font-medium">Explanation</th>
                  <th className="px-5 py-3 font-medium">Evidence</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {relationships.length > 0 ? (
                  relationships.map((rel) => {
                    const isFocusCause = rel.cause_event_id === selectedEventId;

                    return (
                      <tr key={rel.relationship_id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${
                              isFocusCause
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {isFocusCause ? 'Focus is Cause' : 'Focus is Effect'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/events/${rel.cause_event_id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {rel.cause_event_code || 'Cause Event'}
                          </Link>
                          <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {rel.cause_title}
                          </div>
                        </td>
                        <td className="px-2 py-3.5 text-slate-400">
                          <ArrowRight className="h-4 w-4" />
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/events/${rel.effect_event_id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {rel.effect_event_code || 'Effect Event'}
                          </Link>
                          <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {rel.effect_title}
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
                        <td className="px-5 py-3.5 font-tabular font-medium">
                          {rel.evidence_count ?? 0}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => setEvidenceModalRelId(rel.relationship_id)}
                            className="font-medium text-teal-700 hover:underline"
                            title="Attach supporting evidence"
                          >
                            + Evidence
                          </button>
                          {rel.relationship_status_code !== 'confirmed' && (
                            <button
                              onClick={() =>
                                setActionModal({
                                  relId: rel.relationship_id,
                                  type: 'confirm',
                                })
                              }
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              Confirm
                            </button>
                          )}
                          {rel.relationship_status_code === 'confirmed' && (
                            <button
                              onClick={() =>
                                setActionModal({
                                  relId: rel.relationship_id,
                                  type: 'downgrade',
                                })
                              }
                              className="font-medium text-amber-700 hover:underline"
                            >
                              Downgrade
                            </button>
                          )}
                          <button
                            onClick={() => openHistory(rel.relationship_id)}
                            className="font-medium text-slate-600 hover:underline"
                          >
                            History
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-5 py-12">
                      <EmptyState
                        title="No Causal Links Found"
                        description="This event currently has no documented upstream or downstream relationships."
                        actionLabel="Link New Relationship"
                        onAction={() => setCreateModalOpen(true)}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Relationship */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Establish Causal Relationship"
        description="Connect two campus events indicating that one precipitated or influenced the other."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Cause Event (Trigger / Preceding Incident) *
            </label>
            <select
              value={causeEventId}
              onChange={(e) => setCauseEventId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
            >
              {eventsList.map((e) => (
                <option key={e.event_id} value={e.event_id}>
                  [{e.event_code}] {e.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Effect Event (Consequence / Cascading Incident) *
            </label>
            <select
              value={effectEventId}
              onChange={(e) => setEffectEventId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
            >
              <option value="">-- Choose Effect Event --</option>
              {eventsList.map((e) => (
                <option key={e.event_id} value={e.event_id}>
                  [{e.event_code}] {e.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Confidence Score (0.00 to 1.00) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                required
                value={confidenceScore}
                onChange={(e) => setConfidenceScore(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Classification *
              </label>
              <select
                value={dataClassCode}
                onChange={(e) => setDataClassCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                {dataClasses.map((dc) => (
                  <option key={dc.code} value={dc.code}>
                    {dc.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Causal Explanation / Technical Nexus *
            </label>
            <textarea
              required
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="State the technical, physical, or operational mechanism linking these events..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Temporal Override Reason (Optional)
            </label>
            <input
              type="text"
              value={temporalOverrideReason}
              onChange={(e) => setTemporalOverrideReason(e.target.value)}
              placeholder="Required only if cause timestamp post-dates effect timestamp..."
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingCreate}>
              Save Relationship
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Relationship History */}
      <Modal
        isOpen={historyModalRelId !== null}
        onClose={() => setHistoryModalRelId(null)}
        title="Relationship Provenance History"
        description="Immutable log of status changes and confidence score modifications."
      >
        {isLoadingHistory ? (
          <LoadingSpinner label="Loading history..." />
        ) : historyItems.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historyItems.map((h) => (
              <div
                key={h.history_id}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span className="font-semibold text-slate-700">{h.change_kind}</span>
                  <span>{formatDate(h.changed_at)}</span>
                </div>
                {h.new_status_code && (
                  <div className="text-slate-800">
                    Status: <span className="font-semibold">{h.new_status_code}</span>
                    {h.old_status_code && ` (was ${h.old_status_code})`}
                  </div>
                )}
                {h.new_confidence !== null && h.new_confidence !== undefined && (
                  <div className="text-slate-800">
                    Confidence: <span className="font-semibold">{formatConfidence(h.new_confidence)}</span>
                  </div>
                )}
                <div className="text-slate-600 italic">
                  "{h.reason}"
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 text-center py-6">
            No history recorded for this relationship.
          </div>
        )}
      </Modal>

      {/* Modal: Confirm or Downgrade */}
      <Modal
        isOpen={actionModal !== null}
        onClose={() => setActionModal(null)}
        title={
          actionModal?.type === 'confirm'
            ? 'Confirm Causal Relationship'
            : 'Downgrade Causal Relationship'
        }
        description={
          actionModal?.type === 'confirm'
            ? 'Confirming moves this connection from suspected to confirmed status. Requires at least 1 attached evidence row.'
            : 'Downgrading reverts a confirmed relationship with recorded rationale.'
        }
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {actionModal?.type === 'downgrade' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                New Relationship Status
              </label>
              <select
                value={downgradeStatus}
                onChange={(e) => setDowngradeStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="suspected">Suspected (Preliminary link)</option>
                <option value="rejected_unrelated">Rejected (Confirmed unrelated)</option>
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
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="State the rationale for confirming or downgrading this connection..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionModal(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingAction}>
              {actionModal?.type === 'confirm' ? 'Confirm Relationship' : 'Downgrade'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Evidence to Relationship */}
      <Modal
        isOpen={evidenceModalRelId !== null}
        onClose={() => setEvidenceModalRelId(null)}
        title="Attach Evidence to Relationship"
        description="Upload provenance reference, CCTV ID, sensor log, or witness statement."
      >
        <form onSubmit={handleEvidenceSubmit} className="space-y-4">
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
              placeholder="Describe the nature of this proof and how it establishes causality..."
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
              placeholder="e.g., Campus Police Report #892, SCADA Log Timestamp 14:22:01"
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
    </div>
  );
};
