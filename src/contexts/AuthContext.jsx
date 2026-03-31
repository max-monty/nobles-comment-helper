import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, firebaseConfigured } from '../config/firebase';
import { DEFAULT_SYSTEM_PROMPT } from '../lib/defaultPrompts';
import { DEFAULT_MODEL } from '../lib/constants';

const AuthContext = createContext(null);

const ALLOWED_DOMAIN = 'nobles.edu';

// Dev-only: fake user for preview testing (only active when ?dev=true in URL)
const DEV_MODE = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev');
const DEV_USER = DEV_MODE ? {
  uid: 'dev-teacher-001',
  email: 'dev@test.local',
  displayName: 'Dev Teacher',
  photoURL: null,
} : null;

function isAllowedEmail(email) {
  return email && email.endsWith(`@${ALLOWED_DOMAIN}`);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_USER);
  const [loading, setLoading] = useState(!DEV_MODE);
  const [configError, setConfigError] = useState(!firebaseConfigured && !DEV_MODE);
  const [domainError, setDomainError] = useState(false);

  useEffect(() => {
    if (DEV_MODE || !firebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Domain check: reject non-nobles.edu users immediately
        if (!isAllowedEmail(firebaseUser.email)) {
          // Delete the Firebase Auth user so it doesn't persist, then sign out
          try {
            await firebaseUser.delete();
          } catch (e) {
            // If delete fails (e.g., requires re-auth), just sign out
            await firebaseSignOut(auth);
          }
          setUser(null);
          setDomainError(true);
          setLoading(false);
          return;
        }

        setDomainError(false);
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
    setDomainError(false);
    try {
      await signInWithPopup(auth, googleProvider);
      // Domain check happens in onAuthStateChanged above
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') return;
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
    <AuthContext.Provider value={{ user, loading, signIn, signOut, configError, domainError }}>
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
