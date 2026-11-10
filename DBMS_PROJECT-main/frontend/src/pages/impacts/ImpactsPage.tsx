import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
} from 'lucide-react';
import { impactService } from '../../services/impactService';
import { eventService } from '../../services/eventService';
import { referenceService } from '../../services/referenceService';
import {
  EventSummary,
  ImpactRead,
  ReferenceAsset,
  ReferenceDepartment,
  ReferenceImpactType,
  ReferenceLocation,
  ReferenceMeasurementUnit,
  ReferenceService,
} from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export const ImpactsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEventId = searchParams.get('event_id') || '';

  const [eventsList, setEventsList] = useState<EventSummary[]>([]);
  const [impacts, setImpacts] = useState<ImpactRead[]>([]);
  const [impactTypes, setImpactTypes] = useState<ReferenceImpactType[]>([]);
  const [units, setUnits] = useState<ReferenceMeasurementUnit[]>([]);
  const [locations, setLocations] = useState<ReferenceLocation[]>([]);
  const [assets, setAssets] = useState<ReferenceAsset[]>([]);
  const [services, setServices] = useState<ReferenceService[]>([]);
  const [departments, setDepartments] = useState<ReferenceDepartment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Impact Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [typeCode, setTypeCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCode, setUnitCode] = useState('');
  const [verifStatus, setVerifStatus] = useState<'verified' | 'estimated'>('verified');
  const [estimateBasis, setEstimateBasis] = useState('');
  const [objectDesc, setObjectDesc] = useState('');
  const [targetKind, setTargetKind] = useState<'description' | 'location' | 'asset' | 'service' | 'dept'>('description');
  const [targetId, setTargetId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Impact Modal
  const [editModalImpact, setEditModalImpact] = useState<ImpactRead | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editVerifStatus, setEditVerifStatus] = useState<'verified' | 'estimated'>('verified');
  const [editEstimateBasis, setEditEstimateBasis] = useState('');
  const [editObjectDesc, setEditObjectDesc] = useState('');
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [evPage, itTypes, mUnits, locs, asts, srvs, depts] = await Promise.all([
          eventService.listEvents({ page: 1, page_size: 100 }),
          referenceService.getImpactTypes().catch(() => []),
          referenceService.getMeasurementUnits().catch(() => []),
          referenceService.getLocations().catch(() => []),
          referenceService.getAssets().catch(() => []),
          referenceService.getServices().catch(() => []),
          referenceService.getDepartments().catch(() => []),
        ]);

        setEventsList(evPage.items);
        setImpactTypes(itTypes);
        setUnits(mUnits);
        setLocations(locs);
        setAssets(asts);
        setServices(srvs);
        setDepartments(depts);

        if (itTypes.length > 0) {
          setTypeCode(itTypes[0].code);
          setUnitCode(itTypes[0].default_unit_code || (mUnits[0]?.code || 'count'));
        }

        if (!selectedEventId && evPage.items.length > 0) {
          setSearchParams({ event_id: evPage.items[0].event_id });
        }
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to initialize impact data.'));
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const fetchImpacts = async () => {
    if (!selectedEventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await impactService.listImpacts(selectedEventId);
      setImpacts(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load impacts.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchImpacts();
    }
  }, [selectedEventId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    if (verifStatus === 'estimated' && !estimateBasis.trim()) {
      setError('An estimate basis is mandatory when verification status is estimated.');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) {
      setError('Quantity must be a valid non-negative number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await impactService.addImpact(selectedEventId, {
        impact_type_code: typeCode,
        quantity: qty,
        unit_code: unitCode,
        verification_status: verifStatus,
        estimate_basis: verifStatus === 'estimated' ? estimateBasis.trim() : null,
        affected_location_id: targetKind === 'location' && targetId ? targetId : null,
        affected_asset_id: targetKind === 'asset' && targetId ? targetId : null,
        affected_service_id: targetKind === 'service' && targetId ? targetId : null,
        affected_department_id: targetKind === 'dept' && targetId ? targetId : null,
        affected_object_description:
          targetKind === 'description' && objectDesc.trim() ? objectDesc.trim() : undefined,
        data_class_code: 'internal',
      });

      setAddModalOpen(false);
      setQuantity('1');
      setEstimateBasis('');
      setObjectDesc('');
      setSuccessMessage('Impact successfully recorded.');
      fetchImpacts();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to record impact.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (imp: ImpactRead) => {
    setEditModalImpact(imp);
    setEditQuantity(String(imp.quantity));
    setEditUnitCode(imp.unit_code);
    setEditVerifStatus(imp.verification_status as any);
    setEditEstimateBasis(imp.estimate_basis || '');
    setEditObjectDesc(imp.affected_object_description || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalImpact) return;

    if (editVerifStatus === 'estimated' && !editEstimateBasis.trim()) {
      setError('An estimate basis is required when verification status is estimated.');
      return;
    }

    const qty = parseFloat(editQuantity);
    if (isNaN(qty) || qty < 0) {
      setError('Quantity must be a non-negative number.');
      return;
    }

    setIsEditingSubmitting(true);
    setError(null);
    try {
      await impactService.updateImpact(editModalImpact.impact_id, {
        quantity: qty,
        unit_code: editUnitCode || undefined,
        verification_status: editVerifStatus,
        estimate_basis: editVerifStatus === 'estimated' ? editEstimateBasis.trim() : null,
        affected_object_description: editObjectDesc.trim() || undefined,
      });

      setEditModalImpact(null);
      setSuccessMessage('Impact successfully updated.');
      fetchImpacts();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update impact.'));
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Impact Management Console
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Track and verify quantifiable damages, operational downtime, casualties, and financial impacts.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setAddModalOpen(true)}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Record Impact
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

      {/* Event Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Focus Event for Impact Accounting
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
          onClick={fetchImpacts}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh Impacts
        </Button>
      </div>

      {/* Impacts Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Verified & Estimated Impacts
            </h2>
            <p className="text-xs text-slate-500">
              Granular impact units associated with the selected incident.
            </p>
          </div>
          <Badge variant="neutral">
            {impacts.length} record(s)
          </Badge>
        </div>

        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner label="Loading impacts..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Impact Type</th>
                  <th className="px-5 py-3 font-medium">Quantity</th>
                  <th className="px-5 py-3 font-medium">Unit</th>
                  <th className="px-5 py-3 font-medium">Verification</th>
                  <th className="px-5 py-3 font-medium">Affected Target / Description</th>
                  <th className="px-5 py-3 font-medium">Estimate Basis</th>
                  <th className="px-5 py-3 font-medium">Recorded Date</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {impacts.length > 0 ? (
                  impacts.map((imp) => (
                    <tr key={imp.impact_id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {imp.impact_type_name || imp.impact_type_code}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
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
                      <td className="px-5 py-3.5 text-slate-700 max-w-[200px] truncate">
                        {imp.affected_object_description || 'General Event Target'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 max-w-[200px] truncate">
                        {imp.estimate_basis || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-tabular">
                        {formatDate(imp.recorded_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openEditModal(imp)}
                          className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-12">
                      <EmptyState
                        title="No Impacts Recorded"
                        description="No damages or quantifiable disruptions have been recorded for this event."
                        actionLabel="Add Impact"
                        onAction={() => setAddModalOpen(true)}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Impact */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Record Incident Impact"
        description="Quantify financial loss, downtime, injured persons, or damaged property."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Impact Type *
              </label>
              <select
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
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
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                {units.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.display_name} ({u.symbol || u.code})
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
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Verification Status *
              </label>
              <select
                value={verifStatus}
                onChange={(e) => setVerifStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="verified">Verified (Official documentation)</option>
                <option value="estimated">Estimated (Preliminary assessment)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Affected Entity Type
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { id: 'description', label: 'Free Text' },
                { id: 'location', label: 'Location' },
                { id: 'asset', label: 'Asset' },
                { id: 'service', label: 'Service' },
                { id: 'dept', label: 'Department' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTargetKind(t.id as any);
                    setTargetId('');
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium border ${
                    targetKind === t.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {targetKind === 'description' && (
              <input
                type="text"
                value={objectDesc}
                onChange={(e) => setObjectDesc(e.target.value)}
                placeholder="e.g., Computer Science Lab Equipment, 1st Floor Hallway"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            )}

            {targetKind === 'location' && (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="">-- Choose Location --</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.name} ({loc.location_code})
                  </option>
                ))}
              </select>
            )}

            {targetKind === 'asset' && (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="">-- Choose Asset --</option>
                {assets.map((ast) => (
                  <option key={ast.asset_id} value={ast.asset_id}>
                    {ast.name} ({ast.asset_code})
                  </option>
                ))}
              </select>
            )}

            {targetKind === 'service' && (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="">-- Choose Service --</option>
                {services.map((srv) => (
                  <option key={srv.service_id} value={srv.service_id}>
                    {srv.name} ({srv.service_code})
                  </option>
                ))}
              </select>
            )}

            {targetKind === 'dept' && (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="">-- Choose Department --</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.name} ({dept.department_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {verifStatus === 'estimated' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Estimate Basis *
              </label>
              <input
                type="text"
                required
                value={estimateBasis}
                onChange={(e) => setEstimateBasis(e.target.value)}
                placeholder="Methodology or source used to calculate estimate..."
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

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
              Save Impact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Impact */}
      <Modal
        isOpen={editModalImpact !== null}
        onClose={() => setEditModalImpact(null)}
        title="Update Impact Record"
        description="Modify quantity, unit, or verification parameters."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
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
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Unit
              </label>
              <select
                value={editUnitCode}
                onChange={(e) => setEditUnitCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                {units.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.display_name} ({u.symbol || u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Verification Status
            </label>
            <select
              value={editVerifStatus}
              onChange={(e) => setEditVerifStatus(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
            >
              <option value="verified">Verified</option>
              <option value="estimated">Estimated</option>
            </select>
          </div>

          {editVerifStatus === 'estimated' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Estimate Basis *
              </label>
              <input
                type="text"
                required
                value={editEstimateBasis}
                onChange={(e) => setEditEstimateBasis(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Object Description
            </label>
            <input
              type="text"
              value={editObjectDesc}
              onChange={(e) => setEditObjectDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalImpact(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isEditingSubmitting}>
              Update Impact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
