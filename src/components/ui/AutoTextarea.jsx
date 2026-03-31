import { useRef, useEffect, useCallback } from 'react';

export default function AutoTextarea({ value, onChange, className = '', ...rest }) {
  const ref = useRef(null);

  const adjustHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={ref}
      className={`w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm leading-relaxed resize-none overflow-hidden focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-300 ${className}`}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      {...rest}
    />
  );
}
