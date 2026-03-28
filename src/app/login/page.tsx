'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, LogIn, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password) {
      setError('Please enter both ID and Password');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(id, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4 transition-transform hover:scale-105">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Bit Computers</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Student Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Identity Portal</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Login ID / Registration No.</label>
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <User className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="text" 
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium"
                  placeholder="e.g. admin or REG-2024-001"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Secure Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">Having trouble signing in? </span>
            <Link href="/" className="text-blue-600 font-bold hover:underline transition-all underline-offset-4">Get Support</Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">
          PROPERTY OF BITAPP EDUCATION SYSTEMS • V2.0.1
        </p>
      </div>
    </div>
  );
}
