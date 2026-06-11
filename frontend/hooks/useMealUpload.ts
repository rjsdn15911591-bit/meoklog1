'use client';

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mealApi } from '@/lib/api';
import { useMealStore } from '@/store/mealStore';
import { getAutoMealType } from '@/lib/utils';
import type { DetectedFood, MealType } from '@/types';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/constants';

export function useMealUpload() {
  const queryClient = useQueryClient();
  const store = useMealStore();

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      alert('JPG, PNG, WEBP 파일만 업로드 가능합니다.');
      return;
    }
    // 이전 blob URL 해제 (메모리 누수 방지)
    if (store.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(store.previewUrl);
    }
    store.setSelectedFile(file);
    store.setPreviewUrl(URL.createObjectURL(file));
    store.setMealType(getAutoMealType());
    store.setStep('category');
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!store.selectedFile) throw new Error('파일이 선택되지 않았습니다.');
      store.setStep('analyzing');

      const formData = new FormData();
      formData.append('image', store.selectedFile);
      formData.append('meal_type', store.mealType);
      if (store.caption) formData.append('caption', store.caption);

      const res = await mealApi.create(formData);
      return res.data;
    },
    onSuccess: (data) => {
      const aiResult = data.data?.ai_result;
      if (aiResult) {
        store.setEditedFoods(aiResult.detected_foods);
        store.setMealId(data.data.meal_id);
      }
      store.setStep('review');
    },
    onError: () => {
      store.setStep('select');
      alert('분석에 실패했습니다. 다시 시도해주세요.');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!store.mealId) throw new Error('식사 ID가 없습니다.');
      return mealApi.updateFoods(store.mealId, store.editedFoods);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      store.setStep('done');
    },
    onError: () => {
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    },
  });

  const updateFood = (index: number, updated: Partial<DetectedFood>) => {
    const foods = [...store.editedFoods];
    foods[index] = { ...foods[index], ...updated, isEdited: true };
    store.setEditedFoods(foods);
  };

  const removeFood = (index: number) => {
    const foods = store.editedFoods.filter((_, i) => i !== index);
    store.setEditedFoods(foods);
  };

  const addFood = () => {
    const newFood: DetectedFood = {
      foodName: '',
      servingSize: 100,
      calories: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
      confidence: 0,
      isEdited: true,
    };
    store.setEditedFoods([...store.editedFoods, newFood]);
  };

  const { totalCalories, totalCarbs, totalProtein, totalFat } = useMemo(() =>
    store.editedFoods.reduce(
      (acc, f) => ({
        totalCalories: acc.totalCalories + f.calories,
        totalCarbs:    acc.totalCarbs    + f.carbs,
        totalProtein:  acc.totalProtein  + f.protein,
        totalFat:      acc.totalFat      + f.fat,
      }),
      { totalCalories: 0, totalCarbs: 0, totalProtein: 0, totalFat: 0 }
    ),
    [store.editedFoods]
  );

  return {
    step: store.step,
    selectedFile: store.selectedFile,
    previewUrl: store.previewUrl,
    mealType: store.mealType,
    setMealType: (type: MealType) => store.setMealType(type),
    editedFoods: store.editedFoods,
    caption: store.caption,
    setCaption: store.setCaption,
    handleFileSelect,
    startUpload: () => uploadMutation.mutate(),
    saveEdits: () => saveMutation.mutate(),
    updateFood,
    removeFood,
    addFood,
    reset: () => {
      if (store.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(store.previewUrl);
      }
      store.reset();
    },
    isAnalyzing: uploadMutation.isPending,
    isSaving: saveMutation.isPending,
    totalCalories,
    totalCarbs,
    totalProtein,
    totalFat,
  };
}
