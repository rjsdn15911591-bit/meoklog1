'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mealApi, groupApi } from '@/lib/api';
import { useMealStore } from '@/store/mealStore';
import { getAutoMealType } from '@/lib/utils';
import type { DetectedFood, MealType } from '@/types';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/constants';
import { useDevStore } from '@/store/devStore';

const SERVING_RATIOS = [0.5, 1.0, 1.5, 2.0] as const;
export type ServingRatio = (typeof SERVING_RATIOS)[number];

function scaleFood(food: DetectedFood, ratio: number): DetectedFood {
  return {
    ...food,
    calories: Math.round(food.calories * ratio),
    carbs: Math.round(food.carbs * ratio * 10) / 10,
    protein: Math.round(food.protein * ratio * 10) / 10,
    fat: Math.round(food.fat * ratio * 10) / 10,
    servingSize: Math.round(food.servingSize * ratio),
  };
}

export function useMealUpload() {
  const queryClient = useQueryClient();
  const store = useMealStore();

  // 그룹 목록 (review 단계에서 사용)
  const { data: groups = [] } = useQuery({
    queryKey: ['my-groups'],
    queryFn: async () => {
      const res = await groupApi.getMyGroups();
      return res.data.data;
    },
    enabled: store.step === 'review',
    staleTime: 1000 * 60 * 5,
    select: (data) => {
      // 개인 하루로그를 맨 앞에 배치
      const personal = data.filter((g: { isPersonal?: boolean }) => g.isPersonal);
      const social = data.filter((g: { isPersonal?: boolean }) => !g.isPersonal);
      return [...personal, ...social];
    },
  });

  // groups가 로드됐는데 아무것도 선택 안 됐으면 개인 공간 자동 선택
  useEffect(() => {
    if (store.step === 'review' && groups.length > 0 && store.selectedGroupIds.length === 0) {
      const personal = groups.find((g: { isPersonal?: boolean }) => g.isPersonal);
      if (personal) store.setSelectedGroupIds([(personal as { id: string }).id]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, store.step]);

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      alert('JPG, PNG, WEBP 파일만 업로드 가능합니다.');
      return;
    }
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
    onSuccess: async (data) => {
      const aiResult = data.data?.aiResult;
      if (aiResult) {
        const taggedFoods = (aiResult.detectedFoods as DetectedFood[]).map((f) => ({
          ...f,
          source: 'ai' as const,
          kcalPer100g:     f.servingSize > 0 ? f.calories / f.servingSize * 100 : undefined,
          carbsPer100g:    f.servingSize > 0 ? f.carbs    / f.servingSize * 100 : undefined,
          proteinPer100g:  f.servingSize > 0 ? f.protein  / f.servingSize * 100 : undefined,
          fatPer100g:      f.servingSize > 0 ? f.fat      / f.servingSize * 100 : undefined,
        }));
        store.setOriginalFoods(taggedFoods);
        store.setEditedFoods(taggedFoods);
        store.setMealId(data.data.mealId);
        store.setServingRatio(1.0);

        // 개발자 모드: AI 분석 결과 캡처
        if (useDevStore.getState().devMode) {
          useDevStore.getState().setAiDebug({
            time: Date.now(),
            foods: (aiResult.detectedFoods as (DetectedFood & { debug?: Record<string, unknown> })[]).map((f) => ({
              foodName: f.foodName,
              servingSize: f.servingSize,
              calories: f.calories,
              carbs: f.carbs,
              protein: f.protein,
              fat: f.fat,
              kcalPer100: f.servingSize > 0 ? Math.round(f.calories / f.servingSize * 100) : 0,
              sizeRef:      f.debug?.sizeRef      as string | undefined,
              sizeEstimate: f.debug?.sizeEstimate as string | undefined,
              count:        f.debug?.count        as number | undefined,
              gramsPerUnit: f.debug?.gramsPerUnit as string | undefined,
              cookingState: f.debug?.cookingState as string | undefined,
              densityUsed:  f.debug?.densityUsed  as string | undefined,
            })),
          });
        }
      }
      // 개인 하루로그 그룹을 기본 선택
      try {
        const groupRes = await groupApi.getMyGroups();
        const personalGroup = groupRes.data.data.find((g: { isPersonal?: boolean }) => g.isPersonal);
        if (personalGroup) store.setSelectedGroupIds([personalGroup.id]);
      } catch {
        // 그룹 로드 실패해도 계속 진행
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
      // 항상 최신 그룹 목록 직접 조회 (store 상태 의존 제거)
      let groupIds: string[] = store.selectedGroupIds;
      try {
        const res = await groupApi.getMyGroups();
        const allGroups = res.data.data as Array<{ id: string; isPersonal?: boolean; groupCode?: string }>;
        const personal = allGroups.find((g) => g.isPersonal || g.groupCode?.startsWith('PERSONAL-'));
        if (personal) groupIds = [personal.id];
      } catch {
        // 실패 시 store 값 그대로 사용
      }
      alert(`[DEBUG] group_ids: ${JSON.stringify(groupIds)}\nmealId: ${store.mealId}`);
      return mealApi.updateFoods(store.mealId, store.editedFoods, groupIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['group-feed'] });
      store.setStep('done');
    },
    onError: () => {
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    },
  });

  const originalTotalGrams = useMemo(() =>
    store.originalFoods.reduce((sum, f) => sum + f.servingSize, 0),
    [store.originalFoods]
  );

  /** 양 조절 — AI 음식(originalFoods)만 재계산, 수동 추가 음식은 유지 */
  const applyServingRatio = useCallback((ratio: number) => {
    store.setServingRatio(ratio);
    const scaledAi = store.originalFoods.map((f) => scaleFood(f, ratio));
    const manual = store.editedFoods.filter((f) => f.source === 'manual');
    store.setEditedFoods([...scaledAi, ...manual]);
  }, [store]);

  const applyServingGrams = useCallback((grams: number) => {
    if (originalTotalGrams <= 0) return;
    const ratio = grams / originalTotalGrams;
    store.setServingRatio(ratio);
    const scaledAi = store.originalFoods.map((f) => scaleFood(f, ratio));
    const manual = store.editedFoods.filter((f) => f.source === 'manual');
    store.setEditedFoods([...scaledAi, ...manual]);
  }, [store, originalTotalGrams]);

  const updateFood = (index: number, updated: Partial<DetectedFood>) => {
    const foods = [...store.editedFoods];
    const current = foods[index];

    let patch: Partial<DetectedFood> = { ...updated, isEdited: true };

    if (
      updated.servingSize !== undefined &&
      updated.servingSize > 0 &&
      updated.calories === undefined
    ) {
      const g = updated.servingSize;

      if (current.kcalPer100g !== undefined) {
        // 저장된 밀도 기준으로 계산 — 반올림 누적 오차 없음
        patch = {
          ...patch,
          calories: Math.round(current.kcalPer100g * g / 100),
          carbs:    Math.round((current.carbsPer100g    ?? 0) * g / 100 * 10) / 10,
          protein:  Math.round((current.proteinPer100g  ?? 0) * g / 100 * 10) / 10,
          fat:      Math.round((current.fatPer100g      ?? 0) * g / 100 * 10) / 10,
        };
      } else {
        // 밀도 필드 없는 경우(구 데이터 호환) — AI 원본 또는 현재 값 기준
        const original = store.originalFoods[index];
        if (original && original.servingSize > 0) {
          patch = {
            ...patch,
            calories: Math.round(original.calories * g / original.servingSize),
            carbs:    Math.round(original.carbs    * g / original.servingSize * 10) / 10,
            protein:  Math.round(original.protein  * g / original.servingSize * 10) / 10,
            fat:      Math.round(original.fat      * g / original.servingSize * 10) / 10,
          };
        } else if (current.servingSize > 0) {
          const ratio = g / current.servingSize;
          patch = {
            ...patch,
            calories: Math.round(current.calories * ratio),
            carbs:    Math.round(current.carbs    * ratio * 10) / 10,
            protein:  Math.round(current.protein  * ratio * 10) / 10,
            fat:      Math.round(current.fat      * ratio * 10) / 10,
          };
        }
      }
    }

    foods[index] = { ...current, ...patch };
    store.setEditedFoods(foods);
  };

  const removeFood = (index: number) => {
    store.setEditedFoods(store.editedFoods.filter((_, i) => i !== index));
  };

  const addFood = () => {
    store.setEditedFoods([
      ...store.editedFoods,
      { foodName: '', servingSize: 100, calories: 0, carbs: 0, protein: 0, fat: 0, confidence: 0, isEdited: true },
    ]);
  };

  const addFoods = (newFoods: DetectedFood[]) => {
    // 수동 추가 음식은 originalFoods에 넣지 않아 양 조절 슬라이더 스케일 대상에서 제외
    const tagged = newFoods.map((f) => ({ ...f, source: 'manual' as const }));
    store.setEditedFoods([...store.editedFoods, ...tagged]);
  };

  const toggleGroupId = (id: string) => {
    const current = store.selectedGroupIds;
    store.setSelectedGroupIds(
      current.includes(id) ? current.filter((g) => g !== id) : [...current, id]
    );
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
    servingRatio: store.servingRatio,
    applyServingRatio,
    applyServingGrams,
    originalTotalGrams,
    selectedGroupIds: store.selectedGroupIds,
    toggleGroupId,
    groups,
    handleFileSelect,
    startUpload: () => uploadMutation.mutate(),
    saveEdits: () => saveMutation.mutate(),
    updateFood,
    removeFood,
    addFood,
    addFoods,
    reset: () => {
      if (store.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(store.previewUrl);
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
