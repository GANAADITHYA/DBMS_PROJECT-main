import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { relationshipService } from '../../services/relationshipService';
import { eventService } from '../../services/eventService';
import { evidenceService } from '../../services/evidenceService';
import { referenceService } from '../../services/referenceService';
import {
  EventSummary,
  EvidenceRead,
  ReferenceDataClass,
  ReferenceEvidenceType,
  RelationshipRead,
} from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export const EvidencePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEventId = searchParams.get('event_id') || '';

  const [eventsList, setEventsList] = useState<EventSummary[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceRead[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRead[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<ReferenceEvidenceType[]>([]);
  const [dataClasses, setDataClasses] = useState<ReferenceDataClass[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Evidence Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [targetRelationshipId, setTargetRelationshipId] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [description, setDescription] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [dataClassCode, setDataClassCode] = useState('internal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial load: events and reference types
  useEffect(() => {
    const init = async () => {
      try {
        const [evPage, types, dClasses] = await Promise.all([
          eventService.listEvents({ page: 1, page_size: 100 }),
          referenceService.getEvidenceTypes().catch(() => []),
          referenceService.getDataClasses().catch(() => []),
        ]);
        setEventsList(evPage.items);
        setEvidenceTypes(types);
        setDataClasses(dClasses);
        if (types.length > 0) setTypeCode(types[0].code);

        if (!selectedEventId && evPage.items.length > 0) {
          setSearchParams({ event_id: evPage.items[0].event_id });
        }
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to initialize evidence console.'));
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // When selected event changes, load its evidence from the investigation report & relationships
  const loadEventEvidence = async () => {
    if (!selectedEventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [report, rels] = await Promise.all([
        reportService.getEventInvestigationReport(selectedEventId).catch(() => null),
        relationshipService.listEventRelationships(selectedEventId).catch(() => []),
      ]);

      setEvidenceList(report?.evidence || []);
      setRelationships(rels);
      if (rels.length > 0) {
        setTargetRelationshipId(rels[0].relationship_id);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load evidence records.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadEventEvidence();
    }
  }, [selectedEventId]);

  const handleCreateEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRelationshipId) {
      setError('A causal relationship must be selected to attach evidence.');
      return;
    }
    if (!description.trim()) {
      setError('Evidence description is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await evidenceService.addEvidence(targetRelationshipId, {
        evidence_type_code: typeCode,
        description: description.trim(),
        source_reference: sourceReference.trim() || null,
        source_url: sourceUrl.trim() || null,
        data_class_code: dataClassCode,
      });

      setAddModalOpen(false);
      setDescription('');
      setSourceReference('');
      setSourceUrl('');
      setSuccessMessage('Evidence successfully recorded and linked.');
      loadEventEvidence();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to add evidence.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Evidence & Chain of Custody
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Audit-grade evidentiary records supporting causal linkages and investigation findings.
          </p>
        </div>

        {relationships.length > 0 && (
          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Attach Evidence
          </Button>
        )}
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

      {/* Event Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Filter Evidence by Incident Dossier
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSearchParams({ event_id: e.target.value })}
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
          onClick={loadEventEvidence}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh Evidence
        </Button>
      </div>

      {/* Evidence Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Corroborating Evidence Records
            </h2>
            <p className="text-xs text-slate-500">
              Verified documents, digital logs, telemetry, and testimony tied to this incident.
            </p>
          </div>
          <Badge variant="neutral">
            {evidenceList.length} evidence row(s)
          </Badge>
        </div>

        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner label="Loading evidence records..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Evidence ID</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Source Reference</th>
                  <th className="px-5 py-3 font-medium">Classification</th>
                  <th className="px-5 py-3 font-medium">Recorded At</th>
                  <th className="px-5 py-3 font-medium text-right">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {evidenceList.length > 0 ? (
                  evidenceList.map((ev) => (
                    <tr key={ev.evidence_id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-mono text-slate-500">
                        {ev.evidence_id.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="info">
                          {ev.evidence_type_code}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 max-w-sm">
                        {ev.description}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {ev.source_reference || '—'}
                      </td>
                      <td className="px-5 py-3.5 uppercase font-medium text-slate-600">
                        {ev.data_class_code}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-tabular">
                        {formatDate(ev.recorded_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {ev.source_url ? (
                          <a
                            href={ev.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                          >
                            <span>Open URL</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12">
                      <EmptyState
                        title="No Evidence Attached"
                        description={
                          relationships.length > 0
                            ? 'No evidence records have been linked to the relationships of this incident yet.'
                            : 'This event currently has no causal relationships to attach evidence to. Create a relationship first.'
                        }
                        actionLabel={
                          relationships.length > 0
                            ? 'Attach First Evidence'
                            : 'Go to Relationships'
                        }
                        onAction={() =>
                          relationships.length > 0
                            ? setAddModalOpen(true)
                            : setSearchParams({ event_id: selectedEventId })
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Evidence */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Record Corroborating Evidence"
        description="Attach proof to a verified causal relationship in the investigation dossier."
      >
        <form onSubmit={handleCreateEvidence} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Target Causal Relationship *
            </label>
            <select
              value={targetRelationshipId}
              onChange={(e) => setTargetRelationshipId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
            >
              {relationships.map((r) => (
                <option key={r.relationship_id} value={r.relationship_id}>
                  {r.cause_event_code || 'Cause'} → {r.effect_event_code || 'Effect'} ({r.relationship_status_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Evidence Type *
              </label>
              <select
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
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
                Data Classification *
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
              Evidence Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State what this evidence establishes and why it confirms causality..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Source Reference / Document ID
            </label>
            <input
              type="text"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
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
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://intranet.campus.edu/evidence/..."
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Attach Evidence
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
