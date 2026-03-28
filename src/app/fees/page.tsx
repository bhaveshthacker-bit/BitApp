'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, Hash, Wallet, Calendar, PlusCircle, History, Filter, Search, Edit2, Trash2, Loader2, CreditCard, Banknote, Landmark, Users, Printer } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

interface Student {
  id: string;
  regNumber: string;
  fullName: string;
  feesPayable: number;
  feesReceived: number;
  feesDue: number;
  course?: string;
  batchStart?: string;
  batchEnd?: string;
}

interface Receipt {
  id: string;
  studentId: string;
  receiptNo: string;
  amount: number;
  paymentType: string;
  date: string;
  status: string;
  createdAt?: any;
}

function FeesRegisterContent() {
  const { hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const urlStudentId = searchParams.get('studentId');
  const [students, setStudents] = useState<Student[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [courses, setCourses] = useState<{id: string, name: string, code: string}[]>([]);
  const [instituteDetails, setInstituteDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    studentId: '',
    receiptNo: '',
    amount: '',
    paymentType: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch Active Students to populate select dropdown
    const qStudents = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const studs: Student[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        studs.push({
          id: doc.id,
          regNumber: data.regNumber || 'N/A',
          fullName: data.fullName || 'Unknown',
          feesPayable: data.feesPayable || 0,
          feesReceived: data.feesReceived || 0,
          feesDue: data.feesDue || 0,
          course: data.course,
          batchStart: data.batchStart,
          batchEnd: data.batchEnd
        });
      });
      setStudents(studs);
    });

    // Fetch Receipts History
    const qReceipts = query(collection(db, 'receipts'), orderBy('createdAt', 'desc'));
    const unsubReceipts = onSnapshot(qReceipts, (snapshot) => {
      const recs: Receipt[] = [];
      snapshot.forEach(doc => {
        recs.push({ id: doc.id, ...doc.data() } as Receipt);
      });
      setReceipts(recs);
      
      // Auto-generate next receipt number if not editing and field is empty
      setFormData(prev => {
        if (!prev.receiptNo) {
          const year = new Date().getFullYear();
          if (recs.length > 0) {
            const lastReceipt = recs[0].receiptNo || '';
            const match = lastReceipt.match(/(\d+)$/);
            if (match) {
              const nextNum = (parseInt(match[1], 10) + 1).toString().padStart(3, '0');
              const prefix = lastReceipt.substring(0, lastReceipt.length - match[1].length);
              return { ...prev, receiptNo: `${prefix}${nextNum}` };
            }
            return { ...prev, receiptNo: `#REC-${year}-001` };
          } else {
            return { ...prev, receiptNo: `#REC-${year}-001` };
          }
        }
        return prev;
      });
      
      setLoading(false);
    });

    // Fetch Courses
    getDocs(collection(db, 'courses')).then((snap: any) => {
      const courseData = snap.docs.map((doc: any) => ({
        id: doc.id,
        name: doc.data().name,
        code: doc.data().code || 'N/A'
      }));
      setCourses(courseData);
    });

    // Fetch Institute Details
    getDoc(doc(db, 'settings', 'institute')).then((snap: any) => {
      if (snap.exists()) {
        setInstituteDetails(snap.data());
      }
    });

    return () => {
      unsubStudents();
      unsubReceipts();
    };
  }, []);

  // Handle pre-population from URL
  useEffect(() => {
    if (urlStudentId) {
      setFormData(prev => ({ ...prev, studentId: urlStudentId }));
    }
  }, [urlStudentId]);

  // Auto-fill amount based on fees due of selected student
  useEffect(() => {
    if (formData.studentId && !editingId) {
      const student = students.find(s => s.id === formData.studentId);
      if (student) {
        setFormData(prev => ({ ...prev, amount: student.feesDue.toString() }));
      }
    }
  }, [formData.studentId, students, editingId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.receiptNo || !formData.amount || !formData.paymentType || !formData.date) {
      alert("Please fill out all required fields.");
      return;
    }

    const isDuplicateClient = receipts.some(r => r.receiptNo.toLowerCase().trim() === formData.receiptNo.toLowerCase().trim() && r.id !== editingId);
    if (isDuplicateClient) {
      alert(`Receipt Number "${formData.receiptNo}" already exists! Please use a unique Receipt Number.`);
      return;
    }

    const amountNum = Number(formData.amount);
    if (amountNum <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      // 0. Double-check uniqueness against live database to prevent multi-user duplicates
      const duplicateQuery = query(collection(db, 'receipts'), where('receiptNo', '==', formData.receiptNo.trim()));
      const duplicateSnap = await getDocs(duplicateQuery);
      const trulyDuplicate = duplicateSnap.docs.some(doc => doc.id !== editingId);
      
      if (trulyDuplicate) {
        alert(`Database Conflict: Receipt Number "${formData.receiptNo}" is already in use by another record. Please use another number.`);
        setIsSubmitting(false);
        return;
      }

      // 1. Fetch current student record to guarantee accurate calculation context
      const studentRef = doc(db, 'students', formData.studentId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        throw new Error("Student not found in database!");
      }

      const studentData = studentSnap.data();
      const currentFeesReceived = Number(studentData.feesReceived || 0);
      const feesPayable = Number(studentData.feesPayable || 0);

      let newFeesReceived = currentFeesReceived;

      if (editingId) {
        // If editing, isolate difference to prevent duplicate compounding
        const oldReceipt = receipts.find(r => r.id === editingId);
        if (!oldReceipt) throw new Error("Receipt not found");
        
        const difference = amountNum - oldReceipt.amount;
        newFeesReceived += difference;
        
        await updateDoc(doc(db, 'receipts', editingId), {
          studentId: formData.studentId,
          receiptNo: formData.receiptNo,
          amount: amountNum,
          paymentType: formData.paymentType,
          date: formData.date
        });
      } else {
        // Net new addition
        newFeesReceived += amountNum;
        
        await addDoc(collection(db, 'receipts'), {
          studentId: formData.studentId,
          receiptNo: formData.receiptNo,
          amount: amountNum,
          paymentType: formData.paymentType,
          date: formData.date,
          status: 'Verified',
          createdAt: serverTimestamp()
        });
      }

      const newFeesDue = feesPayable - newFeesReceived;

      // Update student natively with calculated totals
      await updateDoc(studentRef, {
        feesReceived: newFeesReceived,
        feesDue: newFeesDue
      });

      // Calculate the very next receipt number for the cleared form natively
      let nextReceiptNo = 'REC-1001';
      if (receipts.length > 0) {
        // Find the absolute highest/latest via temporary array injection since standard React state may queue.
        // Or simply wait for the onSnapshot listener to repopulate it automatically when the DB confirms the addition.
        // It's cleaner to just clear it, and let onSnapshot fill it.
      }

      // Clear form gracefully
      setFormData({
        studentId: '',
        receiptNo: '', // Intentionally blank, the onSnapshot listener above will auto-fill next number instantly
        amount: '',
        paymentType: '',
        date: new Date().toISOString().split('T')[0]
      });
      setEditingId(null);
      
    } catch (error: any) {
      console.error(error);
      alert("Error saving transaction: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (receipt: Receipt) => {
    setFormData({
      studentId: receipt.studentId,
      receiptNo: receipt.receiptNo,
      amount: receipt.amount.toString(),
      paymentType: receipt.paymentType,
      date: receipt.date
    });
    setEditingId(receipt.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (receipt: Receipt) => {
    if (window.confirm(`Are you sure you want to delete receipt ${receipt.receiptNo}? This will structurally reverse ₹${receipt.amount} on the student's balance.`)) {
      try {
        const studentRef = doc(db, 'students', receipt.studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          const currentFeesReceived = Number(studentData.feesReceived || 0);
          const feesPayable = Number(studentData.feesPayable || 0);
          
          const newFeesReceived = currentFeesReceived - receipt.amount;
          const newFeesDue = feesPayable - newFeesReceived;
          
          await updateDoc(studentRef, {
            feesReceived: newFeesReceived,
            feesDue: newFeesDue
          });
        }
        
        // Destroy receipt natively
        await deleteDoc(doc(db, 'receipts', receipt.id));
        
      } catch (error: any) {
        console.error(error);
        alert("Error securely deleting receipt: " + error.message);
      }
    }
  };

  const filteredReceipts = React.useMemo(() => {
    return receipts.filter(receipt => {
      const student = students.find(s => s.id === receipt.studentId);
      const searchTarget = (
        receipt.receiptNo + " " + 
        (student?.fullName || '') + " " + 
        (student?.regNumber || '')
      ).toLowerCase();
      
      return searchTarget.includes(receiptSearchQuery.toLowerCase());
    });
  }, [receipts, students, receiptSearchQuery]);

  const handlePrintReceipt = (receipt: Receipt) => {
    const student = students.find(s => s.id === receipt.studentId);
    if (!student) {
      alert("Student data not found for this receipt.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print the receipt.");
      return;
    }
    
    // Resolve course name and code
    const courseObj = courses.find(c => c.id === student.course);
    const courseName = courseObj ? `${courseObj.name} (${courseObj.code})` : 'Unknown Course';

    // Resolve Dynamic Institute Details
    const instName = instituteDetails?.instituteName || 'BitApp Institute';
    const address = instituteDetails?.address || '';
    const phone = instituteDetails?.contactNumber || '';
    
    const html = `
      <html>
        <head>
          <title>Receipt - ${receipt.receiptNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; line-height: 1.4; }
            .receipt-box { max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 25px; border-radius: 8px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 15px; align-items: flex-start; }
            .header-left { flex-basis: 70%; }
            .header-right { flex-basis: 30%; text-align: right; }
            .logo { font-size: 20px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: -0.5px; }
            .inst-address { font-size: 11px; color: #64748b; margin-top: 4px; max-width: 90%; }
            .receipt-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
            .receipt-value { font-size: 14px; font-weight: 700; color: #0f172a; }
            .content-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
            .field-group { flex: 1; }
            .field-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
            .field-value { font-size: 13px; font-weight: 600; color: #1e293b; }
            .text-right { text-align: right; }
            .amount-text { font-size: 18px; font-weight: 800; color: #2563eb; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #94a3b8; }
            @media print {
              body { padding: 0; }
              .receipt-box { border: none; max-width: 100%; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <div class="header-left">
                <div class="logo">${instName}</div>
                <div class="inst-address">${address} ${phone ? ' | ' + phone : ''}</div>
              </div>
              <div class="header-right">
                <div>
                  <div class="receipt-label">Receipt No</div>
                  <div class="receipt-value">#${receipt.receiptNo}</div>
                </div>
                <div style="margin-top: 8px;">
                  <div class="receipt-label">Date</div>
                  <div class="receipt-value">${new Date(receipt.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
            </div>
            
            <div class="content-row">
              <div class="field-group">
                <div class="field-label">Student Name</div>
                <div class="field-value">${student.fullName} <span style="font-weight: 400; color: #64748b;">(${student.regNumber})</span></div>
              </div>
              <div class="field-group text-right">
                <div class="field-label">Batch Time</div>
                <div class="field-value">${student.batchStart || '--'} - ${student.batchEnd || '--'}</div>
              </div>
            </div>

            <div class="content-row">
              <div class="field-group">
                <div class="field-label">Course</div>
                <div class="field-value">${courseName}</div>
              </div>
            </div>

            <div class="content-row" style="border-bottom: none; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 5px;">
              <div class="field-group">
                <div class="field-label">Payment Method</div>
                <div class="field-value" style="text-transform: capitalize;">${receipt.paymentType}</div>
              </div>
              <div class="field-group text-right">
                <div class="field-label">Amount Received</div>
                <div class="amount-text">₹${Number(receipt.amount).toLocaleString()}</div>
              </div>
            </div>

            <div class="footer">
              <p>Computer Generated Receipt | Valid without signature</p>
            </div>
          </div>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <ProtectedRoute module="fees" action="view">
    <div className="bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Fees Register</h1>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-600 font-medium text-sm hover:bg-blue-600/20 transition-colors">
            <Download className="w-4 h-4" />
            Statement
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-6 pb-24">
        {/* Add Payment Form Section */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{editingId ? 'Edit Payment' : 'Add Payment'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Record transaction details against a linked student</p>
            </div>
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Student</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <select name="studentId" value={formData.studentId} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none appearance-none transition-all font-medium text-slate-900 dark:text-slate-100 uppercase text-sm">
                    <option value="">Search / View Live Students...</option>
                    {students.map(s => {
                      const courseObj = courses.find(c => c.id === s.course);
                      const courseDisplay = courseObj ? ` [${courseObj.code}]` : '';
                      return (
                        <option key={s.id} value={s.id}>{s.regNumber} - {s.fullName}{courseDisplay} (Due: ₹{s.feesDue})</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Receipt No</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input name="receiptNo" value={formData.receiptNo} onChange={handleChange} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-mono text-slate-600 dark:text-slate-400" placeholder="REC-10293" type="text" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Amount Received</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                  <input name="amount" value={formData.amount} onChange={handleChange} required min="1" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white" placeholder="0.00" type="number" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payment Type</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <select name="paymentType" value={formData.paymentType} onChange={handleChange} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none appearance-none transition-all text-sm">
                    <option value="">Select Method</option>
                    <option value="gpay">GPay / PhonePe</option>
                    <option value="upi">UPI Transfer</option>
                    <option value="cash">Cash Payment</option>
                    <option value="card">Debit/Credit Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payment Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input name="date" value={formData.date} onChange={handleChange} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm" type="date" />
                </div>
              </div>
              <div className="md:col-span-2 pt-2">
                <button 
                  disabled={isSubmitting || !hasPermission('fees', editingId ? 'edit' : 'add')} 
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2" 
                  type="submit"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? <Edit2 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />)}
                  {editingId ? 'Update & Commit Ledger' : 'Confirm & Post Payment'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Payment History Table Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="text-blue-600 w-5 h-5" />
              Payment History
            </h2>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search receipts..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                value={receiptSearchQuery}
                onChange={(e) => setReceiptSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receipt No</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                        <span className="text-slate-500 font-medium tracking-wide">Fetching Secure Transactions...</span>
                      </td>
                    </tr>
                  ) : filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 font-medium tracking-wide">
                        {receiptSearchQuery ? `No receipts found matching "${receiptSearchQuery}"` : "No payment history found on the books."}
                      </td>
                    </tr>
                  ) : filteredReceipts.map((receipt) => {
                    const student = students.find(s => s.id === receipt.studentId);
                    return (
                      <tr key={receipt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{new Date(receipt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-mono text-slate-600 dark:text-slate-400 font-medium">#{receipt.receiptNo}</div>
                          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wide truncate max-w-[200px]">{student ? student.fullName : 'Inactive Student Record'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">₹{receipt.amount.toLocaleString()}</div>
                          <div className="flex items-center gap-1 mt-1 shrink-0">
                            {receipt.paymentType === 'cash' ? <Banknote className="w-3 h-3 text-slate-400" /> : receipt.paymentType === 'upi' ? <Landmark className="w-3 h-3 text-slate-400" /> : <CreditCard className="w-3 h-3 text-slate-400" />}
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{receipt.paymentType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold">
                              <span className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-green-500"></span>
                              {receipt.status}
                            </span>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                                <button onClick={() => handlePrintReceipt(receipt)} className="text-slate-400 hover:text-blue-600 transition-colors bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg">
                                  <Printer className="w-3.5 h-3.5"/>
                                </button>
                                {hasPermission('fees', 'edit') && (
                                  <button onClick={() => handleEdit(receipt)} className="text-slate-400 hover:text-blue-600 transition-colors bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg"><Edit2 className="w-3.5 h-3.5"/></button>
                                )}
                                {hasPermission('fees', 'edit') && (
                                  <button onClick={() => handleDelete(receipt)} className="text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                                )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {receipts.length > 0 && (
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{receipts.length} Total Processed Payments</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
    </ProtectedRoute>
  );
}

export default function FeesRegister() {
  return (
    <Suspense fallback={
      <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <FeesRegisterContent />
    </Suspense>
  );
}
