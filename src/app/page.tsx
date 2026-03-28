import React from 'react';
import Link from 'next/link';
import { BookOpen, Users, LogIn, ChevronRight, Monitor, GraduationCap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-slate-800 font-sans selection:bg-indigo-200">
      
      {/* Navigation */}
      <nav className="fixed w-full z-50 transition-all duration-300 backdrop-blur-md bg-white/70 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Bit Computers
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Features</Link>
              <Link href="#testimonials" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Testimonials</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden sm:inline-flex items-center justify-center text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Log in
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white transition-all bg-indigo-600 rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pb-32 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Decorative background blobs */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

          <div className="text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/50 mb-8 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
              <span className="text-xs font-medium text-indigo-600">Student Management System 2.0 is live</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              <span className="block text-slate-900 mb-2">Empowering</span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
                Digital Education
              </span>
            </h1>
            
            <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10">
              Streamline your institute's operations with our advanced student management platform. Built specifically for modern computer training centers.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex px-8 py-4 text-base font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 hover:shadow-xl transition-all active:scale-95 gap-2 items-center justify-center group"
              >
                <LogIn className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Staff Portal
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all active:scale-95 gap-2 items-center justify-center group"
              >
                Explore Features
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Value Props */}
          <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                title: "Student Tracking",
                description: "Monitor attendance, grades, and course progression in real-time.",
                icon: Users,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                title: "Course Management",
                description: "Organize syllabuses, assignments, and digital resources efficiently.",
                icon: BookOpen,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                title: "Performance Analytics",
                description: "Generate comprehensive reports and insights on student achievements.",
                icon: GraduationCap,
                color: "text-purple-600",
                bg: "bg-purple-50",
              }
            ].map((feature, idx) => (
              <div key={idx} className="relative group p-8 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 shadow-inner`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
          
        </div>
      </main>
    </div>
  );
}
