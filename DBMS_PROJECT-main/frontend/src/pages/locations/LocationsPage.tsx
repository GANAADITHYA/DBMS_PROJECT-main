import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  DoorOpen,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  MapPin,
  Layers,
  GraduationCap,
  FlaskConical,
  Trophy,
  Home,
  Landmark,
  School,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { locationService } from '../../services/locationService';
import { referenceService } from '../../services/referenceService';
import {
  BuildingSummary,
  LocationStats,
  ReferenceDepartment,
  ReferenceLocation,
  RoomCreatePayload,
} from '../../types';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Alert } from '../../components/common/Alert';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';

export const LocationsPage: React.FC = () => {
  // Data states
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [departments, setDepartments] = useState<ReferenceDepartment[]>([]);
  const [buildingRoomsMap, setBuildingRoomsMap] = useState<Record<string, ReferenceLocation[]>>({});
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState<Record<string, boolean>>({});
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states for Add / Edit Room
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ReferenceLocation | null>(null);
  const [selectedBuildingForRoom, setSelectedBuildingForRoom] = useState<BuildingSummary | null>(null);

  // Form Fields
  const [floorNumber, setFloorNumber] = useState('Ground Floor');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomType, setRoomType] = useState('classroom');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [roomToDelete, setRoomToDelete] = useState<ReferenceLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [statsData, buildingsData, deptsData] = await Promise.all([
        locationService.getStats(),
        locationService.getBuildings(),
        referenceService.getDepartments(),
      ]);
      setStats(statsData);
      setBuildings(buildingsData);
      setDepartments(deptsData);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to fetch campus locations from database.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch rooms for a specific building when expanded
  const toggleBuildingExpand = async (building: BuildingSummary) => {
    const isCurrentlyExpanded = !!expandedBuildings[building.location_id];
    const newExpandedState = { ...expandedBuildings, [building.location_id]: !isCurrentlyExpanded };
    setExpandedBuildings(newExpandedState);

    // If expanding and rooms not yet loaded, load them
    if (!isCurrentlyExpanded && !buildingRoomsMap[building.location_id]) {
      setIsLoadingRooms((prev) => ({ ...prev, [building.location_id]: true }));
      try {
        const rooms = await locationService.getBuildingRooms(building.location_id);
        setBuildingRoomsMap((prev) => ({ ...prev, [building.location_id]: rooms }));
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setIsLoadingRooms((prev) => ({ ...prev, [building.location_id]: false }));
      }
    }
  };

  // Open "Add Room" modal
  const handleOpenAddRoomModal = (building: BuildingSummary) => {
    setSelectedBuildingForRoom(building);
    setEditingRoom(null);
    setFloorNumber('Ground Floor');
    setRoomName('');
    const prefix = building.location_code.replace('BLDG-', '').replace('INST-', '').slice(0, 4);
    setRoomCode(`${prefix}-`);
    setRoomType('classroom');
    setDepartmentId('');
    setRoomDescription('');
    setIsRoomModalOpen(true);
  };

  // Open "Edit Room" modal
  const handleOpenEditRoomModal = (room: ReferenceLocation, building: BuildingSummary) => {
    setSelectedBuildingForRoom(building);
    setEditingRoom(room);
    setFloorNumber(room.floor_number || 'Ground Floor');
    setRoomName(room.name);
    setRoomCode(room.location_code);
    setRoomType(room.location_type || 'classroom');
    setDepartmentId(room.department_id || '');
    setRoomDescription(room.description || '');
    setIsRoomModalOpen(true);
  };

  // Handle Room form submission
  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuildingForRoom) return;

    if (!roomName.trim()) {
      setFeedback({ type: 'error', message: 'Room name is required.' });
      return;
    }
    if (!roomCode.trim()) {
      setFeedback({ type: 'error', message: 'Room code is required.' });
      return;
    }
    if (!floorNumber.trim()) {
      setFeedback({ type: 'error', message: 'Floor number is required.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (editingRoom) {
        // Update existing room
        const updated = await locationService.updateRoom(editingRoom.location_id, {
          name: roomName.trim(),
          location_code: roomCode.trim().toUpperCase(),
          location_type: roomType,
          floor_number: floorNumber.trim(),
          department_id: departmentId || null,
          description: roomDescription.trim() || null,
        });

        // Update local state
        setBuildingRoomsMap((prev) => ({
          ...prev,
          [selectedBuildingForRoom.location_id]: (prev[selectedBuildingForRoom.location_id] || []).map(
            (r) => (r.location_id === updated.location_id ? updated : r)
          ),
        }));

        setFeedback({
          type: 'success',
          message: `Room "${updated.name}" updated successfully.`,
        });
      } else {
        // Create new room
        const payload: RoomCreatePayload = {
          parent_location_id: selectedBuildingForRoom.location_id,
          name: roomName.trim(),
          location_code: roomCode.trim().toUpperCase(),
          location_type: roomType,
          floor_number: floorNumber.trim(),
          department_id: departmentId || null,
          description: roomDescription.trim() || null,
        };

        const created = await locationService.createRoom(payload);

        // Update local rooms list for the building
        setBuildingRoomsMap((prev) => ({
          ...prev,
          [selectedBuildingForRoom.location_id]: [
            ...(prev[selectedBuildingForRoom.location_id] || []),
            created,
          ],
        }));

        // Update building's room count
        setBuildings((prev) =>
          prev.map((b) =>
            b.location_id === selectedBuildingForRoom.location_id
              ? { ...b, room_count: b.room_count + 1 }
              : b
          )
        );

        // Ensure expanded so user sees the newly added room
        setExpandedBuildings((prev) => ({
          ...prev,
          [selectedBuildingForRoom.location_id]: true,
        }));

        setFeedback({
          type: 'success',
          message: `Room "${created.name}" (${created.location_code}) registered under ${selectedBuildingForRoom.name}.`,
        });
      }

      // Refresh stats
      locationService.getStats().then(setStats).catch(() => {});
      setIsRoomModalOpen(false);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to save room details.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Room Deletion
  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;

    setIsDeleting(true);
    setFeedback(null);
    try {
      await locationService.deleteRoom(roomToDelete.location_id);

      // Remove from map
      const buildingId = roomToDelete.parent_location_id;
      if (buildingId) {
        setBuildingRoomsMap((prev) => ({
          ...prev,
          [buildingId]: (prev[buildingId] || []).filter(
            (r) => r.location_id !== roomToDelete.location_id
          ),
        }));
        // Decrement room count
        setBuildings((prev) =>
          prev.map((b) =>
            b.location_id === buildingId
              ? { ...b, room_count: Math.max(0, b.room_count - 1) }
              : b
          )
        );
      }

      setFeedback({
        type: 'success',
        message: `Room "${roomToDelete.name}" removed successfully.`,
      });
      setRoomToDelete(null);
      // Refresh stats
      locationService.getStats().then(setStats).catch(() => {});
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to delete room.'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered buildings
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'academic' && b.location_type !== 'building') return false;
        if (selectedCategory === 'sports' && b.location_type !== 'sports') return false;
        if (selectedCategory === 'hostel' && b.location_type !== 'hostel') return false;
        if (selectedCategory === 'facility' && !['facility', 'landmark'].includes(b.location_type)) return false;
        if (selectedCategory === 'institutions' && !b.location_code.startsWith('INST-')) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesBuilding =
          b.name.toLowerCase().includes(query) ||
          b.location_code.toLowerCase().includes(query) ||
          (b.map_number !== null && `#${b.map_number}`.includes(query)) ||
          (b.map_number !== null && `${b.map_number}` === query);

        // Check if any room matches
        const rooms = buildingRoomsMap[b.location_id] || [];
        const matchesRoom = rooms.some(
          (r) =>
            r.name.toLowerCase().includes(query) ||
            r.location_code.toLowerCase().includes(query) ||
            (r.floor_number && r.floor_number.toLowerCase().includes(query))
        );

        return matchesBuilding || matchesRoom;
      }

      return true;
    });
  }, [buildings, selectedCategory, searchQuery, buildingRoomsMap]);

  // Category Icon helper
  const getCategoryIcon = (type: string, code: string) => {
    if (code.startsWith('INST-')) return <School className="h-4 w-4 text-[#173D70]" />;
    switch (type) {
      case 'sports':
        return <Trophy className="h-4 w-4 text-[#D97706]" />;
      case 'hostel':
        return <Home className="h-4 w-4 text-[#0284C7]" />;
      case 'facility':
      case 'landmark':
        return <Landmark className="h-4 w-4 text-[#7C3AED]" />;
      case 'lab':
        return <FlaskConical className="h-4 w-4 text-[#16A34A]" />;
      default:
        return <Building2 className="h-4 w-4 text-[#173D70]" />;
    }
  };

  const getCategoryBadgeClass = (type: string, code: string) => {
    if (code.startsWith('INST-')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    switch (type) {
      case 'sports':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'hostel':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'facility':
      case 'landmark':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-[#EBF3FC] text-[#173D70] border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Core Administration', path: '/dashboard' },
            { label: 'Campus Location Management' },
          ]}
        />
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#173D70]">
              <GraduationCap className="h-4 w-4" />
              <span>JSS Science & Technology University</span>
              <span className="text-[#CBD5E1]">•</span>
              <span>Campus Infrastructure Registry</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1E293B]">
              Campus Location Management
            </h1>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Directory of all 36 campus buildings, facilities, faculties, and room allocations stored in Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {feedback && (
        <Alert
          type={feedback.type}
          title={feedback.type === 'success' ? 'Operation Completed' : 'Database Error'}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* KPI Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Locations
              </span>
              <MapPin className="h-4 w-4 text-[#173D70]" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#173D70]">
              {stats.total_locations}
            </div>
            <div className="text-[10px] text-[#94A3B8]">Total registered spaces</div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Buildings
              </span>
              <Building2 className="h-4 w-4 text-[#315F91]" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#1E293B]">
              {stats.total_buildings}
            </div>
            <div className="text-[10px] text-[#94A3B8]">Numbered landmarks</div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Classrooms
              </span>
              <DoorOpen className="h-4 w-4 text-[#0284C7]" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#0284C7]">
              {stats.total_classrooms}
            </div>
            <div className="text-[10px] text-[#94A3B8]">Lecture halls & rooms</div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Laboratories
              </span>
              <FlaskConical className="h-4 w-4 text-[#16A34A]" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#16A34A]">
              {stats.total_laboratories}
            </div>
            <div className="text-[10px] text-[#94A3B8]">Specialized labs</div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Floors
              </span>
              <Layers className="h-4 w-4 text-[#7C3AED]" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#7C3AED]">
              {stats.total_floors > 0 ? stats.total_floors : 'Multi'}
            </div>
            <div className="text-[10px] text-[#94A3B8]">Registered tiers</div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Facilities
              </span>
              <Landmark className="h-4 w-4 text-[#D97706]" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[#D97706]">
              {stats.total_facilities}
            </div>
            <div className="text-[10px] text-[#94A3B8]">Amenities & grounds</div>
          </div>
        </div>
      )}

      {/* Search & Category Filter Toolbar */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by building name, code, Map #, or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-[#1E293B] placeholder-[#94A3B8] focus:border-[#173D70] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#173D70]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-[#94A3B8] hover:text-[#1E293B]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-3.5 w-3.5 text-[#64748B] shrink-0 mr-1" />
            {[
              { id: 'all', label: 'All (36+)' },
              { id: 'academic', label: 'Academic & Admin' },
              { id: 'sports', label: 'Sports' },
              { id: 'hostel', label: 'Hostels' },
              { id: 'facility', label: 'Amenities & Landmarks' },
              { id: 'institutions', label: 'Other Institutions' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'border-[#173D70] bg-[#173D70] text-white shadow-2xs'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#EBF3FC] hover:text-[#173D70]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Buildings & Locations List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white">
          <LoadingSpinner size="lg" label="Loading campus buildings from Supabase..." />
        </div>
      ) : filteredBuildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
          <Building2 className="h-12 w-12 text-[#94A3B8]" />
          <h3 className="mt-3 text-sm font-bold text-[#1E293B]">No Campus Locations Found</h3>
          <p className="mt-1 text-xs text-[#64748B]">
            No buildings matched your search &apos;{searchQuery}&apos; in category &apos;{selectedCategory}&apos;.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Campus Structures ({filteredBuildings.length} of {buildings.length})
            </span>
            <span className="text-xs text-[#94A3B8]">
              Click any building to expand rooms or click &quot;+ Add Room&quot;
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredBuildings.map((b) => {
              const isExpanded = !!expandedBuildings[b.location_id];
              const rooms = buildingRoomsMap[b.location_id] || [];
              const isLoadingThisRooms = !!isLoadingRooms[b.location_id];

              // Group rooms by floor
              const roomsByFloor: Record<string, ReferenceLocation[]> = {};
              rooms.forEach((r) => {
                const flr = r.floor_number || 'General / Unspecified';
                if (!roomsByFloor[flr]) roomsByFloor[flr] = [];
                roomsByFloor[flr].push(r);
              });

              return (
                <div
                  key={b.location_id}
                  className="rounded-xl border border-[#E2E8F0] bg-white shadow-2xs transition-all overflow-hidden"
                >
                  {/* Building Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-white hover:bg-[#F8FAFC]/60 transition-colors">
                    <div
                      className="flex items-start sm:items-center gap-3 cursor-pointer flex-1"
                      onClick={() => toggleBuildingExpand(b)}
                    >
                      <button
                        type="button"
                        className="mt-0.5 sm:mt-0 p-1 text-[#64748B] hover:text-[#173D70] transition-colors rounded-md"
                        aria-label="Expand building"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-[#173D70]" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {/* Official Map Number Badge */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#173D70] text-white shadow-2xs">
                        {b.map_number ? (
                          <span className="text-xs font-extrabold tracking-tight">
                            #{b.map_number}
                          </span>
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[#1E293B] hover:text-[#173D70] transition-colors">
                            {b.name}
                          </h3>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getCategoryBadgeClass(
                              b.location_type,
                              b.location_code
                            )}`}
                          >
                            {b.location_type}
                          </span>
                          <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10.5px] font-mono text-[#475569]">
                            {b.location_code}
                          </span>
                        </div>
                        {b.description && (
                          <p className="mt-0.5 text-xs text-[#64748B] line-clamp-1">
                            {b.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Room count pill and Add Room button */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pl-7 sm:pl-0">
                      <span className="rounded-full bg-[#EBF3FC] px-2.5 py-1 text-xs font-semibold text-[#173D70]">
                        {b.room_count} {b.room_count === 1 ? 'Room' : 'Rooms'}
                      </span>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddRoomModal(b);
                        }}
                        className="bg-[#173D70] hover:bg-[#0F294D] text-white text-xs h-8 px-3"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Room
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Rooms Accordion Section */}
                  {isExpanded && (
                    <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      {isLoadingThisRooms ? (
                        <div className="flex py-6 justify-center">
                          <LoadingSpinner size="sm" label="Loading room allocations..." />
                        </div>
                      ) : rooms.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-center">
                          <DoorOpen className="mx-auto h-7 w-7 text-[#94A3B8]" />
                          <p className="mt-2 text-xs font-semibold text-[#1E293B]">
                            No rooms registered yet for {b.name}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            Click &quot;Add Room&quot; above to register classrooms, labs, faculty offices, or halls.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAddRoomModal(b)}
                            className="mt-3 text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1 text-[#173D70]" />
                            Add First Room
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(roomsByFloor).map(([floor, floorRooms]) => (
                            <div key={floor} className="space-y-2">
                              {/* Floor Label */}
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#173D70] text-[10px] font-bold text-white">
                                  L
                                </span>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#173D70]">
                                  {floor} ({floorRooms.length})
                                </h4>
                                <div className="flex-1 border-b border-[#E2E8F0]" />
                              </div>

                              {/* Floor Rooms Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {floorRooms.map((r) => (
                                  <div
                                    key={r.location_id}
                                    className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-2xs hover:border-[#CBD5E1] transition-all"
                                  >
                                    <div className="min-w-0 flex-1 pr-2">
                                      <div className="flex items-center gap-1.5">
                                        {getCategoryIcon(r.location_type, r.location_code)}
                                        <span className="font-bold text-xs text-[#1E293B] truncate">
                                          {r.name}
                                        </span>
                                      </div>

                                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                        <span className="rounded bg-[#F1F5F9] px-1.5 py-0.2 font-mono text-[10px] text-[#475569]">
                                          {r.location_code}
                                        </span>
                                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9.5px] font-medium text-slate-600 capitalize">
                                          {r.location_type}
                                        </span>
                                        {r.department_name && (
                                          <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9.5px] font-semibold text-indigo-700">
                                            {r.department_name}
                                          </span>
                                        )}
                                      </div>

                                      {r.description && (
                                        <p className="mt-1 text-[11px] text-[#64748B] line-clamp-1">
                                          {r.description}
                                        </p>
                                      )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditRoomModal(r, b)}
                                        className="rounded-md p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#173D70] transition-colors"
                                        title="Edit room details"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRoomToDelete(r)}
                                        className="rounded-md p-1.5 text-[#64748B] hover:bg-red-50 hover:text-red-600 transition-colors"
                                        title="Delete room"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Room Modal Dialog */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => !isSubmitting && setIsRoomModalOpen(false)}
        title={
          editingRoom
            ? `Edit Room: ${editingRoom.name}`
            : `Add Room to ${selectedBuildingForRoom?.name || 'Building'}`
        }
      >
        <form onSubmit={handleRoomSubmit} className="space-y-4">
          {/* Target Building Info */}
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#173D70]" />
              <span className="text-xs font-bold text-[#1E293B]">
                {selectedBuildingForRoom?.name}
              </span>
              {selectedBuildingForRoom?.map_number && (
                <span className="rounded bg-[#173D70] px-1.5 py-0.2 text-[10px] font-bold text-white">
                  Map #{selectedBuildingForRoom.map_number}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              Code: {selectedBuildingForRoom?.location_code} • {selectedBuildingForRoom?.location_type}
            </p>
          </div>

          {/* Floor Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
              Floor Number *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', 'Basement'].map(
                (fl) => (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setFloorNumber(fl)}
                    className={`rounded px-2.5 py-1 text-xs font-medium border transition-all ${
                      floorNumber === fl
                        ? 'border-[#173D70] bg-[#EBF3FC] text-[#173D70] font-bold'
                        : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {fl}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              required
              value={floorNumber}
              onChange={(e) => setFloorNumber(e.target.value)}
              placeholder="e.g. Ground Floor, 2nd Floor, Mezzanine"
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs text-[#1E293B] focus:border-[#173D70] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Room Name and Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Room Name *
              </label>
              <input
                type="text"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Advanced AI & ML Lab"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs text-[#1E293B] focus:border-[#173D70] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Room Code *
              </label>
              <input
                type="text"
                required
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="e.g. GJB-LAB-204"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs font-mono uppercase text-[#1E293B] focus:border-[#173D70] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Room Type and Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Room Type *
              </label>
              <select
                required
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs text-[#1E293B] focus:border-[#173D70] focus:outline-none"
              >
                <option value="classroom">Classroom / Lecture Hall</option>
                <option value="lab">Computer / Science Laboratory</option>
                <option value="office">Faculty / Department Office</option>
                <option value="auditorium">Auditorium / Seminar Hall</option>
                <option value="conference_room">Conference / Meeting Room</option>
                <option value="facility">Utility / Campus Facility</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Department (Optional)
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs text-[#1E293B] focus:border-[#173D70] focus:outline-none"
              >
                <option value="">-- No Specific Department --</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.name} ({d.department_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              placeholder="Capacity, equipment, seating layout, or notes..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs text-[#1E293B] focus:border-[#173D70] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsRoomModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-[#173D70] hover:bg-[#0F294D] text-white"
            >
              {editingRoom ? 'Update Room' : 'Save Room to Supabase'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!roomToDelete}
        onClose={() => !isDeleting && setRoomToDelete(null)}
        title="Confirm Room Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 border border-red-100">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-900">
                Are you sure you want to delete this room?
              </p>
              <p className="mt-1 text-xs text-red-700">
                You are about to remove <strong>{roomToDelete?.name}</strong> ({roomToDelete?.location_code}) from the database.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setRoomToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteRoom}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
