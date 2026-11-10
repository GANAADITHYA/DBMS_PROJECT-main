import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { referenceService } from '../../services/referenceService';
import {
  EventDetail,
  ReferenceAsset,
  ReferenceCategory,
  ReferenceEventType,
  ReferenceLocation,
  ReferenceScheduledActivity,
  ReferenceService,
  ReferenceSeverityLevel,
} from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toIsoWithTz } from '../../utils/formatters';

export const EditEventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [eventTypeId, setEventTypeId] = useState('');
  const [severityCode, setSeverityCode] = useState('');
  const [locationId, setLocationId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [scheduledActivityId, setScheduledActivityId] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [sourceNote, setSourceNote] = useState('');

  // Reference lists
  const [categories, setCategories] = useState<ReferenceCategory[]>([]);
  const [allEventTypes, setAllEventTypes] = useState<ReferenceEventType[]>([]);
  const [severities, setSeverities] = useState<ReferenceSeverityLevel[]>([]);
  const [locations, setLocations] = useState<ReferenceLocation[]>([]);
  const [assets, setAssets] = useState<ReferenceAsset[]>([]);
  const [, setServices] = useState<ReferenceService[]>([]);
  const [, setActivities] = useState<ReferenceScheduledActivity[]>([]);

  useEffect(() => {
    if (!eventId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [evt, cats, evTypes, sevs, locs, asts, srvs, acts] = await Promise.all([
          eventService.getEvent(eventId),
          referenceService.getCategories(),
          referenceService.getEventTypes(),
          referenceService.getSeverityLevels(),
          referenceService.getLocations(),
          referenceService.getAssets(),
          referenceService.getServices(),
          referenceService.getScheduledActivities(),
        ]);

        setEvent(evt);
        setTitle(evt.title);
        setDescription(evt.description);
        setCategoryCode(evt.category_code);
        setEventTypeId(evt.event_type_id);
        setSeverityCode(evt.severity_code);
        setLocationId(evt.location_id || '');
        setAssetId(evt.asset_id || '');
        setServiceId(evt.service_id || '');
        setScheduledActivityId(evt.scheduled_activity_id || '');
        setStartedAt(evt.started_at ? new Date(evt.started_at).toISOString().slice(0, 16) : '');
        setEndedAt(evt.ended_at ? new Date(evt.ended_at).toISOString().slice(0, 16) : '');
        setSourceNote(evt.source_note || '');

        setCategories(cats);
        setAllEventTypes(evTypes);
        setSeverities(sevs);
        setLocations(locs);
        setAssets(asts);
        setServices(srvs);
        setActivities(acts);
      } catch (err) {
        setErrorMessage(extractErrorMessage(err, 'Failed to load event for editing.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  const availableEventTypes = allEventTypes.filter(
    (et) => !categoryCode || et.category_code === categoryCode
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Title is required.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Description is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category_code: categoryCode || undefined,
        event_type_id: eventTypeId || undefined,
        severity_code: severityCode || undefined,
        location_id: locationId || null,
        asset_id: assetId || null,
        service_id: serviceId || null,
        scheduled_activity_id: scheduledActivityId || null,
        started_at: startedAt ? toIsoWithTz(new Date(startedAt)) : undefined,
        ended_at: endedAt ? toIsoWithTz(new Date(endedAt)) : null,
        source_note: sourceNote.trim() || null,
      };

      await eventService.updateEvent(eventId, payload);
      navigate(`/events/${eventId}`);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save changes.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading event..." fullHeight />;
  }

  if (!event) {
    return (
      <div className="p-8 text-center text-slate-500">
        Incident record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Events', path: '/events' },
          { label: event.event_code, path: `/events/${event.event_id}` },
          { label: 'Edit' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/events/${event.event_id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Edit Incident: {event.event_code}
            </h1>
            <p className="text-xs text-slate-500">
              Update editable properties of this recorded campus occurrence.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          title="Update Error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Incident Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Category
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Event Type
              </label>
              <select
                value={eventTypeId}
                onChange={(e) => setEventTypeId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                {availableEventTypes.map((et) => (
                  <option key={et.event_type_id} value={et.event_type_id}>
                    {et.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Severity Level
              </label>
              <select
                value={severityCode}
                onChange={(e) => setSeverityCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                {severities.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Started At
              </label>
              <input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Ended At (Optional)
              </label>
              <input
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Linked Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="">-- None --</option>
                {locations.map((l) => (
                  <option key={l.location_id} value={l.location_id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Linked Asset
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:border-slate-500 focus:outline-none"
              >
                <option value="">-- None --</option>
                {assets.map((a) => (
                  <option key={a.asset_id} value={a.asset_id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Source Note
            </label>
            <input
              type="text"
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              placeholder="e.g., Reported via campus safety hotline #4"
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/events/${event.event_id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
