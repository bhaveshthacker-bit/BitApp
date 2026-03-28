'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, UserCircle, FileText, UserCheck, Loader2 } from 'lucide-react';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

const TIME_OPTIONS = [
  '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
  '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
];

const parseTimeToHours = (timeStr: string) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours + minutes / 60;
};

function RegistrationForm() {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(!!studentId);
  const [formData, setFormData] = useState({
    regNumber: '',
    regDate: '',
    fullName: '',
    dob: '',
    education: '',
    course: '',
    batchStart: '09:00 AM',
    batchEnd: '10:00 AM',
    mobile: '',
    parentsContact: '',
    address: '',
    img: '',
    doc1Url: '',
    doc2Url: '',
    totalFees: 0,
    discount: 0,
    feesPayable: 0,
    feesReceived: 0,
    feesDue: 0,
    status: 'Running'
  });

  const [courses, setCourses] = useState<{id: string, name: string, code: string, fees: number}[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [instituteDetails, setInstituteDetails] = useState<any>(null);

  const [files, setFiles] = useState({
    photo: null as File | null,
    doc1: null as File | null,
    doc2: null as File | null
  });

  useEffect(() => {
    if (studentId) {
      const fetchStudent = async () => {
        try {
          const docRef = doc(db, 'students', studentId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData(prev => ({ ...prev, ...data }));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingInitial(false);
        }
      };

      const fetchReceipts = async () => {
        try {
          const q = query(collection(db, 'receipts'), where('studentId', '==', studentId));
          const snap = await getDocs(q);
          const recs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          // Natively sort descending by date (avoiding complex index requirements)
          recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setReceipts(recs);
        } catch (e) {
          console.error("Error fetching receipts: ", e);
        }
      };

      fetchStudent();
      fetchReceipts();
    } else {
      const fetchLatestRegNumber = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'students'));
          let maxNum = 0;
          const currentYear = new Date().getFullYear();
          const prefix = `REG-${currentYear}-`;
          
          querySnapshot.forEach(doc => {
            const reg = doc.data().regNumber || '';
            if (reg.startsWith(prefix)) {
              const numPart = parseInt(reg.split('-')[2], 10);
              if (!isNaN(numPart) && numPart > maxNum) {
                maxNum = numPart;
              }
            }
          });
          
          const nextNum = (maxNum + 1).toString().padStart(3, '0');
          setFormData(prev => ({ ...prev, regNumber: `${prefix}${nextNum}` }));
        } catch (e) {
          console.error("Error fetching latest reg number:", e);
        }
      };
      
      fetchLatestRegNumber();
    }

    const fetchCourses = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'courses'));
        const courseData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          code: doc.data().code || 'N/A',
          fees: doc.data().fees || 0
        }));
        setCourses(courseData);
      } catch (e) {
        console.error("Error fetching courses: ", e);
      }
    };

    const fetchInstituteDetails = async () => {
      try {
        const docRef = doc(db, 'settings', 'institute');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInstituteDetails(docSnap.data());
        }
      } catch (e) {
        console.error("Error fetching institute details: ", e);
      }
    };

    fetchCourses();
    fetchInstituteDetails();
  }, [studentId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated: any = { ...prev, [name]: value };
      
      if (name === 'course') {
        const selectedCourse = courses.find(c => c.id === value);
        updated.totalFees = selectedCourse ? selectedCourse.fees : 0;
      }
      
      if (['discount', 'feesReceived', 'totalFees'].includes(name)) {
        updated[name] = Number(value) || 0;
      }
      
      updated.feesPayable = Number(updated.totalFees) - Number(updated.discount);
      updated.feesDue = updated.feesPayable - Number(updated.feesReceived);
      
      return updated;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc1' | 'doc2') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const uploadFile = async (file: File, folder: string, prefix: string) => {
    const filename = `${folder}/${prefix}-${Date.now()}-${file.name}`;
    const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
      method: 'POST',
      body: file,
    });
    let newBlob;
    try {
      newBlob = await response.json();
    } catch (e) {
      throw new Error(`Upload failed for ${filename}. Server did not return JSON.`);
    }
    if (!response.ok || newBlob.error) {
      throw new Error(newBlob.error || 'Unknown upload error');
    }
    return newBlob.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.regNumber || !formData.course) {
      alert("Please fill out Name, Registration Number, and Course.");
      return;
    }

    // Batch Duration Validation
    const startHours = parseTimeToHours(formData.batchStart);
    const endHours = parseTimeToHours(formData.batchEnd);
    const duration = endHours - startHours;

    if (duration <= 0) {
      alert("Batch end time must be after start time.");
      return;
    }

    if (duration > 3) {
      alert("Batch duration cannot exceed 3 hours.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const baseFolder = formData.regNumber || 'uploads';
      let imgUrl = formData.img;
      let d1Url = formData.doc1Url;
      let d2Url = formData.doc2Url;

      if (files.photo) imgUrl = await uploadFile(files.photo, `students/${baseFolder}`, 'photo');
      if (files.doc1) d1Url = await uploadFile(files.doc1, `students/${baseFolder}`, 'doc1');
      if (files.doc2) d2Url = await uploadFile(files.doc2, `students/${baseFolder}`, 'doc2');

      const finalData = {
        ...formData,
        img: imgUrl,
        doc1Url: d1Url,
        doc2Url: d2Url,
      };

      if (studentId) {
        await updateDoc(doc(db, 'students', studentId), finalData);
        alert('Student profile updated successfully!');
      } else {
        await addDoc(collection(db, 'students'), {
          ...finalData,
          status: 'Running',
          createdAt: serverTimestamp()
        });
        alert('Student registered successfully!');
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Error saving document: ", error);
      alert('Error updating student: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = (receipt: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print the receipt.");
      return;
    }
    
    // Resolve course name
    const courseObj = courses.find(c => c.id === formData.course);
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
            .field-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; margin-top: 0; }
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
                <div class="field-value">${formData.fullName} <span style="font-weight: 400; color: #64748b;">(${formData.regNumber})</span></div>
              </div>
              <div class="field-group text-right">
                <div class="field-label">Batch Time</div>
                <div class="field-value">${formData.batchStart || '--'} - ${formData.batchEnd || '--'}</div>
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

  if (loadingInitial) {
    return (
      <div className="flex bg-slate-50 dark:bg-slate-900 flex-col min-h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Loading Student Profile...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute module="students" action="view">
    <div className="bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 min-h-screen pb-12">
      <form onSubmit={handleSubmit} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-xl mx-auto">
        
        {/* Top App Bar */}
        <div className="flex items-center bg-white dark:bg-slate-800 p-4 sticky top-0 z-10 shadow-sm">
          <Link href="/dashboard" className="text-blue-600 flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
            {studentId ? 'Edit Student Profile' : 'Student Registration'}
          </h2>
        </div>

        {/* Form Container */}
        <div className="p-4 space-y-6">
          
          {/* Basic Information Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600/80 mb-2">Basic Information</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Registration Number</label>
              <input name="regNumber" value={formData.regNumber} onChange={handleChange} required className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4" placeholder="REG-2024-001" type="text" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Registration Date</label>
              <input name="regDate" value={formData.regDate} onChange={handleChange} className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4" type="date" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Full Name</label>
              <input name="fullName" value={formData.fullName} onChange={handleChange} required readOnly={!!studentId} className={`form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4 ${studentId ? 'opacity-70 cursor-not-allowed' : ''}`} placeholder="John Doe" type="text" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Date of Birth</label>
              <input name="dob" value={formData.dob} onChange={handleChange} className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4" type="date" />
            </div>

            {studentId && (
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Student Status</label>
                <select name="status" value={formData.status || 'Running'} onChange={handleChange} className="form-select w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4 text-sm">
                  <option value="Running">Running</option>
                  <option value="Break">Break</option>
                  <option value="Cancel">Cancel</option>
                  <option value="Exam Pending">Exam Pending</option>
                  <option value="Exam Given">Exam Given</option>
                  <option value="Certificate Requested">Certificate Requested</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            )}
          </div>

          {/* Academic Details Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600/80 mb-2">Academic Details</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Education</label>
              <input name="education" value={formData.education} onChange={handleChange} className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4" placeholder="e.g. High School, Graduate" type="text" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Course</label>
              <select name="course" value={formData.course} onChange={handleChange} required className="form-select w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4">
                <option value="">Select a course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Batch Start</label>
                <select name="batchStart" value={formData.batchStart} onChange={handleChange} className="form-select w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4 text-sm">
                  {TIME_OPTIONS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Batch End</label>
                <select name="batchEnd" value={formData.batchEnd} onChange={handleChange} className="form-select w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4 text-sm">
                  {TIME_OPTIONS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fee Details Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600/80 mb-2">Fee Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Total Fees (₹)</label>
                <input name="totalFees" value={formData.totalFees} readOnly className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 h-12 px-4 cursor-not-allowed" type="number" />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Discount (₹)</label>
                <input name="discount" value={formData.discount} onChange={handleChange} min="0" className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4" type="number" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Fees Payable (₹)</label>
                <input name="feesPayable" value={formData.feesPayable} readOnly className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 font-semibold h-12 px-4 cursor-not-allowed" type="number" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Fees Received (₹)</label>
                <div className="group relative">
                  <input name="feesReceived" value={formData.feesReceived} readOnly className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 h-12 px-4 cursor-not-allowed" type="number" title="Fees Received are auto-updated from the Receipts Module" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Fees Due (₹)</label>
                <input name="feesDue" value={formData.feesDue} readOnly className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold h-12 px-4 cursor-not-allowed" type="number" />
              </div>
            </div>
          </div>

          {/* Payment History / Receipts Card (Only available when editing an existing student) */}
          {studentId && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600/80">Payment History</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md">{receipts.length} Transactions</span>
              </div>
              
              {receipts.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg">
                  <p className="text-sm text-slate-500 font-medium">No payment history found for this student.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receipts.map(receipt => (
                    <div key={receipt.id} className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white shrink-0">₹{Number(receipt.amount).toLocaleString()}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 px-1.5 py-0.5 rounded-sm">{receipt.paymentType}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                          <span className="font-mono text-slate-400">#{receipt.receiptNo}</span>
                          <span>•</span>
                          <span>{new Date(receipt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handlePrintReceipt(receipt)}
                        className="text-xs font-bold text-blue-600 bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Print Receipt</span>
                        <span className="sm:hidden">Print</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact Information Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600/80 mb-2">Contact Details</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Mobile Number</label>
              <input name="mobile" value={formData.mobile} onChange={handleChange} className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4" placeholder="+1 (555) 000-0000" type="tel" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Parent's Contact</label>
              <input name="parentsContact" value={formData.parentsContact} onChange={handleChange} className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 h-12 px-4" placeholder="+1 (555) 000-0000" type="tel" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Full Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} className="form-textarea w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-blue-600 min-h-[100px] p-4 resize-none" placeholder="Enter complete residential address"></textarea>
            </div>
          </div>

          {/* File Uploads Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600/80 mb-2">Required Documents</h3>
            <div className="grid grid-cols-3 gap-3">
              
              {/* Photo Upload */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-blue-600/5 transition-colors cursor-pointer group relative overflow-hidden">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} />
                {formData.img && !files.photo && (
                  <img src={formData.img} alt="Current Photo" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-10 transition-opacity" />
                )}
                <UserCircle className={`w-8 h-8 ${files.photo ? 'text-green-500' : 'text-blue-600'} mb-2 group-hover:scale-110 transition-transform relative z-10`} />
                <span className={`text-[10px] font-bold ${files.photo ? 'text-green-600' : 'text-slate-500 dark:text-slate-400'} uppercase relative z-10 text-center`}>
                  {files.photo ? files.photo.name.substring(0, 8)+'...' : (formData.img ? 'Update Photo' : 'Upload Photo')}
                </span>
              </label>

              {/* Doc 1 Upload */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-blue-600/5 transition-colors cursor-pointer group relative">
                <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'doc1')} />
                <FileText className={`w-8 h-8 ${files.doc1 ? 'text-green-500' : (formData.doc1Url ? 'text-blue-400' : 'text-blue-600')} mb-2 group-hover:scale-110 transition-transform`} />
                <span className={`text-[10px] font-bold ${files.doc1 ? 'text-green-600' : 'text-slate-500 dark:text-slate-400'} uppercase relative z-10 text-center`}>
                  {files.doc1 ? files.doc1.name.substring(0, 8)+'...' : (formData.doc1Url ? 'Update Doc 1' : 'Upload Doc 1')}
                </span>
                {formData.doc1Url && !files.doc1 && <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>}
              </label>

              {/* Doc 2 Upload */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-blue-600/5 transition-colors cursor-pointer group relative">
                <input type="file" className="hidden" onChange={(e) => handleFileChange(e, 'doc2')} />
                <FileText className={`w-8 h-8 ${files.doc2 ? 'text-green-500' : (formData.doc2Url ? 'text-blue-400' : 'text-blue-600')} mb-2 group-hover:scale-110 transition-transform`} />
                <span className={`text-[10px] font-bold ${files.doc2 ? 'text-green-600' : 'text-slate-500 dark:text-slate-400'} uppercase relative z-10 text-center`}>
                  {files.doc2 ? files.doc2.name.substring(0, 8)+'...' : (formData.doc2Url ? 'Update Doc 2' : 'Upload Doc 2')}
                </span>
                {formData.doc2Url && !files.doc2 && <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>}
              </label>

            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 pb-8">
            <button 
              disabled={isSubmitting || !hasPermission('students', studentId ? 'edit' : 'add')} 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:pointer-events-none text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{studentId ? 'Update Student Profile' : 'Register Student'}</span>
                  <UserCheck className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
            <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-4">
              By saving, you agree to our Terms of Service
            </p>
          </div>
          
        </div>
      </form>
    </div>
    </ProtectedRoute>
  );
}

export default function StudentRegistrationWrapper() {
  return (
    <Suspense fallback={<div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <RegistrationForm />
    </Suspense>
  );
}
