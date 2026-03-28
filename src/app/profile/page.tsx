'use client';

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Lock, Save, Loader2, UserCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.newPassword) {
      alert("Please enter a new password.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      // For Admins/Faculty, they are in 'users' collection
      // For Students, they are in 'students' collection
      const collectionName = user?.role === 'student' ? 'students' : 'users';
      
      // For students, we match by regNumber, but doc ID might be different. 
      // Actually, in login we query by regNumber. 
      // I'll assume for simplicity that we can find the doc.
      // Wait, in AuthContext students role used regNumber as ID. 
      // I need to be careful if doc ID is not regNumber.
      
      const userRef = doc(db, collectionName, user?.id || '');
      await updateDoc(userRef, { password: passwords.newPassword });
      
      alert("Password updated successfully! Please log in again.");
      logout();
    } catch (error: any) {
      alert("Update failed: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-10 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-4 border-2 border-white/30">
                <UserCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-2xl font-bold">{user?.fullName}</h1>
              <p className="text-blue-100 text-sm font-medium mt-1 uppercase tracking-wider">{user?.role} Profile</p>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account ID</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{user?.id}</p>
                </div>
              </div>

              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Security Update</h2>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="password"
                      value={passwords.newPassword}
                      onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-600/20 outline-none text-sm font-medium" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-600/20 outline-none text-sm font-medium" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    disabled={isSaving}
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Update Password
                  </button>
                  <Link href="/dashboard" className="text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors py-2">
                    Back to Dashboard
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
