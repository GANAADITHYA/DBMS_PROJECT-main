import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileSearch,
  GitBranch,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatRoleName, getRoleBadgeClass } from '../../utils/formatters';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navigationGroups = [
    {
      group: 'Core Administration',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Campus Locations', path: '/locations', icon: MapPin },
        { name: 'Incidents & Events', path: '/events', icon: CalendarDays },
      ],
    },
    {
      group: 'Investigation & Graph',
      items: [
        { name: 'Investigations', path: '/investigations', icon: FileSearch },
        { name: 'Causal Graph', path: '/relationships', icon: GitBranch },
        { name: 'Evidence Locker', path: '/evidence', icon: Layers },
        { name: 'Impact Assessment', path: '/impacts', icon: Zap },
      ],
    },
    {
      group: 'Analytics & References',
      items: [
        { name: 'Forensic Reports', path: '/reports', icon: BarChart3 },
        { name: 'Reference Catalog', path: '/references', icon: BookOpen },
        { name: 'Officer Profile', path: '/profile', icon: UserIcon },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container: exactly 260px width */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#E2E8F0] bg-[#FFFFFF] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full'
        }`}
      >
        {/* University Header Branding: Inspired by JSS Science and Technology University */}
        <div className="flex h-16 items-center justify-between border-b border-[#E2E8F0] px-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#173D70] text-white shadow-xs">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold tracking-tight text-[#173D70] uppercase">
                  JSS STU
                </span>
                <span className="rounded bg-[#EBF3FC] px-1 py-0.2 text-[9px] font-semibold text-[#173D70]">
                  CAMPUS
                </span>
              </div>
              <span className="block truncate text-sm font-extrabold tracking-tight text-[#1E293B]">
                CAMPUS MEMORY
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navigationGroups.map((group) => (
            <div key={group.group}>
              <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {group.group}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => onClose()}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-[#EBF3FC] text-[#173D70] font-semibold shadow-2xs border-l-[3px] border-[#173D70]'
                            : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#173D70]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive ? 'text-[#173D70]' : 'text-[#64748B] group-hover:text-[#173D70]'
                            }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Section at Bottom */}
        {user && (
          <div className="border-t border-[#E2E8F0] p-3 bg-[#F8FAFC]">
            <div className="flex items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-white p-2.5 shadow-2xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#173D70] text-xs font-bold text-white">
                {user.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-[#1E293B]">
                  {user.display_name}
                </div>
                <div className="truncate text-[11px] text-[#64748B]">
                  {user.email}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.roles?.map((r) => (
                    <span
                      key={r}
                      className={`inline-block rounded px-1.5 py-0.2 text-[9.5px] font-semibold border ${getRoleBadgeClass(
                        r
                      )}`}
                    >
                      {formatRoleName(r)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white py-1.5 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FECACA] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
