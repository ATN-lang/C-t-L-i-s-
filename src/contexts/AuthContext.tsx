import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export interface UserPermissions {
  canManageNews: boolean;
  canManageActivities: boolean;
  canManageSchedules: boolean;
  canManageRegistrations: boolean;
  canManageAchievements: boolean;
  canManageMembers: boolean;
  canManageMessages: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canManageClubs: boolean;
  canDeleteContent: boolean;
  canCreateContent: boolean;
  canEditContent: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: UserPermissions | null;
  login: () => Promise<any>;
  loginWithCredentials: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);

  const [credentialsSession, setCredentialsSession] = useState<{ username: string; password?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let unsubscribeRole: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;

    if (credentialsSession) {
      // Listen to credentials-based role document
      unsubscribeRole = onSnapshot(doc(db, 'roles', credentialsSession.username), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Check if password matches
          if (data.password === credentialsSession.password) {
            setIsAdmin(data.isAdmin || false);
            setIsSuperAdmin(data.isSuperAdmin || cleanSuperAdminCheck(credentialsSession.username, data));
            if (data.permissions) {
              setPermissions({
                ...data.permissions,
                canDeleteContent: data.permissions.canDeleteContent || false
              });
            } else {
              setPermissions(null);
            }
            setUser({
              uid: credentialsSession.username,
              email: data.email || `${credentialsSession.username}@admin.local`,
              displayName: credentialsSession.username,
            } as any);
          } else {
            // Password mismatch, sign out
            localStorage.removeItem('admin_session');
            setCredentialsSession(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setPermissions(null);
            setUser(null);
          }
        } else {
          // Document does not exist yet (check for hardcoded default fallback for superadmin)
          if (credentialsSession.username === 'superadmin' && credentialsSession.password === 'admin123') {
            setIsAdmin(true);
            setIsSuperAdmin(true);
            setPermissions({
              canManageNews: true,
              canManageActivities: true,
              canManageSchedules: true,
              canManageRegistrations: true,
              canManageAchievements: true,
              canManageMembers: true,
              canManageMessages: true,
              canManageSettings: true,
              canManageUsers: true,
              canManageClubs: true,
              canDeleteContent: true,
              canCreateContent: true,
              canEditContent: true
            });
            setUser({
              uid: 'superadmin',
              email: 'superadmin@admin.local',
              displayName: 'Super Admin',
            } as any);
          } else {
            localStorage.removeItem('admin_session');
            setCredentialsSession(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setPermissions(null);
            setUser(null);
          }
        }
        setLoading(false);
      }, (error) => {
        console.error("Error listening to credentials permissions:", error);
        setLoading(false);
      });
    } else {
      // Normal Google login flow
      unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        if (unsubscribeRole) {
          unsubscribeRole();
          unsubscribeRole = null;
        }

        if (currentUser) {
          const email = currentUser.email?.toLowerCase() || '';
          
          unsubscribeRole = onSnapshot(doc(db, 'roles', email), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setIsAdmin(data.isAdmin || false);
              setIsSuperAdmin(data.isSuperAdmin || email === 'anrompro@gmail.com');
              if (data.permissions) {
                setPermissions({
                  ...data.permissions,
                  canDeleteContent: data.permissions.canDeleteContent || false
                });
              } else {
                setPermissions(null);
              }
            } else if (email === 'anrompro@gmail.com' || email === 'jullynguyennn@gmail.com') {
              setIsAdmin(true);
              setIsSuperAdmin(email === 'anrompro@gmail.com');
              setPermissions({
                canManageNews: true,
                canManageActivities: true,
                canManageSchedules: true,
                canManageRegistrations: true,
                canManageAchievements: true,
                canManageMembers: true,
                canManageMessages: true,
                canManageSettings: true,
                canManageUsers: true,
                canManageClubs: true,
                canDeleteContent: true,
                canCreateContent: true,
                canEditContent: true
              });
            } else {
              setIsAdmin(false);
              setIsSuperAdmin(false);
              setPermissions(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error listening to permissions:", error);
            setLoading(false);
          });

          setUser(currentUser);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setPermissions(null);
          setUser(null);
          setLoading(false);
        }
      });
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeRole) unsubscribeRole();
    };
  }, [credentialsSession]);

  function cleanSuperAdminCheck(username: string, data: any) {
    if (username === 'superadmin') return true;
    if (data.isSuperAdmin === true) return true;
    if (data.email?.toLowerCase() === 'anrompro@gmail.com') return true;
    return false;
  }

  const loginWithCredentials = async (username: string, password: string): Promise<boolean> => {
    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername === 'superadmin' && password === 'admin123') {
      const session = { username: cleanUsername, password };
      localStorage.setItem('admin_session', JSON.stringify(session));
      setCredentialsSession(session);
      return true;
    }

    try {
      const docSnap = await getDoc(doc(db, 'roles', cleanUsername));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.password === password) {
          const session = { username: cleanUsername, password };
          localStorage.setItem('admin_session', JSON.stringify(session));
          setCredentialsSession(session);
          return true;
        }
      }
      throw new Error('Sai tên đăng nhập hoặc mật khẩu!');
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'Lỗi xác thực và đăng nhập!', { cause: err });
    }
  };

  const signOut = async () => {
    localStorage.removeItem('admin_session');
    setCredentialsSession(null);
    await logout();
  };

  const value = {
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    permissions,
    login: loginWithGoogle,
    loginWithCredentials,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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
