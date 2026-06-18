export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
] as const;

export const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: '비활동적',
  light: '가벼운 활동',
  moderate: '보통',
  active: '활발',
  very_active: '매우 활발',
};

export const GOAL_TYPE_LABELS: Record<string, string> = {
  lose: '체중 감량',
  maintain: '체중 유지',
  gain: '체중 증량',
};

export const REACTION_EMOJIS: Record<string, string> = {
  thumbsup: '👍',
  yummy: '😋',
  fire: '🔥',
  muscle: '💪',
  sad: '😭',
};

export const REACTION_TYPES = ['thumbsup', 'yummy', 'fire', 'muscle', 'sad'] as const;

export const DAY_START_HOUR = 4;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
