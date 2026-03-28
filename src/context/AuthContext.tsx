'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, getDocs, collection, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserPermissions {
  [module: string]: {
    view: boolean;
    edit: boolean;
    add: boolean;
  };
}

interface User {
  id: string;
  fullName: string;
  role: 'admin' | 'faculty' | 'student';
  permissions?: UserPermissions;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (id: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  hasPermission: (module: string, action: 'view' | 'edit' | 'add') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('bitapp_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
    
    // Initialize admin if no users exist
    const initAdmin = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        if (usersSnap.empty) {
          // No users found, create default admin
          const adminData = {
            id: 'admin',
            password: 'admin', // In a real app, hash this
            fullName: 'Administrator',
            role: 'admin',
            createdAt: serverTimestamp(),
            permissions: {
              dashboard: { view: true, edit: true, add: true },
              students: { view: true, edit: true, add: true },
              fees: { view: true, edit: true, add: true },
              courses: { view: true, edit: true, add: true },
              staff: { view: true, edit: true, add: true },
              settings: { view: true, edit: true, add: true }
            }
          };
          await setDoc(doc(db, 'users', 'admin'), adminData);
          console.log("Initialized default admin account: admin/admin");
        }
      } catch (e) {
        console.error("Error initializing admin:", e);
      }
    };

    initAdmin().finally(() => setLoading(false));
  }, []);

  const login = async (id: string, password: string) => {
    try {
      // 1. Check in 'users' collection (Admin/Faculty)
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.password === password) {
          const authenticatedUser: User = {
            id: userData.id,
            fullName: userData.fullName,
            role: userData.role,
            permissions: userData.permissions
          };
          setUser(authenticatedUser);
          localStorage.setItem('bitapp_user', JSON.stringify(authenticatedUser));
          return { success: true, message: 'Login successful' };
        }
      }

      // 2. Check in 'students' collection (Student login via Reg Number)
      const studentsQuery = query(collection(db, 'students'), where('regNumber', '==', id));
      const studentSnap = await getDocs(studentsQuery);

      if (!studentSnap.empty) {
        const studentDoc = studentSnap.docs[0];
        const studentData = studentDoc.data();
        
        // Use a default password or a specific one if set
        const studentPassword = studentData.password || '123456'; 
        
        if (studentPassword === password) {
          const authenticatedUser: User = {
            id: studentData.regNumber,
            fullName: studentData.fullName,
            role: 'student',
            permissions: {
              dashboard: { view: true, edit: false, add: false }
            }
          };
          setUser(authenticatedUser);
          localStorage.setItem('bitapp_user', JSON.stringify(authenticatedUser));
          return { success: true, message: 'Login successful' };
        }
      }

      return { success: false, message: 'Invalid ID or Password' };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, message: error.message || 'An error occurred during login' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bitapp_user');
  };

  const hasPermission = (module: string, action: 'view' | 'edit' | 'add') => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!user.permissions || !user.permissions[module]) return false;
    return user.permissions[module][action] || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
