import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useSections(yearId) {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !yearId) {
      setSections([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'teachers', user.uid, 'schoolYears', yearId, 'sections'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSections(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.warn('useSections listener error:', err.message);
        setSections([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, yearId]);

  return { sections, loading };
}
