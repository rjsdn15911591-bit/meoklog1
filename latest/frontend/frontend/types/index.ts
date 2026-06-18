// ======= 사용자 =======
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;
  weight?: number;
  activityLevel?: ActivityLevel;
  goalType?: GoalType;
  targetCalories?: number;
  targetCarbs?: number;
  targetProtein?: number;
  targetFat?: number;
  createdAt: string;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// ======= 음식 =======
export interface FoodItem {
  id: string;
  foodName: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  servingSize: number;
}

export interface DetectedFood {
  id?: string;
  foodItemId?: string;
  foodName: string;
  servingSize: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  confidence: number;
  isEdited: boolean;
  source?: 'ai' | 'manual';
  /** 100g(ml)당 영양소 밀도 — 그램 변경 시 반올림 누적 오차 방지용 */
  kcalPer100g?: number;
  carbsPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
}

// ======= 식사 기록 =======
export interface MealRecord {
  id: string;
  userId: string;
  groupId?: string;
  imageUrl: string;
  thumbnailUrl: string;
  mealType: MealType;
  uploadedAt: string;
  logDate: string;
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  detectedFoods: DetectedFood[];
  caption?: string;
  reactions?: Reaction[];
  comments?: Comment[];
  user?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export interface DailyTotal {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface DailyLogData {
  logDate: string;
  meals: MealRecord[];
  dailyTotal: DailyTotal;
}

export interface DailySummary {
  logDate: string;
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  targetCalories: number;
  achievementRate: number;
  mealCount: number;
  breakdown: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
}

// ======= 그룹 =======
export interface Group {
  id: string;
  groupName: string;
  groupCode: string;
  ownerId: string;
  members: GroupMember[];
  memberCount?: number;
  isOwner?: boolean;
  isPersonal?: boolean;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  joinedAt: string;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  todayCalories?: number;
  targetCalories?: number;
}

// ======= 소셜 =======
export type ReactionType = 'thumbsup' | 'yummy' | 'fire' | 'muscle' | 'sad';

export interface ReactionSummary {
  thumbsup?: number;
  yummy?: number;
  fire?: number;
  muscle?: number;
  sad?: number;
}

export interface Reaction {
  id: string;
  mealId: string;
  userId: string;
  type: ReactionType;
  user?: Pick<User, 'id' | 'name'>;
}

export interface Comment {
  id: string;
  mealId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

// ======= 칼로리 비교 =======
export interface DailyCalorieSummary {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  totalCalories: number;
  targetCalories: number;
  achievementRate: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
}

export interface CalorieCompareData {
  logDate: string;
  groupAverageCalories: number;
  rankings: DailyCalorieSummary[];
}

// ======= AI 분석 =======
export interface AIAnalysisResult {
  detectedFoods: DetectedFood[];
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  isMultiFoodDetected: boolean;
}

// ======= 그룹 피드 =======
export interface GroupFeedMeal extends MealRecord {
  reactionSummary: ReactionSummary;
  commentCount: number;
  myReaction?: ReactionType | null;
}

// ======= API 응답 =======
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}
