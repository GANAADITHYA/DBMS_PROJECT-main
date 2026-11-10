import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { extractErrorMessage } from '../../services/apiClient';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ required: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = displayName.trim();
    const mail = email.trim();

    if (!name) {
      setErrorMessage('Full name / display name is required.');
      return;
    }
    if (!mail) {
      setErrorMessage('University email address is required.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signup({
        display_name: name,
        email: mail,
        password,
        role_code: 'event_reporter',
      });

      if (res.email_confirmation_required) {
        setSuccessInfo({
          required: true,
          message: res.message || 'Please check your email to confirm your account before logging in.',
        });
      } else {
        // Automatically logged in and session saved
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Registration failed. Please check the provided information.');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-academic-card">
        {/* University Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173D70] text-white shadow-xs mb-3">
            <GraduationCap className="h-8 w-8" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#173D70]">
            JSS Science & Technology University
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1E293B]">
            Create Reporter Account
          </h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Register as an authorized campus incident reporter
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6">
            <Alert
              type="error"
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
            />
          </div>
        )}

        {successInfo ? (
          <div className="mt-6 space-y-4">
            <Alert
              type="success"
              title="Registration Successful"
              message={successInfo.message}
            />
            <Button
              className="w-full bg-[#173D70] hover:bg-[#0F294D] text-white"
              onClick={() => navigate('/login')}
            >
              Proceed to University Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Full Name / Officer Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Officer Jane Doe"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#173D70] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#173D70]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                University Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@jssstuniv.in"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#173D70] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#173D70]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Password (min. 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-10 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#173D70] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#173D70]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#173D70]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#173D70] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#173D70]"
                />
              </div>
            </div>

            <div className="rounded-lg bg-[#EBF3FC] p-3 text-[11px] text-[#315F91] border border-[#C7DCF8]">
              <span className="font-bold text-[#173D70]">Institutional RBAC note: </span>
              Registration assigns the <code className="font-mono text-[#173D70] font-semibold">event_reporter</code> role in Supabase. Additional operational roles are provisioned by university administrators.
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-[#173D70] hover:bg-[#0F294D] text-white"
              size="lg"
              isLoading={isLoading}
            >
              Complete University Registration
            </Button>
          </form>
        )}

        <div className="mt-6 border-t border-[#E2E8F0] pt-4 text-center">
          <p className="text-xs text-[#64748B]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#173D70] hover:text-[#0F294D] underline-offset-4 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
