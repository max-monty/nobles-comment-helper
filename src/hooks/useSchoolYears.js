import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useSchoolYears() {
  const { user } = useAuth();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setYears([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'teachers', user.uid, 'schoolYears'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setYears(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.warn('useSchoolYears listener error:', err.message);
        setYears([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { years, loading };
}
