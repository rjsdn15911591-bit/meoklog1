'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { foodApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DetectedFood } from '@/types';

interface AddCustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (food: DetectedFood) => void;
}

type ServingUnit = 'g' | 'ml';

export function AddCustomFoodModal({ isOpen, onClose, onComplete }: AddCustomFoodModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [brandName, setBrandName] = useState('');
  const [foodName, setFoodName] = useState('');

  // Step 2
  const [servingUnit, setServingUnit] = useState<ServingUnit>('g');
  const [servingSize, setServingSize] = useState('100');

  // Step 3
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 열릴 때 상태 초기화 및 body scroll lock
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setBrandName('');
      setFoodName('');
      setServingUnit('g');
      setServingSize('100');
      setCalories('');
      setCarbs('');
      setProtein('');
      setFat('');
      setIsPublic(false);
      setIsSubmitting(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else onClose();
  };

  const handleComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await foodApi.create({
        food_name: foodName.trim(),
        brand_name: brandName.trim() || undefined,
        serving_size: Number(servingSize) || 100,
        serving_unit: servingUnit,
        calories: Number(calories) || 0,
        carbs: Number(carbs) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        is_public: isPublic,
      });

      const newFood: DetectedFood = {
        foodName: foodName.trim(),
        servingSize: Number(servingSize) || 100,
        calories: Number(calories) || 0,
        carbs: Number(carbs) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        confidence: 1.0,
        isEdited: true,
      };
      onComplete(newFood);
    } catch {
      // API 실패 시에도 로컬에서 음식 추가
      const newFood: DetectedFood = {
        foodName: foodName.trim(),
        servingSize: Number(servingSize) || 100,
        calories: Number(calories) || 0,
        carbs: Number(carbs) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        confidence: 1.0,
        isEdited: true,
      };
      onComplete(newFood);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 스텝 인디케이터
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 py-2">
      {([1, 2, 3] as const).map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center font-kedu font-bold text-sm transition-colors',
              step === s
                ? 'bg-ink text-white'
                : step > s
                ? 'bg-cobalt text-white'
                : 'bg-surface-soft text-muted'
            )}
          >
            {s}
          </div>
          {s < 3 && (
            <div
              className={cn(
                'w-8 h-0.5 mx-1 transition-colors',
                step > s ? 'bg-cobalt' : 'bg-hairline'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[70] bg-canvas flex flex-col">
      {/* 헤더 */}
      <div className="bg-surface-card border-b border-hairline px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center text-ink"
          aria-label="뒤로"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="flex-1 font-kedu font-bold text-base text-ink text-center">
          음식 직접 추가
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-muted"
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="bg-surface-card border-b border-hairline px-4 pb-3">
        <StepIndicator />
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* ── Step 1: 음식 이름 ── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-slide-up">
            <div>
              <h2 className="font-kedu font-bold text-xl text-ink">음식의 이름을 알려주세요</h2>
              <p className="font-myeong text-sm text-muted mt-1">브랜드 이름은 선택 사항이에요</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-kedu text-xs text-muted block mb-1.5">브랜드 이름 (선택)</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="예: 맥도날드, 스타벅스"
                  className="bg-surface-soft rounded-lg px-4 py-3 font-myeong text-sm text-ink outline-none w-full focus:ring-2 focus:ring-cobalt/30 transition-all"
                />
              </div>
              <div>
                <label className="font-kedu text-xs text-muted block mb-1.5">
                  음식 이름 <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="예: 빅맥, 아이스 아메리카노"
                  className="bg-surface-soft rounded-lg px-4 py-3 font-myeong text-sm text-ink outline-none w-full focus:ring-2 focus:ring-cobalt/30 transition-all"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: 기본 단위 ── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-slide-up">
            <div>
              <h2 className="font-kedu font-bold text-xl text-ink">기본 단위를 입력해 주세요</h2>
              <p className="font-myeong text-sm text-muted mt-1">
                <span className="text-ink font-bold">{foodName}</span>의 기준 중량을 설정해요
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-kedu text-xs text-muted block mb-1.5">단위</label>
                <div className="flex gap-3">
                  {(['g', 'ml'] as ServingUnit[]).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setServingUnit(unit)}
                      className={cn(
                        'flex-1 py-3 rounded-xl font-kedu font-bold text-sm transition-colors',
                        servingUnit === unit
                          ? 'bg-ink text-white'
                          : 'bg-surface-soft text-muted'
                      )}
                    >
                      {unit === 'g' ? '그램 (g)' : '밀리리터 (ml)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-kedu text-xs text-muted block mb-1.5">
                  내용량 <span className="text-coral">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={servingSize}
                    onChange={(e) => setServingSize(e.target.value)}
                    min={1}
                    className="bg-surface-soft rounded-lg px-4 py-3 font-myeong text-sm text-ink outline-none flex-1 focus:ring-2 focus:ring-cobalt/30 transition-all text-center text-lg font-bold"
                  />
                  <span className="font-kedu font-bold text-base text-muted w-8">{servingUnit}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: 영양 정보 ── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-slide-up">
            <div>
              <h2 className="font-kedu font-bold text-xl text-ink">영양 정보를 입력해 주세요</h2>
              <p className="font-myeong text-sm text-muted mt-1">
                {servingSize}{servingUnit} 기준 영양 정보예요
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'calories', label: '칼로리', unit: 'kcal', value: calories, setter: setCalories, color: 'text-coral' },
                { key: 'carbs', label: '탄수화물', unit: 'g', value: carbs, setter: setCarbs, color: 'text-ochre' },
                { key: 'protein', label: '단백질', unit: 'g', value: protein, setter: setProtein, color: 'text-sage' },
                { key: 'fat', label: '지방', unit: 'g', value: fat, setter: setFat, color: 'text-cobalt' },
              ].map(({ key, label, unit, value, setter, color }) => (
                <div key={key}>
                  <label className="font-kedu text-xs text-muted block mb-1.5">
                    {label} <span className="text-coral">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      min={0}
                      step={0.1}
                      placeholder="0"
                      className="bg-surface-soft rounded-lg px-4 py-3 font-myeong text-sm text-ink outline-none flex-1 focus:ring-2 focus:ring-cobalt/30 transition-all"
                    />
                    <span className={cn('font-kedu font-bold text-sm w-10', color)}>{unit}</span>
                  </div>
                </div>
              ))}

              {/* 공유 토글 */}
              <div className="bg-surface-card rounded-xl border border-hairline p-4 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-kedu font-bold text-sm text-ink">모든 사용자와 공유하기</p>
                    <p className="font-myeong text-xs text-muted mt-0.5">
                      {isPublic ? '모든 사용자가 검색 가능해요' : '개인 보관함에만 저장돼요'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPublic((v) => !v)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
                      isPublic ? 'bg-cobalt' : 'bg-surface-soft border border-hairline'
                    )}
                    aria-label="공유 토글"
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                        isPublic ? 'translate-x-6' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="bg-surface-card border-t border-hairline px-4 py-4">
        {step < 3 ? (
          <button
            onClick={() => setStep((s) => (s + 1) as 2 | 3)}
            disabled={step === 1 && !foodName.trim()}
            className="w-full py-4 bg-ink text-white rounded-xl font-kedu font-bold text-base disabled:bg-hairline disabled:text-muted transition-colors"
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={isSubmitting || !calories || !carbs || !protein || !fat}
            className="w-full py-4 bg-ink text-white rounded-xl font-kedu font-bold text-base disabled:bg-hairline disabled:text-muted transition-colors"
          >
            {isSubmitting ? '등록 중...' : '등록 완료'}
          </button>
        )}
      </div>
    </div>
  );
}
