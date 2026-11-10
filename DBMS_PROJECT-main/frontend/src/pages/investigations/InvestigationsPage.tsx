import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  Network,
  Zap,
} from 'lucide-react';
import { investigationService } from '../../services/investigationService';
import { eventService } from '../../services/eventService';
import { BlastRadiusResult, EventSummary, InvestigationResult } from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Alert } from '../../components/common/Alert';
import { EmptyState } from '../../components/common/EmptyState';

export const InvestigationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEventId = searchParams.get('event_id') || '';

  // State
  const [eventsList, setEventsList] = useState<EventSummary[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventSummary | null>(null);
  const [linkMode, setLinkMode] = useState<'confirmed_only' | 'include_suspected'>('confirmed_only');

  const [rootCauses, setRootCauses] = useState<InvestigationResult | null>(null);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResult | null>(null);

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load events list for the selector
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingList(true);
      try {
        const page = await eventService.listEvents({ page: 1, page_size: 50 });
        setEventsList(page.items);

        if (!selectedEventId && page.items.length > 0) {
          setSearchParams({ event_id: page.items[0].event_id });
        }
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to fetch incident list.'));
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchEvents();
  }, []);

  // When selected event or linkMode changes, execute investigation analysis
  useEffect(() => {
    if (!selectedEventId) return;

    const matched = eventsList.find((e) => e.event_id === selectedEventId);
    if (matched) setActiveEvent(matched);

    const runInvestigation = async () => {
      setIsAnalyzing(true);
      setError(null);
      try {
        const [rc, br] = await Promise.all([
          investigationService.getRootCauses(selectedEventId, linkMode),
          investigationService.getBlastRadius(selectedEventId, linkMode),
        ]);
        setRootCauses(rc);
        setBlastRadius(br);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to compute investigation traversals.'));
      } finally {
        setIsAnalyzing(false);
      }
    };

    runInvestigation();
  }, [selectedEventId, linkMode, eventsList]);

  const handleSelectEvent = (id: string) => {
    setSearchParams({ event_id: id });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Incident Investigation Console
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Causal root-cause analysis and cascading blast-radius propagation across campus systems.
          </p>
        </div>

        {selectedEventId && (
          <Link
            to={`/reports/investigation/${selectedEventId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#173D70] hover:bg-[#EBF3FC] shadow-2xs transition-colors"
          >
            <span>Formal Report View</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#315F91]" />
          </Link>
        )}
      </div>

      {error && (
        <Alert
          type="error"
          title="Analysis Notice"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Control Panel: Event Selector & Link Mode */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Incident to Investigate
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => handleSelectEvent(e.target.value)}
              disabled={isLoadingList}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white text-slate-800 focus:border-slate-500 focus:outline-none"
            >
              {eventsList.map((e) => (
                <option key={e.event_id} value={e.event_id}>
                  [{e.event_code}] {e.title} ({e.status_name || e.status_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Causal Traversal Mode
            </label>
            <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setLinkMode('confirmed_only')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  linkMode === 'confirmed_only'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Confirmed Only
              </button>
              <button
                type="button"
                onClick={() => setLinkMode('include_suspected')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  linkMode === 'include_suspected'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Include Suspected
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAnalyzing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-xs">
          <LoadingSpinner label="Traversing causal graph provenance..." />
        </div>
      ) : activeEvent ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Root Causes Column */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Network className="h-4 w-4 text-indigo-600" />
                  Root Cause Provenance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preceding incidents identified as causal triggers.
                </p>
              </div>
              <Badge variant="neutral">
                {rootCauses?.nodes?.length || 0} node(s)
              </Badge>
            </div>

            {rootCauses?.uniqueness_note && (
              <p className="text-[11px] text-slate-400 italic">
                {rootCauses.uniqueness_note}
              </p>
            )}

            {rootCauses?.nodes && rootCauses.nodes.length > 0 ? (
              <div className="space-y-3">
                {rootCauses.nodes.map((node) => (
                  <div
                    key={node.event_id}
                    className="rounded-lg border border-slate-200 p-4 bg-slate-50/60 hover:bg-slate-50 transition-colors"
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
                    <h3 className="mt-1 text-xs font-semibold text-slate-900">
                      {node.title}
                    </h3>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Path: {node.path_event_ids?.length || 1} step(s) in causal chain
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No upstream root causes found under mode:{' '}
                <span className="font-semibold">{linkMode}</span>.
              </div>
            )}
          </div>

          {/* Blast Radius Column */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  Cascading Blast Radius
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Downstream incidents triggered and affected campus entities.
                </p>
              </div>
              <Badge variant="warning">
                {blastRadius?.nodes?.length || 0} event(s) affected
              </Badge>
            </div>

            {blastRadius?.impact_grouping_note && (
              <p className="text-[11px] text-slate-400 italic">
                {blastRadius.impact_grouping_note}
              </p>
            )}

            {/* Downstream Nodes */}
            {blastRadius?.nodes && blastRadius.nodes.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Affected Downstream Incidents
                </h3>
                {blastRadius.nodes.map((node) => (
                  <div
                    key={node.event_id}
                    className="rounded-lg border border-slate-200 p-4 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/events/${node.event_id}`}
                        className="font-mono text-xs font-bold text-blue-600 hover:underline"
                      >
                        {node.event_code}
                      </Link>
                      <Badge variant="warning">Depth: {node.minimum_depth}</Badge>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-900">
                      {node.title}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                No downstream cascading incidents identified.
              </div>
            )}

            {/* Aggregated Cumulative Impacts in Blast Radius */}
            {blastRadius?.impacts && blastRadius.impacts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Cumulative Blast Radius Impacts
                </h3>
                <div className="space-y-2">
                  {blastRadius.impacts.map((imp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/40 p-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {imp.impact_type_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Object: {imp.affected_object_key}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {imp.headline_quantity} {imp.unit_name || imp.unit_code}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">
                          {imp.verification_status} ({imp.impact_record_count} record(s))
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Select an Incident"
          description="Choose a campus incident from the selector above to analyze its causal provenance and downstream blast radius."
        />
      )}
    </div>
  );
};
