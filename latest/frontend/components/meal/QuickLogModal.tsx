'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Check, Loader2, PenLine } from 'lucide-react';
import { mealApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FoodSearchModal } from './FoodSearchModal';
import type { DetectedFood } from '@/types';

const MEAL_TYPES = [
  { key: 'breakfast', label: '아침', emoji: '🌅', activeBg: 'bg-peach',  activeText: 'text-ink' },
  { key: 'lunch',     label: '점심', emoji: '☀️', activeBg: 'bg-ochre',  activeText: 'text-ink' },
  { key: 'snack',     label: '간식', emoji: '🍪', activeBg: 'bg-sage',   activeText: 'text-ink' },
  { key: 'dinner',    label: '저녁', emoji: '🌙', activeBg: 'bg-cobalt', activeText: 'text-white' },
] as const;

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultDate?: string;
}

export function QuickLogModal({ isOpen, onClose, onSaved, defaultDate }: QuickLogModalProps) {
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [foods, setFoods] = useState<DetectedFood[]>([]);
  const [caption, setCaption] = useState('');
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFoods = useCallback((added: DetectedFood[]) => {
    setFoods((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      return [...prev, ...added.filter((f) => !ids.has(f.id))];
    });
  }, []);

  const removeFood = (id: string | undefined) => setFoods((prev) => prev.filter((f) => f.id !== id));

  const totalCal = foods.reduce((s, f) => s + (f.calories ?? 0), 0);

  const handleSave = async () => {
    if (!foods.length) { setError('음식을 1개 이상 추가해주세요.'); return; }
    setIsSaving(true);
    setError(null);
    try {
      await mealApi.createQuick({
        meal_type: mealType,
        caption: caption.trim() || undefined,
        log_date: defaultDate,
        foods: foods.map((f) => ({
          food_name: f.foodName,
          amount: `${f.servingSize ?? 100}g`,
          calories: f.calories ?? 0,
          carbs: f.carbs ?? 0,
          protein: f.protein ?? 0,
          fat: f.fat ?? 0,
        })),
      });
      setFoods([]);
      setCaption('');
      onSaved?.();
      onClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-white">
        <button onClick={onClose} className="p-1 text-muted">
          <X size={20} />
        </button>
        <span className="font-kedu font-bold text-base text-ink flex items-center gap-1.5">
          <PenLine size={16} className="text-cobalt" />
          텍스트로 식사 기록
        </span>
        <button
          onClick={handleSave}
          disabled={isSaving || !foods.length}
          className="font-kedu font-bold text-sm text-cobalt disabled:text-muted flex items-center gap-1"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          저장
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 식사 타입 선택 */}
        <div>
          <p className="font-kedu text-xs text-muted mb-2">식사 타입</p>
          <div className="flex gap-2">
            {MEAL_TYPES.map(({ key, label, emoji, activeBg, activeText }) => (
              <button
                key={key}
                onClick={() => setMealType(key)}
                className={cn(
                  'flex-1 h-11 rounded-xl font-kedu text-sm font-bold flex items-center justify-center gap-1 transition-all active:scale-95',
                  mealType === key
                    ? `${activeBg} ${activeText}`
                    : 'bg-surface-soft text-muted border border-hairline'
                )}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 음식 목록 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-kedu text-xs text-muted">음식 목록</p>
            {foods.length > 0 && (
              <p className="font-myeong text-xs font-bold text-cobalt">{totalCal}kcal</p>
            )}
          </div>

          {foods.length === 0 ? (
            <div className="bg-surface-soft rounded-xl py-8 flex flex-col items-center gap-2 text-muted">
              <Plus size={24} className="opacity-40" />
              <p className="font-kedu text-sm">아래 버튼으로 음식을 추가하세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {foods.map((food) => (
                <div key={food.id} className="bg-white rounded-xl border border-hairline px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-myeong text-sm font-bold text-ink truncate">{food.foodName}</p>
                    <p className="font-myeong text-xs text-muted">{food.calories}kcal · 탄 {food.carbs}g · 단 {food.protein}g · 지 {food.fat}g</p>
                  </div>
                  <button onClick={() => removeFood(food.id)} className="text-muted hover:text-coral flex-shrink-0 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowFoodSearch(true)}
            className="mt-2 w-full h-10 rounded-xl border border-dashed border-cobalt/40 text-cobalt font-kedu text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            음식 추가하기
          </button>
        </div>

        {/* 메모 */}
        <div>
          <p className="font-kedu text-xs text-muted mb-2">메모 (선택)</p>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="오늘의 식사를 간단히 적어보세요"
            rows={2}
            maxLength={200}
            className="w-full bg-white border border-hairline rounded-xl px-3 py-2.5 font-myeong text-sm text-ink placeholder:text-muted resize-none outline-none focus:border-cobalt/40"
          />
        </div>

        {error && <p className="font-kedu text-xs text-coral text-center">{error}</p>}
      </div>

      <FoodSearchModal
        isOpen={showFoodSearch}
        onClose={() => setShowFoodSearch(false)}
        onAdd={handleAddFoods}
      />
    </div>,
    document.body
  );
}
