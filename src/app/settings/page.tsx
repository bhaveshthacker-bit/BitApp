"use client";

import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { useTheme } from "next-themes";
import { ArrowLeft, LayoutDashboard, Users, BookOpen, CreditCard, Settings, Moon, Sun, Monitor, Loader2, Building, Mail, Phone, Globe, User } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Lock, Save, Key } from 'lucide-react';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  const [instituteDetails, setInstituteDetails] = useState({
    instituteName: '',
    tagLine: '',
    address: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    website: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { user, logout } = useAuth();
  const [adminAuth, setAdminAuth] = useState({
    id: user?.id || 'admin',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingAuth, setIsSavingAuth] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
    
    const fetchInstitute = async () => {
      try {
        const docRef = doc(db, 'settings', 'institute');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInstituteDetails(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        console.error("Error fetching institute details:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    fetchInstitute();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInstituteDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveInstitute = async () => {
    if (!instituteDetails.instituteName) {
      alert("Institute Name is required.");
      return;
    }
    
    setIsSaving(true);
    try {
      const docRef = doc(db, 'settings', 'institute');
      await setDoc(docRef, instituteDetails, { merge: true });
      alert("Institute Details saved successfully!");
    } catch (error: any) {
      console.error(error);
      alert("Error saving details: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAdminAuth = async () => {
    if (!adminAuth.id) {
      alert("Admin ID is required.");
      return;
    }
    
    if (adminAuth.newPassword && adminAuth.newPassword !== adminAuth.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setIsSavingAuth(true);
    try {
      const currentId = user?.id || 'admin';
      const userRef = doc(db, 'users', currentId);
      
      const updateData: any = {
        fullName: 'Administrator', // Keep it consistent
        role: 'admin'
      };

      if (adminAuth.newPassword) {
        updateData.password = adminAuth.newPassword;
      }

      if (adminAuth.id !== currentId) {
        // If ID changed, we need to create a new doc and delete the old one
        const oldDoc = await getDoc(userRef);
        const oldData = oldDoc.data() || {};
        
        await setDoc(doc(db, 'users', adminAuth.id), {
          ...oldData,
          ...updateData,
          id: adminAuth.id
        });
        
        await deleteDoc(userRef);
        alert("Admin ID and profile updated. Please log in again with your new ID.");
        logout();
      } else {
        await updateDoc(userRef, updateData);
        alert("Admin security settings updated successfully!");
        setAdminAuth(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      }
    } catch (error: any) {
      alert("Error updating security: " + error.message);
    } finally {
      setIsSavingAuth(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
    <div className="bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-md mx-auto bg-white dark:bg-slate-900 min-h-screen flex flex-col shadow-xl">
        
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center p-4">
            <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </Link>
            <h1 className="text-xl font-bold ml-2 text-slate-900 dark:text-slate-100">Settings</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24">
          <div className="space-y-6">
            
            <section className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/80">
                <h2 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Appearance</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Theme Preference</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select light, dark, or system theme</p>
                  </div>
                </div>

                {mounted && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${theme === 'light' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                    >
                      <Sun className="w-5 h-5 mb-1.5" />
                      <span className="text-xs font-semibold">Light</span>
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${theme === 'dark' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                    >
                      <Moon className="w-5 h-5 mb-1.5" />
                      <span className="text-xs font-semibold">Dark</span>
                    </button>
                    <button 
                      onClick={() => setTheme('system')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${theme === 'system' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                    >
                      <Monitor className="w-5 h-5 mb-1.5" />
                      <span className="text-xs font-semibold">System</span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/80 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Institute Details</h2>
                <button 
                  onClick={handleSaveInstitute} 
                  disabled={!isLoaded || isSaving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Changes
                </button>
              </div>
              <div className="p-4 space-y-4">
                {!isLoaded ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Institute Name</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="instituteName" value={instituteDetails.instituteName} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white" placeholder="BitApp Institute" type="text" />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tagline / Subtitle</label>
                      <input name="tagLine" value={instituteDetails.tagLine} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm text-slate-600 dark:text-slate-400" placeholder="Excellence in Technology Education" type="text" />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Address</label>
                      <textarea name="address" value={instituteDetails.address} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm text-slate-600 dark:text-slate-400 resize-none h-20" placeholder="123 Education Drive, City, State, ZIP"></textarea>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contact Person</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="contactPerson" value={instituteDetails.contactPerson} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm" placeholder="John Manager" type="text" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contact Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="contactNumber" value={instituteDetails.contactNumber} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm" placeholder="+1 (555) 000-0000" type="tel" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="email" value={instituteDetails.email} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm" placeholder="contact@bitapp.edu" type="email" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="website" value={instituteDetails.website} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm" placeholder="https://www.bitapp.edu" type="url" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/80 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Security Settings</h2>
                <button 
                  onClick={handleSaveAdminAuth} 
                  disabled={isSavingAuth}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSavingAuth && <Loader2 className="w-3 h-3 animate-spin" />}
                  Update Security
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Admin Login ID</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      value={adminAuth.id} 
                      onChange={e => setAdminAuth({...adminAuth, id: e.target.value})} 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:border-blue-600 outline-none text-sm font-bold" 
                      placeholder="admin" 
                      type="text" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input 
                        value={adminAuth.newPassword} 
                        onChange={e => setAdminAuth({...adminAuth, newPassword: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:border-blue-600 outline-none text-sm" 
                        placeholder="••••••••" 
                        type="password" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input 
                        value={adminAuth.confirmPassword} 
                        onChange={e => setAdminAuth({...adminAuth, confirmPassword: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:border-blue-600 outline-none text-sm" 
                        placeholder="••••••••" 
                        type="password" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

      </div>
    </div>
    </ProtectedRoute>
  );
}
