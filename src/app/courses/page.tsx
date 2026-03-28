'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Plus, Save, Trash2, Edit2, Loader2, BookOpen, XCircle } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

interface Course {
  id: string;
  name: string;
  code: string;
  durationHours: number;
  fees: number;
  content?: string;
}

export default function CourseMaster() {
  const { hasPermission } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ name: '', code: '', durationHours: '', fees: '', content: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courseList: Course[] = [];
      snapshot.forEach((doc) => {
        courseList.push({ id: doc.id, ...doc.data() } as Course);
      });
      setCourses(courseList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.durationHours || !formData.fees) {
      alert("Please fill all fields");
      return;
    }

    const isNameDuplicate = courses.some(
      c => c.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && c.id !== editingId
    );

    if (isNameDuplicate) {
      alert("A course with this name already exists.");
      return;
    }

    const isCodeDuplicate = courses.some(
      c => (c.code || '').trim().toUpperCase() === formData.code.trim().toUpperCase() && c.id !== editingId
    );

    if (isCodeDuplicate) {
      alert("A course with this unique code already exists.");
      return;
    }

    setIsSubmitting(true);
    const courseData = {
      name: formData.name,
      code: formData.code.trim().toUpperCase(),
      durationHours: Number(formData.durationHours),
      fees: Number(formData.fees),
      ...(formData.content ? { content: formData.content } : {})
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'courses', editingId), courseData);
      } else {
        await addDoc(collection(db, 'courses'), { ...courseData, createdAt: serverTimestamp() });
      }
      setFormData({ name: '', code: '', durationHours: '', fees: '', content: '' });
      setEditingId(null);
    } catch (error: any) {
      console.error(error);
      alert('Error saving course: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (course: Course) => {
    setFormData({
      name: course.name,
      code: course.code,
      durationHours: course.durationHours.toString(),
      fees: course.fees.toString(),
      content: course.content || ''
    });
    setEditingId(course.id);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleDelete = async (course: Course) => {
    if (window.confirm(`Are you sure you want to delete the course "${course.name}"?`)) {
      try {
        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, where('course', '==', course.id), where('status', 'in', ['Active', 'Running']));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          alert(`Cannot delete: There are ${snapshot.size} active student(s) enrolled in this course.`);
          return;
        }

        await deleteDoc(doc(db, 'courses', course.id));
      } catch (error: any) {
        console.error(error);
        alert("Error deleting course: " + error.message);
      }
    }
  };

  const cancelEdit = () => {
    setFormData({ name: '', code: '', durationHours: '', fees: '', content: '' });
    setEditingId(null);
  };

  return (
    <ProtectedRoute module="courses" action="view">
    <div className="bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-md mx-auto bg-white dark:bg-slate-900 min-h-screen flex flex-col shadow-xl">
        
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center p-4">
            <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </Link>
            <h1 className="text-xl font-bold ml-2 text-slate-900 dark:text-slate-100">Course Master</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-8">
          {/* Existing Courses Section */}
          <section className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight">Existing Courses</h2>
              <span className="text-xs font-semibold px-2 py-1 bg-blue-600/10 text-blue-600 rounded-full uppercase tracking-wider">{courses.length} Total</span>
            </div>
            
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 font-medium">No courses found. Add your first course below.</p>
                </div>
              ) : (
                courses.map(course => (
                  <div key={course.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-all shadow-sm group">
                    <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-base font-semibold truncate uppercase tracking-tight">{course.name}</p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 uppercase tracking-wider shrink-0 whitespace-nowrap">{course.code}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-0.5"></div>
                        <Clock className="w-4 h-4" />
                        <span>{course.durationHours} Hours</span>
                      </div>
                      {course.content && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {course.content}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-base font-bold text-blue-600">₹{course.fees.toLocaleString()}</p>
                      <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hasPermission('courses', 'edit') && (
                          <button onClick={() => handleEdit(course)} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4"/></button>
                        )}
                        {hasPermission('courses', 'edit') && (
                          <button onClick={() => handleDelete(course)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Divider */}
          <div className="h-2 bg-slate-100 dark:bg-slate-800 my-4"></div>

          {/* Form Section */}
          <section className="p-4 pt-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  {editingId ? <Edit2 className="w-4 h-4 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                </div>
                <h2 className="text-lg font-bold tracking-tight">{editingId ? 'Edit Course' : 'Add New Course'}</h2>
              </div>
              {editingId && (
                <button onClick={cancelEdit} className="text-sm font-semibold text-red-500 hover:text-red-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Course Code</label>
                  <input name="code" value={formData.code} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none uppercase font-mono text-sm" placeholder="e.g. AD-AI" type="text" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Course Full Name</label>
                  <input name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none" placeholder="e.g. Advanced AI Masterclass" type="text" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Duration (Hours)</label>
                  <input name="durationHours" value={formData.durationHours} onChange={handleChange} required min="1" className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none" placeholder="120" type="number" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Fees (₹)</label>
                  <input name="fees" value={formData.fees} onChange={handleChange} required min="0" className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none" placeholder="1500" type="number" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Course Content (Optional)</label>
                <textarea name="content" value={formData.content} onChange={handleChange as any} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none min-h-[100px] resize-y" placeholder="Brief outline of course sections / modules..."></textarea>
              </div>
              
              <div className="pt-4">
                <button 
                  disabled={isSubmitting || !hasPermission('courses', editingId ? 'edit' : 'add')} 
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/25 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70" 
                  type="submit"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingId ? 'Update Course Details' : 'Save Course Details'}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
