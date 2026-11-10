import React, { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { referenceService } from '../../services/referenceService';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const REFERENCE_COLLECTIONS = [
  { id: 'event_categories', label: 'Categories', desc: 'Incident classification taxonomy' },
  { id: 'event_types', label: 'Event Types', desc: 'Specific incident subtypes' },
  { id: 'event_statuses', label: 'Event Statuses', desc: 'Incident lifecycle states' },
  { id: 'status_transitions', label: 'Status Transitions', desc: 'Permitted workflow progressions' },
  { id: 'severity_levels', label: 'Severity Levels', desc: 'Impact threat ranks' },
  { id: 'relationship_statuses', label: 'Relationship Statuses', desc: 'Causal link confidence states' },
  { id: 'evidence_types', label: 'Evidence Types', desc: 'Classes of evidentiary proof' },
  { id: 'impact_types', label: 'Impact Types', desc: 'Financial, physical, and downtime impact domains' },
  { id: 'measurement_units', label: 'Measurement Units', desc: 'Metric dimensions and symbols' },
  { id: 'data_classes', label: 'Data Classes', desc: 'Information security classifications' },
  { id: 'departments', label: 'Departments', desc: 'Campus academic & operational units' },
  { id: 'locations', label: 'Locations', desc: 'Buildings, grounds, and physical zones' },
  { id: 'assets', label: 'Assets', desc: 'Physical infrastructure and laboratory gear' },
  { id: 'services', label: 'Services', desc: 'Campus IT, utility, and logistical services' },
  { id: 'scheduled_activities', label: 'Scheduled Activities', desc: 'Lectures, exams, and campus events' },
];

export const ReferencesPage: React.FC = () => {
  const [activeCollection, setActiveCollection] = useState('event_categories');
  const [data, setData] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = async (colName: string, force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await referenceService.getReference(colName, force);
      setData(rows);
    } catch (err) {
      setError(extractErrorMessage(err, `Failed to load reference collection: ${colName}`));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection(activeCollection);
    setSearchFilter('');
  }, [activeCollection]);

  const activeMeta = REFERENCE_COLLECTIONS.find((c) => c.id === activeCollection);

  // Filter rows based on search
  const filteredData = data.filter((row) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return Object.values(row).some(
      (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(term)
    );
  });

  // Extract columns dynamically from the first row
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            System Reference Data
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Inspection console for standardized classifications, transition rules, and campus taxonomies.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchCollection(activeCollection, true)}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Reload Dictionary
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

      {/* Collection Navigation Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Select Reference Collection ({REFERENCE_COLLECTIONS.length} available)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {REFERENCE_COLLECTIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCollection(c.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                activeCollection === c.id
                  ? 'border-[#173D70] bg-[#173D70] text-white shadow-2xs font-semibold'
                  : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#EBF3FC] hover:text-[#173D70]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reference Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                {activeMeta?.label}
              </h2>
              <Badge variant="neutral">
                {filteredData.length} records
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeMeta?.desc} • Endpoint: <code className="font-mono text-slate-700">/api/v1/reference/{activeCollection}</code>
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference rows..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner label="Querying reference dataset..." />
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500 sticky top-0">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      {columns.map((col) => {
                        const val = row[col];
                        return (
                          <td key={col} className="px-5 py-3">
                            {typeof val === 'boolean' ? (
                              <Badge variant={val ? 'success' : 'neutral'}>
                                {val ? 'Yes' : 'No'}
                              </Badge>
                            ) : val === null || val === undefined ? (
                              <span className="text-slate-300 font-mono">—</span>
                            ) : (
                              <span
                                className={
                                  col.includes('id') || col.includes('code')
                                    ? 'font-mono text-slate-800'
                                    : 'text-slate-800'
                                }
                              >
                                {String(val)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length || 1} className="px-5 py-8 text-center text-slate-400">
                      No records found matching the query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
