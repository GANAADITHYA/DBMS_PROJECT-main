import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { eventService } from '../../services/eventService';
import { referenceService } from '../../services/referenceService';
import {
  EventAsOfItem,
  EventSummary,
  Page,
  ReferenceCategory,
  ReferenceSeverityLevel,
  ReferenceStatus,
} from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  formatDate,
  getSeverityBadgeProps,
  getStatusBadgeProps,
  toIsoWithTz,
} from '../../utils/formatters';

export const EventsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [eventsPage, setEventsPage] = useState<Page<EventSummary> | null>(null);
  const [asOfEvents, setAsOfEvents] = useState<Page<EventAsOfItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL or local state
  const keyword = searchParams.get('keyword') || '';
  const categoryCode = searchParams.get('category_code') || '';
  const severityCode = searchParams.get('severity_code') || '';
  const statusCode = searchParams.get('status_code') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 15;

  // As-Of Temporal Reconstruction Mode
  const [isAsOfMode, setIsAsOfMode] = useState(false);
  const [asOfTimestamp, setAsOfTimestamp] = useState<string>(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  // Reference lists for filter dropdowns
  const [categories, setCategories] = useState<ReferenceCategory[]>([]);
  const [severities, setSeverities] = useState<ReferenceSeverityLevel[]>([]);
  const [statuses, setStatuses] = useState<ReferenceStatus[]>([]);

  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [catList, sevList, statList] = await Promise.all([
          referenceService.getCategories(),
          referenceService.getSeverityLevels(),
          referenceService.getStatuses(),
        ]);
        setCategories(catList);
        setSeverities(sevList);
        setStatuses(statList);
      } catch {
        // non-blocking
      }
    };
    loadReferences();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isAsOfMode) {
        const dateObj = new Date(asOfTimestamp);
        const data = await eventService.getEventsAsOf({
          at: toIsoWithTz(dateObj),
          category_code: categoryCode || undefined,
          status_code: statusCode || undefined,
          page: currentPage,
          page_size: pageSize,
        });
        setAsOfEvents(data);
        setEventsPage(null);
      } else {
        const data = await eventService.listEvents({
          keyword: keyword || undefined,
          category_code: categoryCode || undefined,
          severity_code: severityCode || undefined,
          status_code: statusCode || undefined,
          page: currentPage,
          page_size: pageSize,
        });
        setEventsPage(data);
        setAsOfEvents(null);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to retrieve events from Supabase.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [keyword, categoryCode, severityCode, statusCode, currentPage, isAsOfMode]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const totalItems = isAsOfMode ? asOfEvents?.total ?? 0 : eventsPage?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E293B]">
            Campus Incidents & Events Registry
          </h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Search, filter, and track live institutional records loaded from Supabase database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isAsOfMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsAsOfMode(!isAsOfMode)}
            leftIcon={<History className="h-3.5 w-3.5" />}
          >
            {isAsOfMode ? 'Exit As-Of Query' : 'Temporal As-Of Reconstruction'}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/events/create')}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            className="bg-[#173D70] hover:bg-[#0F294D] text-white"
          >
            Report Incident
          </Button>
        </div>
      </div>

      {/* As-Of Temporal Reconstruction Banner */}
      {isAsOfMode && (
        <div className="rounded-xl border border-[#C7DCF8] bg-[#EBF3FC] p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#173D70]">
                <Clock className="h-4 w-4 text-[#173D70]" />
                Temporal Provenance Reconstruction
              </div>
              <p className="mt-0.5 text-xs text-[#315F91]">
                Reconstruct the state of incidents exactly as they were recorded at an arbitrary past timestamp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={asOfTimestamp}
                onChange={(e) => setAsOfTimestamp(e.target.value)}
                className="rounded-lg border border-[#C7DCF8] bg-white px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#173D70]"
              />
              <Button size="sm" onClick={loadEvents} className="bg-[#173D70] text-white">
                Reconstruct
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <Alert
          type="error"
          title="Error Loading Events"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search code, title or keyword..."
              value={keyword}
              onChange={(e) => updateFilter('keyword', e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs placeholder:text-[#94A3B8] text-[#1E293B] focus:border-[#173D70] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#173D70]"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryCode}
              onChange={(e) => updateFilter('category_code', e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs text-[#1E293B] focus:border-[#173D70] focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityCode}
              onChange={(e) => updateFilter('severity_code', e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs text-[#1E293B] focus:border-[#173D70] focus:outline-none"
            >
              <option value="">All Severities</option>
              {severities.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusCode}
              onChange={(e) => updateFilter('status_code', e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs text-[#1E293B] focus:border-[#173D70] focus:outline-none"
            >
              <option value="">All Statuses</option>
              {statuses.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter status tags */}
        {(keyword || categoryCode || severityCode || statusCode) && (
          <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B]">
            <span className="font-medium text-[#1E293B]">Active filters:</span>
            {keyword && (
              <span className="inline-flex items-center gap-1 rounded bg-[#EBF3FC] px-2 py-0.5 text-[#173D70] text-[11px] font-semibold">
                "{keyword}"
                <X
                  className="h-3 w-3 cursor-pointer text-[#173D70]"
                  onClick={() => updateFilter('keyword', '')}
                />
              </span>
            )}
            {categoryCode && (
              <span className="inline-flex items-center gap-1 rounded bg-[#EBF3FC] px-2 py-0.5 text-[#173D70] text-[11px] font-semibold">
                Category: {categoryCode}
                <X
                  className="h-3 w-3 cursor-pointer text-[#173D70]"
                  onClick={() => updateFilter('category_code', '')}
                />
              </span>
            )}
            {severityCode && (
              <span className="inline-flex items-center gap-1 rounded bg-[#EBF3FC] px-2 py-0.5 text-[#173D70] text-[11px] font-semibold">
                Severity: {severityCode}
                <X
                  className="h-3 w-3 cursor-pointer text-[#173D70]"
                  onClick={() => updateFilter('severity_code', '')}
                />
              </span>
            )}
            {statusCode && (
              <span className="inline-flex items-center gap-1 rounded bg-[#EBF3FC] px-2 py-0.5 text-[#173D70] text-[11px] font-semibold">
                Status: {statusCode}
                <X
                  className="h-3 w-3 cursor-pointer text-[#173D70]"
                  onClick={() => updateFilter('status_code', '')}
                />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="ml-auto text-xs font-semibold text-[#173D70] hover:underline"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Events Table Container */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner label="Loading incidents from Supabase..." />
          </div>
        ) : isAsOfMode ? (
          /* As-Of Historical Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs academic-table">
              <thead>
                <tr>
                  <th>Event Code</th>
                  <th>Title</th>
                  <th>Historical Status</th>
                  <th>Recorded At</th>
                  <th>Transition Reason</th>
                  <th>Reconstruction Note</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                {asOfEvents?.items && asOfEvents.items.length > 0 ? (
                  asOfEvents.items.map((item) => {
                    const statusProps = getStatusBadgeProps(item.status_as_recorded);
                    return (
                      <tr
                        key={item.event_id}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                        onClick={() => navigate(`/events/${item.event_id}`)}
                      >
                        <td className="font-mono font-semibold text-[#173D70]">
                          {item.event_code}
                        </td>
                        <td className="font-medium text-[#1E293B] max-w-[200px] truncate">
                          {item.title}
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${statusProps.bg} ${statusProps.text} ${statusProps.border}`}
                          >
                            {statusProps.dotColor && (
                              <span className={`h-1.5 w-1.5 rounded-full ${statusProps.dotColor}`} />
                            )}
                            {statusProps.label}
                          </span>
                        </td>
                        <td className="text-[#64748B] font-tabular">
                          {formatDate(item.status_recorded_at)}
                        </td>
                        <td className="text-[#64748B] max-w-[200px] truncate">
                          {item.history_reason || '—'}
                        </td>
                        <td className="text-[#94A3B8] text-[11px] max-w-[200px] truncate">
                          {item.reconstruction_note}
                        </td>
                        <td className="text-right">
                          <Link
                            to={`/events/${item.event_id}`}
                            className="font-semibold text-[#173D70] hover:underline"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12">
                      <EmptyState
                        title="No Historical Events Found"
                        description="No incidents matched the selected timestamp and filters."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Standard Events Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs academic-table">
              <thead>
                <tr>
                  <th>Event Code</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Started At</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                {eventsPage?.items && eventsPage.items.length > 0 ? (
                  eventsPage.items.map((event) => {
                    const statusProps = getStatusBadgeProps(event.status_code);
                    const severityProps = getSeverityBadgeProps(event.severity_code);

                    return (
                      <tr
                        key={event.event_id}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                        onClick={() => navigate(`/events/${event.event_id}`)}
                      >
                        <td className="font-mono font-semibold text-[#173D70]">
                          {event.event_code}
                        </td>
                        <td className="font-medium text-[#1E293B] max-w-[220px] truncate">
                          {event.title}
                        </td>
                        <td className="text-[#64748B]">
                          {event.category_name || event.category_code}
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${severityProps.bg} ${severityProps.text} ${severityProps.border}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${severityProps.dotColor}`}
                            />
                            {severityProps.label}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${statusProps.bg} ${statusProps.text} ${statusProps.border}`}
                          >
                            {statusProps.dotColor && (
                              <span className={`h-1.5 w-1.5 rounded-full ${statusProps.dotColor}`} />
                            )}
                            {statusProps.label}
                          </span>
                        </td>
                        <td className="text-[#64748B]">
                          {event.location_name || '—'}
                        </td>
                        <td className="text-[#64748B] font-tabular">
                          {formatDate(event.started_at)}
                        </td>
                        <td className="text-right">
                          <Link
                            to={`/events/${event.event_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-[#173D70] hover:underline"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-12">
                      <EmptyState
                        title="No Incidents Found"
                        description={
                          keyword || categoryCode || severityCode || statusCode
                            ? 'No events match the active search criteria.'
                            : 'No incidents have been recorded yet in CAMPUS MEMORY.'
                        }
                        actionLabel="Report New Incident"
                        onAction={() => navigate('/events/create')}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-5 py-3 text-xs text-[#64748B] bg-[#F8FAFC]">
            <div>
              Showing <span className="font-semibold text-[#1E293B]">{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
              <span className="font-semibold text-[#1E293B]">
                {Math.min(currentPage * pageSize, totalItems)}
              </span>{' '}
              of <span className="font-semibold text-[#1E293B]">{totalItems}</span> incidents
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              >
                Previous
              </Button>
              <span className="px-2 font-semibold text-[#173D70]">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
