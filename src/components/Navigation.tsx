'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, CreditCard, Settings, LayoutDashboard, Users, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Navigation() {
  const { user, logout, hasPermission } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const allLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { name: 'Courses', href: '/courses', icon: BookOpen, module: 'courses' },
    { name: 'Fees', href: '/fees', icon: CreditCard, module: 'fees' },
    { name: 'Staff', href: '/staff', icon: Users, module: 'staff' },
    { name: 'Settings', href: '/settings', icon: Settings, module: 'settings' },
    { name: 'Profile', href: '/profile', icon: UserCircle, module: 'profile' },
  ];

  const navLinks = allLinks.filter(link => 
    link.module === 'profile' || hasPermission(link.module, 'view')
  );

  return (
    <>
      {/* Desktop/Tablet Sidebar (Hidden on Mobile) */}
      <nav className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex h-16 shrink-0 items-center px-6 font-bold text-xl text-blue-600 tracking-tight border-b border-slate-200 dark:border-slate-800">
          Bit Computers
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto mt-6 px-4 gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex gap-x-3 rounded-lg p-3 text-sm font-semibold leading-6 transition-colors ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'}`}/>
                {link.name}
              </Link>
            )
          })}
        </div>
        
        <div className="mt-auto px-4">
          <button 
            onClick={logout}
            className="flex w-full gap-x-3 rounded-lg p-3 text-sm font-semibold leading-6 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="flex justify-around items-center h-16 px-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-blue-600'}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wider">{link.name}</span>
              </Link>
            )
          })}
          <button 
            onClick={logout}
            className="flex flex-col items-center gap-1 text-red-500"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-medium tracking-wider">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
