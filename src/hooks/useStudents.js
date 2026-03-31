import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useStudents(yearId, sectionId) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !yearId || !sectionId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'teachers', user.uid, 'schoolYears', yearId, 'sections', sectionId, 'students'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setStudents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.warn('useStudents listener error:', err.message);
        setStudents([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, yearId, sectionId]);

  return { students, loading };
}
