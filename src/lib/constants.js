export const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (fast)' },
  { id: 'claude-opus-4-6', label: 'Opus 4.6 (best)' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (fastest)' },
];

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

export const DEFAULT_WORD_COUNT_TARGET = 200;
export const WORD_COUNT_RANGE = { min: 180, max: 220 };

export const STUDENT_STATUS = {
  EMPTY: 'empty',
  IN_PROGRESS: 'in-progress',
  FINALIZED: 'finalized',
};

export const DEFAULT_SEMESTERS = [
  { label: 'S1', order: 1, quarters: ['Q1', 'Q2'] },
  { label: 'S2', order: 2, quarters: ['Q3', 'Q4'] },
];
