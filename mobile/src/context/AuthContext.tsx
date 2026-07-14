import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { apiLogin, apiLogout } from '../api/client';
import { students } from '../data/demo';
import { AuthUser, Student } from '../types';

type Role = 'admin' | 'parent' | null;

interface AuthState {
  role: Role;
  adminUser: AuthUser | null;
  parentStudent: Student | null;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  loginParent: (studentCode: string, phone: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);
  const [parentStudent, setParentStudent] = useState<Student | null>(null);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    const user = await apiLogin(email, password);
    if (!user) return false;
    setAdminUser(user);
    setRole('admin');
    return true;
  }, []);

  // Accès parent (mode démo, comme le web) : code élève + téléphone du parent.
  const loginParent = useCallback((studentCode: string, phone: string) => {
    const code = studentCode.trim().toUpperCase();
    const student = students.find(s => s.code === code)
      ?? (code === '' ? students[0] : undefined);
    if (!student || phone.trim().length < 6) return false;
    setParentStudent(student);
    setRole('parent');
    return true;
  }, []);

  const logout = useCallback(() => {
    if (role === 'admin') void apiLogout();
    setRole(null);
    setAdminUser(null);
    setParentStudent(null);
  }, [role]);

  const value = useMemo(
    () => ({ role, adminUser, parentStudent, loginAdmin, loginParent, logout }),
    [role, adminUser, parentStudent, loginAdmin, loginParent, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
