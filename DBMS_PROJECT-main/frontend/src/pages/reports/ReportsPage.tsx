import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  FileSearch,
  Printer,
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
import { reportService } from '../../services/reportService';
import { eventService } from '../../services/eventService';
import {
  EventSummary,
  EventSummaryReport,
  RecurrenceReport,
} from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toIsoWithTz, formatDateOnly } from '../../utils/formatters';

const CHART_COLORS = ['#173D70', '#315F91', '#0284C7', '#7C3AED', '#16A34A', '#EA580C'];

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  // Mode: Summary Report vs Recurrence Analysis
  const [activeTab, setActiveTab] = useState<'summary' | 'recurrence'>('summary');

  // Date Range (default: last 30 days to now)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  // Summary Report Data
  const [summaryReport, setSummaryReport] = useState<EventSummaryReport | null>(null);
  const [recurrenceReport, setRecurrenceReport] = useState<RecurrenceReport | null>(null);

  // Events list for quick navigation to individual investigation report
  const [eventsList, setEventsList] = useState<EventSummary[]>([]);
  const [selectedInspectEventId, setSelectedInspectEventId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventService.listEvents({ page: 1, page_size: 50 }).then((res) => {
      setEventsList(res.items);
      if (res.items.length > 0) setSelectedInspectEventId(res.items[0].event_id);
    }).catch(() => {});
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startIso = toIsoWithTz(new Date(`${startDate}T00:00:00`));
      const endIso = toIsoWithTz(new Date(`${endDate}T23:59:59`));

      if (activeTab === 'summary') {
        const data = await reportService.getEventSummaryReport(startIso, endIso);
        setSummaryReport(data);
      } else {
        const data = await reportService.getRecurrenceReport(startIso, endIso);
        setRecurrenceReport(data);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to generate report from backend.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  // Aggregate category counts for charts
  const categoryAggregates = summaryReport?.groups.reduce((acc, g) => {
    const existing = acc.find((item) => item.category === g.category_name);
    if (existing) {
      existing.count += g.event_count;
    } else {
      acc.push({ category: g.category_name, count: g.event_count });
    }
    return acc;
  }, [] as Array<{ category: string; count: number }>) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Institutional Reports & Analytics
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Executive summaries, recurrence patterns, and detailed investigation records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="h-3.5 w-3.5" />}
          >
            Print Report
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          title="Reporting Notice"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Direct Event Investigation Dossier Navigation Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <FileSearch className="h-4 w-4 text-teal-600" />
            Specific Incident Dossier Report
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate an individual forensic investigation dossier with root causes and blast radius.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedInspectEventId}
            onChange={(e) => setSelectedInspectEventId(e.target.value)}
            className="rounded-lg border border-slate-300 py-1.5 px-3 text-xs bg-white text-slate-800 focus:outline-none max-w-xs"
          >
            {eventsList.map((e) => (
              <option key={e.event_id} value={e.event_id}>
                [{e.event_code}] {e.title}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => {
              if (selectedInspectEventId) {
                navigate(`/reports/investigation/${selectedInspectEventId}`);
              }
            }}
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          >
            Open Dossier
          </Button>
        </div>
      </div>

      {/* Report Controls: Date Filter & Mode */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              onClick={() => setActiveTab('summary')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'bg-[#173D70] text-white shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#173D70]'
              }`}
            >
              Event Summary Report
            </button>
            <button
              onClick={() => setActiveTab('recurrence')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'recurrence'
                  ? 'bg-[#173D70] text-white shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#173D70]'
              }`}
            >
              Recurrence Analytics
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-300 py-1 px-2.5 text-xs text-slate-800 bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-300 py-1 px-2.5 text-xs text-slate-800 bg-white focus:outline-none"
              />
            </div>
            <Button
              size="sm"
              onClick={fetchReports}
              isLoading={isLoading}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-xs">
          <LoadingSpinner label="Compiling report statistics..." />
        </div>
      ) : activeTab === 'summary' && summaryReport ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Documented Events"
              value={summaryReport.total_events}
              description={`Between ${formatDateOnly(summaryReport.started_after)} and ${formatDateOnly(summaryReport.started_before)}`}
            />
            <StatCard
              label="Reporting Categories"
              value={categoryAggregates.length}
              description="Distinct incident classifications"
            />
            <StatCard
              label="Categorical Groups"
              value={summaryReport.groups.length}
              description="Category & status permutations"
            />
          </div>

          {/* Chart & Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                Events by Category
              </h2>
              <div className="mt-4 h-64 w-full">
                {categoryAggregates.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryAggregates}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" name="Total Events" radius={[4, 4, 0, 0]}>
                        {categoryAggregates.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No data in selected date range
                  </div>
                )}
              </div>
            </div>

            {/* Groups Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-sm font-semibold text-slate-900">
                  Category & Status Breakdown
                </h2>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Category</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                      <th className="px-5 py-2.5 font-medium text-right">Event Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {summaryReport.groups.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-medium text-slate-900">
                          {g.category_name}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600">
                          {g.status_name}
                        </td>
                        <td className="px-5 py-2.5 font-mono font-bold text-slate-900 text-right">
                          {g.event_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'recurrence' && recurrenceReport ? (
        <div className="space-y-6">
          {recurrenceReport.note && (
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200">
              <span className="font-semibold">Note: </span>
              {recurrenceReport.note}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Location Recurrence */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-100 p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Location Incident Recurrence
                  </h2>
                  <p className="text-xs text-slate-500">
                    High-incident physical zones on campus
                  </p>
                </div>
                <Badge variant="neutral">
                  {recurrenceReport.locations.length} location(s)
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Location Code</th>
                      <th className="px-5 py-3 font-medium">Location Name</th>
                      <th className="px-5 py-3 font-medium text-right">Incidents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recurrenceReport.locations.length > 0 ? (
                      recurrenceReport.locations.map((loc) => (
                        <tr key={loc.object_id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5 font-mono font-medium text-slate-900">
                            {loc.object_code}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-800">
                            {loc.object_name}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-right">
                            {loc.event_count}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-slate-400">
                          No recurring incidents recorded by location in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Asset Recurrence */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-100 p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Asset Incident Recurrence
                  </h2>
                  <p className="text-xs text-slate-500">
                    Repeatedly failing hardware, infrastructure or vehicles
                  </p>
                </div>
                <Badge variant="neutral">
                  {recurrenceReport.assets.length} asset(s)
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Asset Code</th>
                      <th className="px-5 py-3 font-medium">Asset Name</th>
                      <th className="px-5 py-3 font-medium text-right">Incidents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recurrenceReport.assets.length > 0 ? (
                      recurrenceReport.assets.map((ast) => (
                        <tr key={ast.object_id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5 font-mono font-medium text-slate-900">
                            {ast.object_code}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-800">
                            {ast.object_name}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-right">
                            {ast.event_count}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-slate-400">
                          No recurring incidents recorded by asset in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
