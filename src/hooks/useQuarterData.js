import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useQuarterData(yearId, sectionId, studentId, quarter) {
  const { user } = useAuth();
  const [data, setData] = useState({ notes: {}, generatedComment: '', editedComment: '', status: 'empty', snapshot: '' });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('saved'); // 'saved' | 'saving' | 'error'
  const debounceRef = useRef(null);
  const latestDataRef = useRef(data);

  const docPath = user && yearId && sectionId && studentId && quarter
    ? `teachers/${user.uid}/schoolYears/${yearId}/sections/${sectionId}/students/${studentId}/quarters/${quarter}`
    : null;

  useEffect(() => {
    if (!docPath) {
      setData({ notes: {}, generatedComment: '', editedComment: '', status: 'empty', snapshot: '' });
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, docPath), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setData(d);
        latestDataRef.current = d;
      } else {
        const empty = { notes: {}, generatedComment: '', editedComment: '', status: 'empty', snapshot: '' };
        setData(empty);
        latestDataRef.current = empty;
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [docPath]);

  const save = useCallback(async (updates) => {
    if (!docPath) return;
    setSaveState('saving');
    try {
      const ref = doc(db, docPath);
      const snap = await getDoc(ref);
      const merged = {
        ...(snap.exists() ? snap.data() : {}),
        ...updates,
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, merged, { merge: true });
      setSaveState('saved');
    } catch (err) {
      console.error('Save error:', err);
      setSaveState('error');
    }
  }, [docPath]);

  const debouncedSave = useCallback((updates) => {
    setSaveState('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(updates), 1000);
  }, [save]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateNotes = useCallback((key, value) => {
    setData((prev) => {
      const updated = {
        ...prev,
        notes: { ...prev.notes, [key]: value },
        status: prev.status === 'finalized' ? 'finalized' : 'in-progress',
      };
      latestDataRef.current = updated;
      debouncedSave({ notes: updated.notes, status: updated.status });
      return updated;
    });
  }, [debouncedSave]);

  const updateSnapshot = useCallback((value) => {
    setData((prev) => {
      const updated = { ...prev, snapshot: value };
      latestDataRef.current = updated;
      debouncedSave({ snapshot: value });
      return updated;
    });
  }, [debouncedSave]);

  const setComment = useCallback((generated, edited) => {
    const updates = {
      generatedComment: generated,
      editedComment: edited || generated,
      status: 'in-progress',
      generatedAt: serverTimestamp(),
    };
    setData((prev) => ({ ...prev, ...updates, generatedAt: new Date() }));
    save(updates);
  }, [save]);

  const updateEditedComment = useCallback((value) => {
    setData((prev) => {
      const updated = { ...prev, editedComment: value, status: prev.status === 'finalized' ? 'in-progress' : prev.status || 'in-progress' };
      latestDataRef.current = updated;
      debouncedSave({ editedComment: value, status: updated.status });
      return updated;
    });
  }, [debouncedSave]);

  const finalize = useCallback(() => {
    save({ status: 'finalized', finalizedAt: serverTimestamp() });
    setData((prev) => ({ ...prev, status: 'finalized' }));
  }, [save]);

  const unfinalize = useCallback(() => {
    save({ status: 'in-progress', finalizedAt: null });
    setData((prev) => ({ ...prev, status: 'in-progress' }));
  }, [save]);

  return {
    data,
    loading,
    saveState,
    updateNotes,
    updateSnapshot,
    setComment,
    updateEditedComment,
    finalize,
    unfinalize,
  };
}
