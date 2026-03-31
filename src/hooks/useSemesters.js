import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useSemesters(yearId) {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !yearId) {
      setSemesters([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'teachers', user.uid, 'schoolYears', yearId, 'semesters'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSemesters(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.warn('useSemesters listener error:', err.message);
        setSemesters([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, yearId]);

  return { semesters, loading };
}
