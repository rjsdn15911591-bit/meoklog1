import { create } from 'zustand';
import type { DetectedFood, MealType } from '@/types';

export type UploadStep = 'select' | 'category' | 'analyzing' | 'review' | 'done';

interface MealState {
  step: UploadStep;
  selectedFile: File | null;
  previewUrl: string | null;
  mealType: MealType;
  mealId: string | null;
  editedFoods: DetectedFood[];
  caption: string;
  uploadProgress: number;
  setStep: (step: UploadStep) => void;
  setSelectedFile: (file: File | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setMealType: (type: MealType) => void;
  setMealId: (id: string | null) => void;
  setEditedFoods: (foods: DetectedFood[]) => void;
  setCaption: (caption: string) => void;
  setUploadProgress: (progress: number) => void;
  reset: () => void;
}

export const useMealStore = create<MealState>((set) => ({
  step: 'select',
  selectedFile: null,
  previewUrl: null,
  mealType: 'lunch',
  mealId: null,
  editedFoods: [],
  caption: '',
  uploadProgress: 0,
  setStep: (step) => set({ step }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setMealType: (mealType) => set({ mealType }),
  setMealId: (mealId) => set({ mealId }),
  setEditedFoods: (editedFoods) => set({ editedFoods }),
  setCaption: (caption) => set({ caption }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  reset: () =>
    set({
      step: 'select',
      selectedFile: null,
      previewUrl: null,
      mealId: null,
      editedFoods: [],
      caption: '',
      uploadProgress: 0,
    }),
}));
