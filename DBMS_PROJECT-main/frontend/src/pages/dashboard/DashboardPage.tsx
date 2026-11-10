import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Filter,
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  Shield,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../services/reportService';
import { eventService } from '../../services/eventService';
import { DashboardSummary } from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Alert } from '../../components/common/Alert';
import {
  formatDate,
  getStatusBadgeProps,
  getSeverityBadgeProps,
} from '../../utils/formatters';

// Specific status & severity palette requested by user
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#D97706',
  low: '#2563EB',
  informational: '#315F91',
};

// University Navy Palette for categories
const CATEGORY_COLORS = ['#173D70', '#315F91', '#0284C7', '#7C3AED', '#16A34A', '#EA580C'];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [totalEventsCount, setTotalEventsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table search & category filter state
  const [tableSearch, setTableSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumData, eventsData] = await Promise.all([
        reportService.getDashboardSummary(),
        eventService.listEvents({ page: 1, page_size: 10 }),
      ]);
      setSummary(sumData);
      setTotalEventsCount(eventsData.total);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load university dashboard metrics from Supabase.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const criticalCount =
    summary?.open_by_severity?.find((s) => s.code.toLowerCase() === 'critical')?.event_count || 0;
  const highCount =
    summary?.open_by_severity?.find((s) => s.code.toLowerCase() === 'high')?.event_count || 0;

  const currentDateFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  // Filter recent events based on table search & category
  const filteredRecentEvents = useMemo(() => {
    if (!summary?.recent_open_events) return [];
    return summary.recent_open_events.filter((evt: any) => {
      const matchesSearch =
        tableSearch === '' ||
        evt.title?.toLowerCase().includes(tableSearch.toLowerCase()) ||
        evt.event_code?.toLowerCase().includes(tableSearch.toLowerCase()) ||
        evt.location_name?.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesCat =
        selectedCategoryFilter === 'ALL' ||
        evt.category_code?.toLowerCase() === selectedCategoryFilter.toLowerCase() ||
        evt.category_name?.toLowerCase() === selectedCategoryFilter.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [summary, tableSearch, selectedCategoryFilter]);

  if (isLoading) {
    return <LoadingSpinner label="Loading university incident intelligence from Supabase..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* University Administration Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#173D70] text-white shadow-xs">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#173D70]">
              <span>JSS Science & Technology University</span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="rounded bg-[#EBF3FC] px-1.5 py-0.5 text-[10px] text-[#173D70]">
                CAMPUS MEMORY
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1E293B]">
              Administrative Incident Dashboard • Welcome, {user?.display_name || 'Officer'}
            </h1>
            <p className="mt-0.5 text-xs text-[#64748B]">
              {currentDateFormatted} — Real-time event provenance, causal tracing & institutional audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
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

      {error && (
        <Alert
          type="error"
          title="Supabase Connection Notice"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Recorded Incidents"
          value={totalEventsCount !== null ? totalEventsCount : '—'}
          description="Total historical campus occurrences"
          icon={<Shield className="h-4 w-4" />}
          onClick={() => navigate('/events')}
        />

        <StatCard
          label="Active Open Incidents"
          value={summary?.open_event_count ?? 0}
          description="Pending review or ongoing mitigation"
          badge={
            (summary?.open_event_count ?? 0) > 0 ? (
              <Badge variant="warning" dot dotColor="bg-[#0284C7]">
                Action Required
              </Badge>
            ) : (
              <Badge variant="success" dot dotColor="bg-[#16A34A]">
                All Clear
              </Badge>
            )
          }
          onClick={() => navigate('/events?status_code=reported')}
        />

        <StatCard
          label="Critical Severity Incidents"
          value={criticalCount}
          description="High impact or hazardous conditions"
          badge={
            criticalCount > 0 ? (
              <Badge variant="danger" dot dotColor="bg-[#DC2626]">
                Priority 1
              </Badge>
            ) : (
              <Badge variant="neutral">None</Badge>
            )
          }
        />

        <StatCard
          label="High Severity Incidents"
          value={highCount}
          description="Significant academic or infrastructure disruption"
          badge={
            highCount > 0 ? (
              <Badge variant="warning" dot dotColor="bg-[#EA580C]">
                Attention
              </Badge>
            ) : (
              <Badge variant="neutral">None</Badge>
            )
          }
        />
      </div>

      {/* Charts Section: Styled with JSS STU palette */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#1E293B]">
                Open Incidents by Severity
              </h2>
              <p className="text-xs text-[#64748B]">
                Distribution across threat levels from Supabase
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#173D70] bg-[#EBF3FC] px-2 py-0.5 rounded">
              {summary?.open_by_severity?.length || 0} Levels
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {summary?.open_by_severity && summary.open_by_severity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.open_by_severity}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="display_name"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#173D70',
                      borderColor: '#0F294D',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="event_count" name="Open Incidents" radius={[4, 4, 0, 0]}>
                    {summary.open_by_severity.map((entry) => (
                      <Cell
                        key={entry.code}
                        fill={SEVERITY_COLORS[entry.code.toLowerCase()] || '#315F91'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-[#94A3B8]">
                No active severity data recorded in database
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#1E293B]">
                Open Incidents by Category
              </h2>
              <p className="text-xs text-[#64748B]">
                Distribution by institutional domains
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#173D70] bg-[#EBF3FC] px-2 py-0.5 rounded">
              {summary?.open_by_category?.length || 0} Categories
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {summary?.open_by_category && summary.open_by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.open_by_category}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="display_name"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#173D70',
                      borderColor: '#0F294D',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="event_count"
                    name="Open Incidents"
                    fill="#173D70"
                    radius={[0, 4, 4, 0]}
                  >
                    {summary.open_by_category.map((_, index) => (
                      <Cell
                        key={index}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-[#94A3B8]">
                No active categorical incidents recorded in database
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Open Incidents Table with Search & Category Filter */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="border-b border-[#E2E8F0] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#1E293B]">
                Recent Open Incidents
              </h2>
              <p className="text-xs text-[#64748B]">
                Latest live occurrences loaded directly from Supabase
              </p>
            </div>
            <Link
              to="/events"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#173D70] hover:text-[#0F294D] transition-colors"
            >
              <span>View Full Registry</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Quick Filter Bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filter recent table by code, title, or location..."
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 py-1.5 text-xs text-[#1E293B] placeholder-[#94A3B8] focus:border-[#173D70] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#173D70]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-3.5 w-3.5 text-[#64748B]" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-xs text-[#1E293B] focus:border-[#173D70] focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {summary?.open_by_category?.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Data Table with #F1F5F9 header background */}
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
              {filteredRecentEvents.length > 0 ? (
                filteredRecentEvents.map((evt: any) => {
                  const statusProps = getStatusBadgeProps(evt.status_code || evt.status_name);
                  const severityProps = getSeverityBadgeProps(evt.severity_code || evt.severity_name);

                  return (
                    <tr
                      key={evt.event_id}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => navigate(`/events/${evt.event_id}`)}
                    >
                      <td className="font-mono font-semibold text-[#173D70]">
                        {evt.event_code}
                      </td>
                      <td className="font-medium text-[#1E293B] max-w-[220px] truncate">
                        {evt.title}
                      </td>
                      <td className="text-[#64748B]">
                        {evt.category_name || evt.category_code || '—'}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${severityProps.bg} ${severityProps.text} ${severityProps.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${severityProps.dotColor}`} />
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
                        {evt.location_name || '—'}
                      </td>
                      <td className="text-[#64748B] font-tabular">
                        {formatDate(evt.started_at)}
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/events/${evt.event_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-[#173D70] hover:text-[#0F294D] hover:underline"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#94A3B8]">
                    {tableSearch || selectedCategoryFilter !== 'ALL'
                      ? 'No incidents match your filter criteria.'
                      : 'No open incidents at this time in Supabase.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
