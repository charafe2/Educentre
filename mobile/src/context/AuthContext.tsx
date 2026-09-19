import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { apiLogin, apiLoginParent, apiLogout, apiLogoutParent } from '../api/client';
import { unregisterPushNotifications } from '../services/notifications';
import { AuthUser, Student } from '../types';

type Role = 'admin' | 'parent' | null;

interface AuthState {
  role: Role;
  adminUser: AuthUser | null;
  // Tous les enfants rattachés au compte parent connecté (fratrie incluse).
  parentChildren: Student[];
  // Enfant actuellement consulté ; null quand une sélection est nécessaire (plusieurs enfants).
  parentStudent: Student | null;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  loginParent: (phone: string, password: string) => Promise<boolean>;
  selectChild: (studentId: number) => void;
  switchChild: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);
  const [parentChildren, setParentChildren] = useState<Student[]>([]);
  const [parentStudent, setParentStudent] = useState<Student | null>(null);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    const user = await apiLogin(email, password);
    if (!user) return false;
    setAdminUser(user);
    setRole('admin');
    return true;
  }, []);

  // Accès parent : numéro de téléphone + mot de passe fournis par le centre.
  // Un même numéro peut être rattaché à plusieurs enfants (fratrie) - sélection façon
  // "Netflix" avant d'accéder au suivi, comme sur le web.
  const loginParent = useCallback(async (phone: string, password: string) => {
    const children = await apiLoginParent(phone, password);
    if (!children || !children.length) return false;

    setParentChildren(children);
    setParentStudent(children.length === 1 ? children[0] : null);
    setRole('parent');
    return true;
  }, []);

  const selectChild = useCallback((studentId: number) => {
    setParentStudent(parentChildren.find(s => s.id === studentId) ?? null);
  }, [parentChildren]);

  const switchChild = useCallback(() => {
    setParentStudent(null);
  }, []);

  const logout = useCallback(() => {
    if (role === 'admin') void apiLogout();
    else if (role === 'parent') void apiLogoutParent();
    void unregisterPushNotifications();
    setRole(null);
    setAdminUser(null);
    setParentChildren([]);
    setParentStudent(null);
  }, [role]);

  const value = useMemo(
    () => ({
      role, adminUser, parentChildren, parentStudent,
      loginAdmin, loginParent, selectChild, switchChild, logout,
    }),
    [role, adminUser, parentChildren, parentStudent, loginAdmin, loginParent, selectChild, switchChild, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
