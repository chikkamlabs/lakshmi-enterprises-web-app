'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, UserCheck, Users, ArrowRight, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'associate' | 'staff'>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Determine role dynamically from email if modified, or fallback to selectedRole
  const getDetectedRole = (): 'admin' | 'associate' | 'staff' => {
    const lowerEmail = email.toLowerCase().trim();
    if (lowerEmail.includes('admin')) return 'admin';
    if (lowerEmail.includes('associate')) return 'associate';
    if (lowerEmail.includes('staff') || lowerEmail.includes('warehouse')) return 'staff';
    return selectedRole;
  };

  const role = getDetectedRole();

  const getRoleDestination = (currentRole: 'admin' | 'associate' | 'staff') => {
    switch (currentRole) {
      case 'admin':
        return '/admin';
      case 'associate':
        return '/associate';
      case 'staff':
        return '/staff';
      default:
        return '/staff';
    }
  };

  const handleRoleSelect = (newRole: 'admin' | 'associate' | 'staff') => {
    setSelectedRole(newRole);
    if (newRole === 'admin') setEmail('');
    if (newRole === 'associate') setEmail('');
    if (newRole === 'staff') setEmail('');
    setError('');
    setInfoMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setIsLoading(true);

    try {
      // Authenticate with Supabase auth.signInWithPassword
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError || !data?.session) {
        console.warn('Supabase signInWithPassword error:', authError?.message);
        setError(authError?.message || 'Invalid login credentials. Access denied.');
        setIsLoading(false);
        // STRICT REQUIREMENT: DO NOT REDIRECT OR OPEN DASHBOARD IF CREDENTIALS ARE INVALID!
        return;
      }

      // Successful auth - set session marker
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lakshmi_auth_active', 'true');
        sessionStorage.setItem('lakshmi_user_role', role);
      }

      setInfoMessage('Authentication successful! Redirecting to portal...');
      setTimeout(() => {
        router.push(getRoleDestination(role));
      }, 600);
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'Invalid login credentials. Access denied.';
      setError(msg);
      setIsLoading(false);
      // STRICT REQUIREMENT: DO NOT REDIRECT ON ERROR!
    }
  };

  return (
    <div className="main-container flex-center p-4 sm:p-6 bg-slate-50">
      <div className="card-base max-w-md w-full animate-fade-in shadow-lg border border-slate-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="page-title text-center text-slate-900">
            Welcome, lakshmi Enterprises. Login
          </h1>
          <p className="body-text text-center text-slate-500 mt-1">
            Sign in to access your role-based portal
          </p>
        </div>

        {/* Quick Role Selector */}
        <div className="mb-6 p-3 bg-slate-100/70 rounded-xl border border-slate-200/80">
          <span className="small-text font-medium text-slate-600 block mb-2 text-center">
            Select Role / Demo Account:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleRoleSelect('admin')}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                role === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('associate')}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                role === 'associate'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Associate
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('staff')}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                role === 'staff'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Staff
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-medium">{error}</p>
              {infoMessage && <p className="mt-0.5 text-slate-600">{infoMessage}</p>}
            </div>
          </div>
        )}

        {infoMessage && !error && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs flex items-center gap-2">
            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-indigo-600" />
            <p className="font-medium">{infoMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <div className="input-group">
              <span className="input-icon-left">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                required
                className="input-field has-left-icon"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-group">
              <span className="input-icon-left">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                required
                className="input-field has-left-icon has-right-icon"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="input-icon-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-500" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-base btn-primary w-full text-center flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Login as {role.charAt(0).toUpperCase() + role.slice(1)}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <p className="small-text text-slate-500">
            Account sign-up is handled inside the Admin Panel.
          </p>
        </div>
      </div>
    </div>
  );
}

