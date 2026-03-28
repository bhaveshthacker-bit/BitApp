'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, LayoutDashboard, Users, BookOpen, CreditCard, Settings, Loader2, User, Banknote } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

interface Student {
  id: string;
  regNumber: string;
  fullName: string;
  course: string;
  status: string;
  feesDue: number;
  batchStart?: string;
  batchEnd?: string;
  img?: string;
}

interface Receipt {
  id: string;
  amount: number;
  date: string;
  status?: string;
}

const getStatusBadgeOptions = (status: string) => {
  switch (status) {
    case 'Running': return 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20';
    case 'Break': return 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20';
    case 'Cancel': return 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20';
    case 'Exam Pending': return 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20';
    case 'Exam Given': return 'bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-500/10 dark:text-cyan-400 dark:ring-cyan-500/20';
    case 'Certificate Requested': return 'bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-500/10 dark:text-pink-400 dark:ring-pink-500/20';
    case 'Completed': return 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20';
    case 'Cancelled': return 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20';
    default: return 'bg-slate-50 text-slate-700 ring-slate-600/20';
  }
}

export default function StudentDashboard() {
  const { hasPermission } = useAuth();
  const [filter, setFilter] = useState('Running');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [receiptsData, setReceiptsData] = useState<Receipt[]>([]);
  const [courses, setCourses] = useState<Record<string, {name: string, code: string}>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to real-time updates from the "students" collection
    const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
    const unsubscribeStudents = onSnapshot(q, (snapshot) => {
      const students: Student[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        students.push({
          id: doc.id,
          regNumber: data.regNumber || doc.id,
          fullName: data.fullName || 'Unknown',
          course: data.course || '',
          status: data.status || 'Running',
          feesDue: data.feesDue || 0,
          batchStart: data.batchStart,
          batchEnd: data.batchEnd,
          // Default to empty; UI handles showing an icon if no image
          img: data.img || ''
        });
      });
      setStudentsData(students);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      setLoading(false);
    });

    // Listen to real-time updates for courses
    const unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const courseMap: Record<string, {name: string, code: string}> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        courseMap[doc.id] = { name: data.name, code: data.code || 'N/A' };
      });
      setCourses(courseMap);
    });

    // Listen to real-time updates for receipts
    const unsubscribeReceipts = onSnapshot(collection(db, 'receipts'), (snapshot) => {
      const recs: Receipt[] = [];
      snapshot.forEach((doc) => {
        recs.push({ id: doc.id, ...doc.data() } as Receipt);
      });
      setReceiptsData(recs);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeCourses();
      unsubscribeReceipts();
    };
  }, []);

  const baseFilteredStudents = useMemo(() => {
    return studentsData.filter(student => {
      const matchesFilter = filter === 'All' || student.status === filter;
      const searchTarget = student.fullName.toLowerCase() + " " + student.regNumber.toLowerCase();
      const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [studentsData, filter, searchQuery]);

  const filteredStudents = useMemo(() => {
    let filtered = baseFilteredStudents;
    
    if (selectedBatches.length > 0) {
      filtered = filtered.filter(student => {
        const batch = (student.batchStart && student.batchEnd) ? `${student.batchStart} - ${student.batchEnd}` : 'Unassigned';
        return selectedBatches.includes(batch);
      });
    }
    
    if (selectedCourses.length > 0) {
      filtered = filtered.filter(student => {
        const courseCode = courses[student.course]?.code || student.course || 'Unknown';
        return selectedCourses.includes(courseCode);
      });
    }
    
    return filtered;
  }, [baseFilteredStudents, selectedBatches, selectedCourses, courses]);

  const courseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    baseFilteredStudents.forEach(s => {
      const c = courses[s.course]?.code || s.course || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    });
    // Sort courses by count descending
    return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
  }, [baseFilteredStudents, courses]);

  const batchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    baseFilteredStudents.forEach(s => {
      const b = (s.batchStart && s.batchEnd) ? `${s.batchStart} - ${s.batchEnd}` : 'Unassigned';
      counts[b] = (counts[b] || 0) + 1;
    });
    // Sort batches alphabetically
    return Object.fromEntries(Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])));
  }, [baseFilteredStudents]);

  const monthlyFeesTotal = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return receiptsData.reduce((acc, rec) => {
      const recDate = new Date(rec.date);
      if (recDate.getMonth() === currentMonth && recDate.getFullYear() === currentYear) {
        return acc + (Number(rec.amount) || 0);
      }
      return acc;
    }, 0);
  }, [receiptsData]);

  return (
    <ProtectedRoute module="dashboard" action="view">
    <div className="bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {/* Header Section */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Students</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage and track student progress and financial status.</p>
            </div>
            <div className="flex items-center gap-3">
              {hasPermission('students', 'add') && (
                <Link href="/registration" className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Student
                </Link>
              )}
            </div>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input 
                className="block w-full rounded-lg border-0 py-2.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-slate-800 dark:ring-slate-700 dark:text-white sm:text-sm sm:leading-6" 
                placeholder="Search by name, Reg No..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="inline-flex items-center gap-x-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Fast Filters / Tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['All', 'Running', 'Break', 'Cancel', 'Exam Pending', 'Exam Given', 'Certificate Requested', 'Completed'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setFilter(tab)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  filter === tab 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {tab === 'Running' ? 'Active (Running)' : tab === 'Break' ? 'On Break' : tab === 'All' ? 'All Students' : tab}
              </button>
            ))}
          </div>
        </header>

        {/* Stats Section */}
        {!loading && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fees Summary Card (New) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-900/30 p-5 shadow-sm ring-1 ring-blue-50 dark:ring-blue-900/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Fees Received <span className="text-[10px] text-blue-500 block font-normal tracking-normal capitalize mt-0.5">Current Month</span></h3>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">₹{monthlyFeesTotal.toLocaleString()}</span>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span>Real-time calculation</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Course-wise</h3>
                </div>
                {selectedCourses.length > 0 && (
                  <button disable-auto-run="true" onClick={() => setSelectedCourses([])} className="text-[10px] font-bold text-blue-600 hover:opacity-70 uppercase tracking-tight transition-opacity">Clear Filters</button>
                )}
              </div>
              <div className="space-y-1.5 -mx-1">
                {Object.keys(courseCounts).length > 0 ? (
                  Object.entries(courseCounts).map(([course, count]) => {
                    const isSelected = selectedCourses.includes(course);
                    return (
                      <button 
                        key={course} 
                        disable-auto-run="true"
                        onClick={() => setSelectedCourses(prev => prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course])}
                        className={`flex items-center justify-between w-full p-2 rounded-lg transition-all group/course ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200/50 dark:ring-blue-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                      >
                        <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover/course:text-slate-900 dark:group-hover/course:text-slate-200'}`}>{course}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${isSelected ? 'bg-blue-600 text-white scale-110 shadow-sm shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'}`}>{count}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 p-1">No data available.</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Batch-wise</h3>
                </div>
                {selectedBatches.length > 0 && (
                  <button disable-auto-run="true" onClick={() => setSelectedBatches([])} className="text-[10px] font-bold text-blue-600 hover:opacity-70 uppercase tracking-tight transition-opacity">Clear Filters</button>
                )}
              </div>
              <div className="space-y-1.5 -mx-1">
                {Object.keys(batchCounts).length > 0 ? (
                  Object.entries(batchCounts).map(([batch, count]) => {
                    const isSelected = selectedBatches.includes(batch);
                    return (
                      <button 
                        key={batch} 
                        disable-auto-run="true"
                        onClick={() => setSelectedBatches(prev => prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch])}
                        className={`flex items-center justify-between w-full p-2 rounded-lg transition-all group/batch ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200/50 dark:ring-blue-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                      >
                        <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover/batch:text-slate-900 dark:group-hover/batch:text-slate-200'}`}>{batch}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${isSelected ? 'bg-blue-600 text-white scale-110 shadow-sm shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'}`}>{count}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 p-1">No data available.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student List View */}
        <div className="space-y-4">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Loading students...</p>
            </div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div key={student.id} className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="h-14 w-14 flex-shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    {student.img ? (
                      <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url('${student.img}')` }}></div>
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{student.fullName}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusBadgeOptions(student.status)}`}>
                        {student.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-400 tracking-wider uppercase mt-0.5">
                      {student.regNumber}
                      {student.course && (
                        <span className="ml-2 pl-2 border-l border-slate-300 dark:border-slate-600">
                          {courses[student.course]?.code || student.course}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                  <div className="flex flex-col items-end">
                    <div className="text-sm">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Fees Due:</span>
                      <span className={`ml-1 font-bold ${student.feesDue > 0 ? 'text-red-500' : 'text-green-600'}`}>₹{student.feesDue.toFixed(2)}</span>
                    </div>
                      <div className="flex items-center gap-3 mt-2">
                        {student.feesDue > 0 && (
                          <Link 
                            href={`/fees?studentId=${student.id}`}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm shadow-blue-500/10 transition-all"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            COLLECT FEES
                          </Link>
                        )}
                        <Link href={`/registration?id=${student.id}`} className="text-slate-500 hover:text-blue-600 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors">
                          Profile
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 font-medium">No students found.</p>
              <Link href="/registration" className="mt-4 inline-flex items-center text-blue-600 hover:underline text-sm font-medium">
                Register your first student
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          )}

        </div>

        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-700">
            <div className="flex flex-1 justify-between sm:hidden">
              <a className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300" href="#">Previous</a>
              <a className="relative ml-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300" href="#">Next</a>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-400">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredStudents.length}</span> of <span className="font-medium">{filteredStudents.length}</span> results
                </p>
              </div>
              <div>
                <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <a className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 dark:ring-slate-700 dark:hover:bg-slate-800" href="#">
                    <ChevronLeft className="w-5 h-5" />
                  </a>
                  <a aria-current="page" className="relative z-10 inline-flex items-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" href="#">1</a>
                  <a className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 dark:ring-slate-700 dark:hover:bg-slate-800" href="#">
                    <ChevronRight className="w-5 h-5" />
                  </a>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
    </ProtectedRoute>
  );
}
