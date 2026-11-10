import React, { useEffect, useState } from 'react';
import {
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { API_BASE_URL } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatRoleName, getRoleBadgeClass } from '../../utils/formatters';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [healthInfo, setHealthInfo] = useState<any>(null);

  useEffect(() => {
    authService.checkHealth().then((h) => setHealthInfo(h)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          User Profile & Security
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Authenticated identity, role authorizations, and API operational status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Identity Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Identity & Account Profile
            </h2>

            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#173D70] text-xl font-bold text-white shadow-2xs">
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {user?.display_name}
                </h3>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {user?.roles?.map((r) => (
                    <span
                      key={r}
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold border ${getRoleBadgeClass(
                        r
                      )}`}
                    >
                      {formatRoleName(r)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Application User ID</span>
                <span className="font-mono text-slate-800 text-[11px] select-all">
                  {user?.user_id || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Authentication Authority</span>
                <span className="text-slate-800">
                  Supabase Auth via FastAPI Proxy
                </span>
              </div>
            </div>
          </div>

          {/* Role Authorization Guide */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-600" />
              Role Authorization Policy
            </h2>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-800 block">event_reporter</span>
                Permitted to report new campus incidents, view public and internal incident records, and observe timeline updates.
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-800 block">event_investigator</span>
                Authorized to advance status workflows, link causal relationships, record quantifiable impacts, and attach corroborating evidence.
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-800 block">decision_maker / administrator</span>
                Access to institutional summaries, recurrence trends, administrative settings, and complete forensic export capabilities.
              </div>
            </div>
          </div>
        </div>

        {/* Backend Connectivity Status */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              System Environment
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">API Base URL</span>
                <span className="font-mono text-[11px] text-slate-800 break-all">
                  {API_BASE_URL}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Backend Service</span>
                <span className="font-medium text-slate-800">
                  {healthInfo?.service || 'CAMPUS MEMORY API'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Runtime Environment</span>
                <span className="font-mono text-slate-800 uppercase">
                  {healthInfo?.environment || 'development'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Database Connected</span>
                <Badge variant={healthInfo?.database_configured ? 'success' : 'neutral'}>
                  {healthInfo?.database_configured ? 'Configured' : 'Offline'}
                </Badge>
              </div>

              <div>
                <span className="text-slate-400 block">Auth Provider</span>
                <Badge variant={healthInfo?.auth_configured ? 'success' : 'neutral'}>
                  {healthInfo?.auth_configured ? 'Configured' : 'Offline'}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Button
                variant="destructive"
                className="w-full"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Sign Out Session
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
