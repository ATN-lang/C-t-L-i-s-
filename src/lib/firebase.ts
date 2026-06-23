import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, Timestamp, getCountFromServer, where, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Error Handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth Helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

export const syncAchievementStats = async () => {
  try {
    const collRef = collection(db, 'collective_achievements');
    const exemplaryRef = collection(db, 'exemplary_members');
    const newsAwardsQuery = query(collection(db, 'news'), where('isAward', '==', true));
    const newsExemplaryQuery = query(collection(db, 'news'), where('category', '==', 'Gương sáng đội viên'));
    
    const [collCount, exemplaryCollCount, newsExemplaryCount, awardsCount] = await Promise.all([
      getCountFromServer(collRef),
      getCountFromServer(exemplaryRef),
      getCountFromServer(newsExemplaryQuery),
      getCountFromServer(newsAwardsQuery)
    ]);

    const totalExemplary = exemplaryCollCount.data().count + newsExemplaryCount.data().count;

    const docRef = doc(db, 'achievement_stats', 'global');
    await setDoc(docRef, {
      collectiveCount: collCount.data().count,
      exemplaryCount: totalExemplary,
      totalAwards: awardsCount.data().count,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return {
      collCount: collCount.data().count,
      exemplaryCount: totalExemplary,
      awardsCount: awardsCount.data().count
    };
  } catch (error) {
    console.error('Sync stats error:', error);
    return null;
  }
};
