'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Plus, Check, Star } from 'lucide-react';
import { foodApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DetectedFood } from '@/types';
import { AddCustomFoodModal } from './AddCustomFoodModal';

interface FoodSearchItem {
  id: string;
  food_name: string;
  brand_name?: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  source: string;
  is_public: boolean;
  use_count: number;
}

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (foods: DetectedFood[]) => void;
}

type FilterTab = 'all' | 'exclude_user' | 'favorites';
type UnitMode = 'serving' | 'gram';

interface Quantity {
  mode: UnitMode;
  ratio: number;
}

function GramInput({
  adjustedGrams,
  servingUnit,
  servingSize,
  onUpdate,
}: {
  adjustedGrams: number;
  servingUnit: string;
  servingSize: number;
  onUpdate: (ratio: number) => void;
}) {
  const [text, setText] = useState(String(adjustedGrams));

  useEffect(() => {
    setText(String(adjustedGrams));
  }, [adjustedGrams]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          const val = e.target.value.replace(/[^0-9]/g, '');
          setText(val);
          const g = Number(val);
          if (g > 0 && servingSize > 0) onUpdate(g / servingSize);
        }}
        onBlur={() => {
          const g = Number(text);
          if (!g || g <= 0) setText(String(adjustedGrams));
        }}
        className="flex-1 h-10 rounded-lg border border-hairline font-myeong text-lg text-ink text-center bg-surface-soft outline-none focus:border-cobalt transition-colors"
      />
      <span className="font-kedu font-bold text-sm text-muted w-6">{servingUnit}</span>
    </div>
  );
}

function getBadge(item: FoodSearchItem): { label: string; bgClass: string; textClass: string } | null {
  if (item.source === 'user') {
    return { label: '유저등록', bgClass: 'bg-cobalt/10', textClass: 'text-cobalt' };
  }
  if (item.source === 'system' && item.use_count >= 100000) {
    return { label: '인기', bgClass: 'bg-coral/10', textClass: 'text-coral' };
  }
  if (item.source === 'system' && item.use_count >= 10000) {
    return { label: '많이 기록됨', bgClass: 'bg-ochre/10', textClass: 'text-ochre' };
  }
  return null;
}

function toDetectedFood(item: FoodSearchItem, ratio: number = 1.0): DetectedFood {
  const base = item.serving_size > 0 ? item.serving_size / 100 : 1;
  return {
    foodName: item.food_name,
    servingSize: Math.round(item.serving_size * ratio),
    calories: Math.round(item.calories * ratio),
    carbs: Math.round(item.carbs * ratio * 10) / 10,
    protein: Math.round(item.protein * ratio * 10) / 10,
    fat: Math.round(item.fat * ratio * 10) / 10,
    confidence: 1.0,
    isEdited: true,
    kcalPer100g: item.calories / base,
    carbsPer100g: item.carbs / base,
    proteinPer100g: item.protein / base,
    fatPer100g: item.fat / base,
  };
}

function formatServing(ratio: number) {
  if (ratio === Math.round(ratio)) return `${ratio}인분`;
  return `${ratio}인분`;
}

