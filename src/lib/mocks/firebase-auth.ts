export interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: { providerId: string; email: string | null }[];
}

class MockAuth {
  app: any;
  currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor(app?: any) {
    this.app = app;
    // Load from localStorage if present
    const storedUser = localStorage.getItem('school_mock_auth_user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch {
        this.currentUser = null;
      }
    }
  }

  notify() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  addListener(cb: (user: User | null) => void) {
    this.listeners.push(cb);
    // Call immediately with current state
    cb(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('school_mock_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('school_mock_auth_user');
    }
    this.notify();
  }
}

const authInstance = new MockAuth();

export function getAuth(app?: any) {
  return authInstance;
}

export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
}

export async function signInWithPopup(auth: MockAuth, provider: any) {
  const mockUser: User = {
    uid: 'mock-uid-anrompro',
    email: 'anrompro@gmail.com',
    emailVerified: true,
    displayName: 'Thầy Tổng Phụ Trách (An Rom)',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    isAnonymous: false,
    tenantId: null,
    providerData: [{ providerId: 'google.com', email: 'anrompro@gmail.com' }]
  };
  auth.setCurrentUser(mockUser);
  return { user: mockUser };
}

export async function signOut(auth: MockAuth) {
  auth.setCurrentUser(null);
}

export function onAuthStateChanged(auth: MockAuth, callback: (user: User | null) => void) {
  return auth.addListener(callback);
}
