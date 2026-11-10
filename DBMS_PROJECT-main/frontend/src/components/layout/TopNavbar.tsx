import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Plus,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/apiClient';
import { Button } from '../common/Button';

interface TopNavbarProps {
  onOpenMobileMenu: () => void;
  title?: string;
}

interface DbHealthState {
  status: 'ready' | 'checking' | 'offline';
  serverVersion?: string;
  dbUser?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [dbHealth, setDbHealth] = useState<DbHealthState>({ status: 'checking' });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Periodic actual Supabase database health check
  useEffect(() => {
    let isMounted = true;
    const checkDbHealth = async () => {
      try {
        const response = await apiClient.get('/health/database');
        if (!isMounted) return;
        if (response.data?.status === 'ready') {
          setDbHealth({
            status: 'ready',
            serverVersion: response.data.server_version || '17.11',
            dbUser: response.data.db_user || 'postgres',
          });
        } else {
          setDbHealth({ status: 'offline' });
        }
      } catch {
        if (isMounted) setDbHealth({ status: 'offline' });
      }
    };

    checkDbHealth();
    const interval = setInterval(checkDbHealth, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic breadcrumbs based on route
  const getBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: { label: string; path: string }[] = [];

    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      let label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');

      if (part === 'events' && index === 0) label = 'Incidents & Events';
      else if (part === 'create') label = 'Report New Incident';
      else if (part === 'investigations') label = 'Investigations';
      else if (part === 'relationships') label = 'Causal Graph';
      else if (part === 'evidence') label = 'Evidence Locker';
      else if (part === 'impacts') label = 'Impacts';
      else if (part === 'reports') label = 'Forensic Reports';
      else if (part === 'references') label = 'Reference Data';
      else if (part === 'profile') label = 'Officer Profile';
      else if (part.length > 20 || part.startsWith('EVT-')) label = part;

      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-6 shadow-2xs">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#173D70] lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb Navigation Trail */}
        <nav className="hidden sm:flex items-center space-x-1.5 text-xs text-[#64748B]">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 hover:text-[#173D70] transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="font-medium">JSS STU</span>
          </Link>

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.path}>
                <ChevronRight className="h-3 w-3 text-[#CBD5E1] shrink-0" />
                {isLast ? (
                  <span className="font-semibold text-[#173D70] truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="hover:text-[#173D70] transition-colors truncate max-w-[150px]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident code, title, or keywords..."
            className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-4 py-1.5 text-xs text-[#1E293B] placeholder-[#94A3B8] transition-all focus:border-[#173D70] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#173D70]"
          />
        </form>
      </div>

      {/* Right Actions: Supabase indicator, Report button, Notifications, Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Actual Live Supabase Connection Indicator */}
        <div
          title={
            dbHealth.status === 'ready'
              ? `Connected to Supabase PostgreSQL ${dbHealth.serverVersion || '17.11'}`
              : dbHealth.status === 'checking'
              ? 'Checking Supabase connection...'
              : 'Supabase Database Offline'
          }
          className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#475569] shadow-2xs"
        >
          <span className="relative flex h-2 w-2">
            {dbHealth.status === 'ready' ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
              </>
            ) : dbHealth.status === 'checking' ? (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D97706] animate-pulse" />
            ) : (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#DC2626]" />
            )}
          </span>
          <span className="hidden xl:inline text-[#64748B]">Database:</span>
          <span className="font-semibold text-[#1E293B]">
            {dbHealth.status === 'ready'
              ? 'Supabase Connected'
              : dbHealth.status === 'checking'
              ? 'Checking DB'
              : 'DB Offline'}
          </span>
        </div>

        {/* Report Incident CTA Button */}
        <Button
          size="sm"
          onClick={() => navigate('/events/create')}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          className="hidden sm:inline-flex bg-[#173D70] hover:bg-[#0F294D] text-white"
        >
          Report Incident
        </Button>

        {/* Notification Icon */}
        <button
          className="relative rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#173D70] transition-colors"
          title="Campus Notifications"
          aria-label="Campus Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#DC2626]" />
        </button>

        {/* User Profile Dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-[#F1F5F9] transition-colors focus:outline-none"
              aria-label="User menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#173D70] text-xs font-bold text-white shadow-xs">
                {user.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <span className="block font-semibold text-[#1E293B] leading-none">
                  {user.display_name}
                </span>
                <span className="block text-[10px] text-[#64748B] uppercase tracking-wide mt-0.5">
                  {user.roles?.[0]?.replace(/_/g, ' ') || 'Officer'}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#E2E8F0] bg-white py-2 shadow-academic-card z-50">
                <div className="border-b border-[#E2E8F0] px-4 py-2">
                  <p className="text-xs font-bold text-[#1E293B]">{user.display_name}</p>
                  <p className="truncate text-[11px] text-[#64748B]">{user.email}</p>
                  <p className="mt-1 text-[10px] uppercase font-semibold text-[#173D70]">
                    JSS Science & Technology University
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#EBF3FC] hover:text-[#173D70]"
                  >
                    <UserIcon className="h-4 w-4 text-[#64748B]" />
                    <span>Officer Profile</span>
                  </Link>
                  <Link
                    to="/references"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#EBF3FC] hover:text-[#173D70]"
                  >
                    <GraduationCap className="h-4 w-4 text-[#64748B]" />
                    <span>Academic Reference Catalog</span>
                  </Link>
                </div>

                <div className="border-t border-[#E2E8F0] pt-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
