import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, firebaseConfigured } from '../config/firebase';
import { DEFAULT_SYSTEM_PROMPT } from '../lib/defaultPrompts';
import { DEFAULT_MODEL } from '../lib/constants';

const AuthContext = createContext(null);

// Dev-only: fake user for preview testing (only active when ?dev=true in URL)
const DEV_MODE = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev');
const DEV_USER = DEV_MODE ? {
  uid: 'dev-teacher-001',
  email: 'dev@test.local',
  displayName: 'Dev Teacher',
  photoURL: null,
} : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_USER);
  const [loading, setLoading] = useState(!DEV_MODE);
  const [configError, setConfigError] = useState(!firebaseConfigured && !DEV_MODE);

  useEffect(() => {
    if (DEV_MODE || !firebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const teacherRef = doc(db, 'teachers', firebaseUser.uid);
          const teacherSnap = await getDoc(teacherRef);
          if (!teacherSnap.exists()) {
            await setDoc(teacherRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
              defaultModel: DEFAULT_MODEL,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error('Error creating teacher doc:', err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    if (DEV_MODE) {
      setUser(DEV_USER);
      return;
    }
    if (!firebaseConfigured) {
      throw new Error('Firebase is not configured. Add your Firebase config to .env.local');
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Restrict to @nobles.edu domain
      const email = result.user?.email || '';
      if (!email.endsWith('@nobles.edu')) {
        await firebaseSignOut(auth);
        throw new Error('Access is restricted to @nobles.edu accounts. Please sign in with your school email.');
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (DEV_MODE) {
      setUser(null);
      return;
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, configError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
