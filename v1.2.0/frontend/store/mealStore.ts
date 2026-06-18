import { create } from 'zustand';
import type { DetectedFood, MealType } from '@/types';

export type UploadStep = 'select' | 'category' | 'analyzing' | 'review' | 'done';

interface MealState {
  step: UploadStep;
  selectedFile: File | null;
  previewUrl: string | null;
  mealType: MealType;
  mealId: string | null;
  /** AI 원본 결과 — 양 조절 슬라이더의 기준값 */
  originalFoods: DetectedFood[];
  editedFoods: DetectedFood[];
  caption: string;
  uploadProgress: number;
  /** 양 조절 배율 (0.5 / 1.0 / 1.5 / 2.0) */
  servingRatio: number;
  /** 공유할 그룹 ID 목록 */
  selectedGroupIds: string[];
  setStep: (step: UploadStep) => void;
  setSelectedFile: (file: File | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setMealType: (type: MealType) => void;
  setMealId: (id: string | null) => void;
  setOriginalFoods: (foods: DetectedFood[]) => void;
  setEditedFoods: (foods: DetectedFood[]) => void;
  setCaption: (caption: string) => void;
  setUploadProgress: (progress: number) => void;
  setServingRatio: (ratio: number) => void;
  setSelectedGroupIds: (ids: string[]) => void;
  reset: () => void;
}

export const useMealStore = create<MealState>((set) => ({
  step: 'select',
  selectedFile: null,
  previewUrl: null,
  mealType: 'lunch',
  mealId: null,
  originalFoods: [],
  editedFoods: [],
  caption: '',
  uploadProgress: 0,
  servingRatio: 1.0,
  selectedGroupIds: [],
  setStep: (step) => set({ step }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setMealType: (mealType) => set({ mealType }),
  setMealId: (mealId) => set({ mealId }),
  setOriginalFoods: (originalFoods) => set({ originalFoods }),
  setEditedFoods: (editedFoods) => set({ editedFoods }),
  setCaption: (caption) => set({ caption }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setServingRatio: (servingRatio) => set({ servingRatio }),
  setSelectedGroupIds: (selectedGroupIds) => set({ selectedGroupIds }),
  reset: () =>
    set({
      step: 'select',
      selectedFile: null,
      previewUrl: null,
      mealId: null,
      originalFoods: [],
      editedFoods: [],
      caption: '',
      uploadProgress: 0,
      servingRatio: 1.0,
      selectedGroupIds: [],
    }),
}));
