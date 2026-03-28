'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'faculty' | 'student';
  module?: string;
  action?: 'view' | 'edit' | 'add';
}

export function ProtectedRoute({ children, requiredRole, module, action = 'view' }: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Check role if specified
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return (
      <div className="flex bg-slate-50 dark:bg-slate-900 min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          You do not have the required role ({requiredRole}) to access this page.
        </p>
      </div>
    );
  }

  // Check specific module permission if specified
  if (module && !hasPermission(module, action)) {
    return (
      <div className="flex bg-slate-50 dark:bg-slate-900 min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Permission Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          You do not have {action} rights for the <strong>{module}</strong> module. 
          Please contact your administrator for access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
