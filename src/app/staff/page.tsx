'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { 
  Users, Plus, Edit2, Trash2, Shield, X, Save, 
  CheckCircle2, AlertCircle, Loader2, Key, Eye, EyeOff, Search
} from 'lucide-react';

interface StaffMember {
  id: string;
  fullName: string;
  role: 'admin' | 'faculty';
  password?: string;
  permissions: {
    [key: string]: {
      view: boolean;
      edit: boolean;
      add: boolean;
    }
  };
}

const MODULES = ['dashboard', 'students', 'fees', 'courses', 'staff', 'settings'];

export default function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<StaffMember>({
    id: '',
    fullName: '',
    role: 'faculty',
    password: '',
    permissions: MODULES.reduce((acc, mod) => ({
      ...acc,
      [mod]: { view: true, edit: false, add: false }
    }), {})
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'faculty']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData: StaffMember[] = [];
      snapshot.forEach((doc) => {
        staffData.push(doc.data() as StaffMember);
      });
      setStaff(staffData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (member?: StaffMember) => {
    if (member) {
      setFormData({ ...member });
      setEditingId(member.id);
    } else {
      setFormData({
        id: '',
        fullName: '',
        role: 'faculty',
        password: '',
        permissions: MODULES.reduce((acc, mod) => ({
          ...acc,
          [mod]: { view: true, edit: false, add: false }
        }), {})
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (module: string, action: 'view' | 'edit' | 'add') => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: !prev.permissions[module][action]
        }
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.fullName || (!editingId && !formData.password)) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const dataToSave = { ...formData };
      if (!editingId) {
        // New user
        await setDoc(doc(db, 'users', formData.id), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
      } else {
        // Update user
        const { id, ...updateData } = dataToSave;
        await updateDoc(doc(db, 'users', id), updateData);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving staff:", error);
      alert("Failed to save: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'admin') {
      alert("Cannot delete the primary admin account");
      return;
    }
    if (confirm(`Are you sure you want to delete staff ID ${id}?`)) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (error: any) {
        alert("Delete failed: " + error.message);
      }
    }
  };

  const filteredStaff = staff.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                Staff Management
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Manage faculty accounts and module-specific access rights.</p>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add New Staff
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all shadow-sm"
            />
          </div>

          {/* Staff Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500 font-medium">Loading staff registry...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((member) => (
                <div key={member.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-600/10 flex items-center justify-center">
                        <Shield className={`w-6 h-6 ${member.role === 'admin' ? 'text-amber-500' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{member.fullName}</h3>
                        <p className="text-xs font-mono text-slate-400">{member.id} • {member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleOpenModal(member)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-600/10 rounded-lg transition-colors">
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-600/10 rounded-lg transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Permissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MODULES.map(mod => {
                        const canView = member.role === 'admin' || member.permissions[mod]?.view;
                        if (!canView) return null;
                        return (
                          <span key={mod} className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight capitalize">
                            {mod}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {editingId ? 'Edit Staff Profile' : 'Register New Staff'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="overflow-y-auto p-8 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1 text-slate-700 dark:text-slate-300 capitalize">Staff ID / Login ID</label>
                    <input 
                      disabled={!!editingId}
                      value={formData.id}
                      onChange={e => setFormData({...formData, id: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-50 text-slate-950 dark:text-white" 
                      placeholder="e.g. rahul_faculty"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1 text-slate-700 dark:text-slate-300 capitalize">Full Name</label>
                    <input 
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white" 
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1 text-slate-700 dark:text-slate-300 capitalize">Role</label>
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as any})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="faculty">Faculty / Staff</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1 text-slate-700 dark:text-slate-300 capitalize">
                      {editingId ? 'Change Password (leave blank to keep)' : 'Initial Password'}
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pr-12" 
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {formData.role !== 'admin' && (
                  <div className="bg-slate-50 dark:bg-slate-950/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-6 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Module Permissions matrix
                    </h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-4 gap-4 text-center items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-400 text-left pl-2 capitalize">Module</div>
                        <div className="text-xs font-bold text-slate-400 capitalize">View</div>
                        <div className="text-xs font-bold text-slate-400 capitalize">Add</div>
                        <div className="text-xs font-bold text-slate-400 capitalize">Edit / Del</div>
                      </div>
                      {MODULES.map(mod => (
                        <div key={mod} className="grid grid-cols-4 gap-4 text-center items-center py-1 group">
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-300 text-left pl-2 capitalize">{mod}</div>
                          {['view', 'add', 'edit'].map(action => (
                            <div key={action} className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => handlePermissionToggle(mod, action as any)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  formData.permissions[mod]?.[action as keyof typeof formData.permissions[typeof mod]]
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-4 flex gap-4">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    Save Changes
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-[0.98] transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