export function FoodSearchModal({ isOpen, onClose, onAdd }: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [results, setResults] = useState<FoodSearchItem[]>([]);
  const [myFoods, setMyFoods] = useState<FoodSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFoods, setSelectedFoods] = useState<FoodSearchItem[]>([]);
  const [quantities, setQuantities] = useState<Map<string, Quantity>>(new Map());
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Map<string, FoodSearchItem>>(() => {
    try {
      const raw = localStorage.getItem('food-favorites');
      if (!raw) return new Map();
      const arr: FoodSearchItem[] = JSON.parse(raw);
      return new Map(arr.map((f) => [f.id, f]));
    } catch { return new Map(); }
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setQuery('');
      setDebouncedQuery('');
      setFilterTab('all');
      setResults([]);
      setSelectedIds(new Set());
      setSelectedFoods([]);
      setQuantities(new Map());
      setShowAddCustom(false);
      setSearchError(null);
      // 내가 등록한 음식 초기 로드
      foodApi.getMyFoods().then((res) => {
        const raw = res.data?.data ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMyFoods(raw.map((d: any) => ({
          id: d.id,
          food_name: d.foodName ?? d.food_name ?? '',
          brand_name: d.brandName ?? d.brand_name,
          serving_size: d.servingSize ?? d.serving_size ?? 100,
          serving_unit: d.servingUnit ?? d.serving_unit ?? 'g',
          calories: d.calories ?? 0,
          carbs: d.carbs ?? 0,
          protein: d.protein ?? 0,
          fat: d.fat ?? 0,
          source: d.source ?? 'user',
          is_public: d.isPublic ?? d.is_public ?? false,
          use_count: d.useCount ?? d.use_count ?? 0,
        })));
      }).catch(() => {});
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchResults = useCallback(async (q: string, excludeUser: boolean) => {
    if (!q.trim()) { setResults([]); return; }
    setIsLoading(true);
    setSearchError(null);
    try {
      const res = await foodApi.search(q.trim(), excludeUser);
      const raw = res.data?.data ?? res.data ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: FoodSearchItem[] = raw.map((d: any) => ({
        id: d.id,
        food_name: d.foodName ?? d.food_name ?? '',
        brand_name: d.brandName ?? d.brand_name,
        serving_size: d.servingSize ?? d.serving_size ?? 100,
        serving_unit: d.servingUnit ?? d.serving_unit ?? 'g',
        calories: d.calories ?? 0,
        carbs: d.carbs ?? 0,
        protein: d.protein ?? 0,
        fat: d.fat ?? 0,
        source: d.source ?? 'system',
        is_public: d.isPublic ?? d.is_public ?? false,
        use_count: d.useCount ?? d.use_count ?? 0,
      }));
      setResults(mapped);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setResults([]);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setSearchError('로그인이 필요합니다. 다시 로그인해주세요.');
      } else if (status >= 500) {
        setSearchError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setSearchError('검색에 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (filterTab === 'favorites') return;
    fetchResults(debouncedQuery, filterTab === 'exclude_user');
  }, [debouncedQuery, filterTab, fetchResults]);

  const toggleFavorite = (item: FoodSearchItem) => {
    setFavorites((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      try {
        localStorage.setItem('food-favorites', JSON.stringify(Array.from(next.values())));
      } catch {}
      return next;
    });
  };

  if (!isOpen) return null;

  const toggleSelect = (item: FoodSearchItem) => {
    const newIds = new Set(selectedIds);
    const newQty = new Map(quantities);
    if (newIds.has(item.id)) {
      newIds.delete(item.id);
      setSelectedFoods((prev) => prev.filter((f) => f.id !== item.id));
      newQty.delete(item.id);
    } else {
      newIds.add(item.id);
      setSelectedFoods((prev) => [...prev, item]);
      newQty.set(item.id, { mode: 'serving', ratio: 1.0 });
    }
    setSelectedIds(newIds);
    setQuantities(newQty);
  };

  const updateQuantity = (id: string, patch: Partial<Quantity>) => {
    setQuantities((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? { mode: 'serving' as UnitMode, ratio: 1.0 };
      next.set(id, { ...cur, ...patch });
      return next;
    });
  };

  const handleComplete = async () => {
    selectedFoods.forEach((item) => {
      foodApi.incrementUse(item.id).catch(() => {});
    });
    onAdd(selectedFoods.map((item) => {
      const qty = quantities.get(item.id) ?? { ratio: 1.0, mode: 'serving' as UnitMode };
      return toDetectedFood(item, qty.ratio);
    }));
  };

  const handleCustomFoodComplete = (food: DetectedFood) => {
    setShowAddCustom(false);
    // 내가 등록한 음식 목록 새로고침
    foodApi.getMyFoods().then((res) => {
      const raw = res.data?.data ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMyFoods(raw.map((d: any) => ({
        id: d.id,
        food_name: d.foodName ?? d.food_name ?? '',
        brand_name: d.brandName ?? d.brand_name,
        serving_size: d.servingSize ?? d.serving_size ?? 100,
        serving_unit: d.servingUnit ?? d.serving_unit ?? 'g',
        calories: d.calories ?? 0,
        carbs: d.carbs ?? 0,
        protein: d.protein ?? 0,
        fat: d.fat ?? 0,
        source: d.source ?? 'user',
        is_public: d.isPublic ?? d.is_public ?? false,
        use_count: d.useCount ?? d.use_count ?? 0,
      })));
    }).catch(() => {});
    onAdd([food]);
  };

  const renderFoodCard = (item: FoodSearchItem) => {
    const badge = getBadge(item);
    const isSelected = selectedIds.has(item.id);
    const isFavorite = favorites.has(item.id);
    const qty = quantities.get(item.id) ?? { mode: 'serving' as UnitMode, ratio: 1.0 };
    const adjustedGrams = Math.round(item.serving_size * qty.ratio);
    const adjustedCal = Math.round(item.calories * qty.ratio);
    return (
      <div
        key={item.id}
        className={cn(
          'bg-surface-card rounded-xl border p-3 transition-colors',
          isSelected ? 'border-cobalt' : 'border-hairline'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              {badge && (
                <span className={cn('px-2 py-0.5 rounded-pill font-kedu text-[11px] font-bold', badge.bgClass, badge.textClass)}>
                  {badge.label}
                </span>
              )}
              <span className="font-myeong text-[15px] text-ink font-bold truncate">
                {item.brand_name ? `${item.brand_name} ` : ''}{item.food_name}
              </span>
            </div>
            <p className="font-myeong text-xs text-muted">
              1인분({item.serving_size}{item.serving_unit}) · {item.calories}kcal
            </p>
          </div>
          <button
            onClick={() => toggleFavorite(item)}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-colors"
            aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Star
              size={18}
              className={cn('transition-colors', isFavorite ? 'text-ochre fill-ochre' : 'text-muted')}
            />
          </button>
          <button
            onClick={() => toggleSelect(item)}
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
              isSelected ? 'bg-cobalt border-cobalt text-white' : 'border-cobalt text-cobalt bg-transparent'
            )}
            aria-label={isSelected ? '선택 취소' : '추가'}
          >
            {isSelected ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {isSelected && (
          <div className="mt-3 pt-3 border-t border-hairline/60">
            <div className="flex items-center justify-between mb-2">
              <span className="font-kedu text-xs font-bold text-ink">양 조절</span>
              <div className="flex rounded-lg border border-hairline overflow-hidden">
                {(['serving', 'gram'] as UnitMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateQuantity(item.id, { mode })}
                    className={cn(
                      'px-3 py-[4px] font-kedu text-xs transition-colors',
                      qty.mode === mode ? 'bg-cobalt text-white font-bold' : 'bg-surface-card text-muted'
                    )}
                  >
                    {mode === 'serving' ? '인분' : item.serving_unit}
                  </button>
                ))}
              </div>
            </div>
            {qty.mode === 'serving' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-kedu text-[10px] text-muted">0.5인분</span>
                  <span className="font-kedu font-bold text-sm text-cobalt">{formatServing(qty.ratio)}</span>
                  <span className="font-kedu text-[10px] text-muted">4인분</span>
                </div>
                <input
                  type="range" min={0.5} max={4} step={0.5}
                  value={Math.min(4, Math.max(0.5, qty.ratio))}
                  onChange={(e) => updateQuantity(item.id, { ratio: Number(e.target.value) })}
                  className="w-full cursor-pointer" style={{ accentColor: '#5058f0' }}
                />
                <div className="flex justify-between mt-1 px-[2px]">
                  {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((v) => (
                    <span key={v} className={cn('font-myeong text-[9px] w-4 text-center',
                      Math.abs(qty.ratio - v) < 0.01 ? 'text-cobalt font-bold' : 'text-muted-soft')}>
                      {v % 1 === 0 ? `${v}` : '·'}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <GramInput
                adjustedGrams={adjustedGrams}
                servingUnit={item.serving_unit}
                servingSize={item.serving_size}
                onUpdate={(ratio) => updateQuantity(item.id, { ratio })}
              />
            )}
            <p className="font-myeong text-xs text-cobalt text-right mt-2 font-bold">
              {adjustedGrams}{item.serving_unit} · {adjustedCal}kcal
            </p>
          </div>
        )}
      </div>
    );
  };

  const modalContent = (
    <>
      <div className="fixed inset-0 z-[70] flex justify-center">
      <div className="relative w-full max-w-[480px] h-full bg-canvas flex flex-col">
        {/* 헤더 */}
        <div className="bg-surface-card border-b border-hairline px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-ink" aria-label="닫기">
            <ArrowLeft size={22} />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="음식 이름을 검색해보세요"
            className="flex-1 bg-surface-soft rounded-lg px-3 py-2 font-myeong text-sm text-ink outline-none focus:ring-2 focus:ring-cobalt/30 transition-all"
            autoFocus
          />
          {query.length > 0 && (
            <button onClick={() => setQuery('')} className="w-8 h-8 flex items-center justify-center text-muted" aria-label="검색어 지우기">
              <X size={18} />
            </button>
          )}
        </div>

        {/* 필터 탭 */}
        <div className="bg-surface-card border-b border-hairline px-4 py-2 flex gap-2">
          {[
            { key: 'all' as FilterTab, label: '전체' },
            { key: 'exclude_user' as FilterTab, label: '유저 등록 제외' },
            { key: 'favorites' as FilterTab, label: `⭐ 즐겨찾기${favorites.size > 0 ? ` ${favorites.size}` : ''}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterTab(key)}
              className={cn(
                'px-4 py-1.5 rounded-pill font-kedu text-xs font-bold transition-colors',
                filterTab === key ? 'bg-ink text-white' : 'bg-surface-soft text-muted'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 검색 결과 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-4">
          {filterTab !== 'favorites' && isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {filterTab !== 'favorites' && !isLoading && searchError && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <p className="font-kedu font-bold text-base text-coral">{searchError}</p>
            </div>
          )}

          {filterTab !== 'favorites' && !isLoading && !searchError && debouncedQuery.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <p className="font-kedu font-bold text-base text-ink">검색 결과가 없어요.</p>
              <p className="font-myeong text-sm text-muted">직접 추가해보세요.</p>
            </div>
          )}

          {/* 즐겨찾기 탭 */}
          {filterTab === 'favorites' && (() => {
            const favList = Array.from(favorites.values()).filter((f) =>
              !debouncedQuery.trim() || f.food_name.includes(debouncedQuery.trim())
            );
            return favList.length > 0 ? (
              <div className="space-y-2">
                {favList.map((item) => renderFoodCard(item))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="text-2xl">⭐</p>
                <p className="font-kedu font-bold text-base text-ink">즐겨찾기가 없어요</p>
                <p className="font-myeong text-sm text-muted">음식 카드의 별표를 눌러 추가해보세요</p>
              </div>
            );
          })()}

          {/* 초기 화면 — 내가 등록한 음식 */}
          {filterTab !== 'favorites' && !isLoading && !debouncedQuery.trim() && (
            myFoods.length > 0 ? (
              <div>
                <p className="font-kedu text-xs text-muted mb-2 px-1">내가 등록한 음식</p>
                <div className="space-y-2">
                  {myFoods.map((item) => renderFoodCard(item))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="font-kedu text-sm text-muted">검색어를 입력해 음식을 찾아보세요</p>
              </div>
            )
          )}

          {filterTab !== 'favorites' && !isLoading && debouncedQuery.trim() && results.map((item) => renderFoodCard(item))}

          {/* 직접 추가하기 버튼 */}
          <div className="pt-2">
            <button
              onClick={() => setShowAddCustom(true)}
              className="w-full py-3 border border-dashed border-hairline rounded-xl font-kedu text-sm text-cobalt flex items-center justify-center gap-1.5 hover:bg-surface-soft transition-colors"
            >
              <Plus size={15} />
              직접 추가하기
            </button>
          </div>
        </div>

        {/* 하단 버튼 바 */}
        <div className="bg-surface-card border-t border-hairline px-4 py-3">
          <button
            onClick={handleComplete}
            disabled={selectedFoods.length === 0}
            className={cn(
              'w-full py-4 rounded-xl font-kedu font-bold text-base transition-colors',
              selectedFoods.length > 0 ? 'bg-ink text-white' : 'bg-hairline text-muted'
            )}
          >
            {selectedFoods.length > 0
              ? `${selectedFoods.length}개 담겼어요 → 완료`
              : '음식을 선택해주세요'}
          </button>
        </div>
      </div>
      </div>

      <AddCustomFoodModal
        isOpen={showAddCustom}
        onClose={() => setShowAddCustom(false)}
        onComplete={handleCustomFoodComplete}
      />
    </>
  );

  return createPortal(modalContent, document.body);
}
