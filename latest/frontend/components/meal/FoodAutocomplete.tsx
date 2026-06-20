'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { foodApi } from '@/lib/api';

interface FoodSuggestion {
  id: string;
  foodName: string;
  brandName?: string;
  servingSize: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

interface FoodAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  onSelect: (food: FoodSuggestion) => void;
  className?: string;
  placeholder?: string;
}

export function FoodAutocomplete({
  value,
  onChange,
  onSelect,
  className,
  placeholder = '음식명',
}: FoodAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const ignoreNextSearch = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // 유저가 포커스한 후 타이핑할 때만 디바운스 검색
  useEffect(() => {
    if (!focused) return;
    const t = setTimeout(() => setDebouncedValue(value), 300);
    return () => clearTimeout(t);
  }, [value, focused]);

  const updatePos = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (ignoreNextSearch.current) { ignoreNextSearch.current = false; return; }
    if (!q.trim()) { setSuggestions([]); setOpen(false); return; }
    try {
      const res = await foodApi.search(q.trim());
      const raw: FoodSuggestion[] = (res.data?.data ?? res.data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .slice(0, 5).map((d: any) => ({
          id: d.id,
          foodName: d.foodName ?? d.food_name ?? '',
          brandName: d.brandName ?? d.brand_name,
          servingSize: d.servingSize ?? d.serving_size ?? 100,
          calories: d.calories ?? 0,
          carbs: d.carbs ?? 0,
          protein: d.protein ?? 0,
          fat: d.fat ?? 0,
        }));
      setSuggestions(raw);
      if (raw.length > 0) { updatePos(); setOpen(true); }
      else setOpen(false);
    } catch {
      setSuggestions([]); setOpen(false);
    }
  }, [updatePos]);

  useEffect(() => { fetchSuggestions(debouncedValue); }, [debouncedValue, fetchSuggestions]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: FoodSuggestion) => {
    ignoreNextSearch.current = true;
    setSuggestions([]);
    setOpen(false);
    onSelect(item);
  };

  const dropdown = open && suggestions.length > 0 && mounted ? createPortal(
    <div
      style={{
        position: 'absolute',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
      }}
      className="bg-surface-card rounded-xl border border-hairline shadow-lg overflow-hidden"
    >
      {suggestions.map((item) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect(item)}
          className="w-full flex items-baseline justify-between gap-2 px-3 py-2 hover:bg-surface-soft transition-colors text-left border-b border-hairline last:border-b-0"
        >
          <span className="font-myeong text-sm text-ink leading-snug truncate flex-1">
            {item.brandName ? <span className="text-muted">{item.brandName} </span> : null}
            {item.foodName}
          </span>
          <span className="font-myeong text-xs text-cobalt flex-shrink-0">{item.calories}kcal</span>
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        className={className ?? 'font-myeong text-[15px] text-ink bg-transparent w-full outline-none'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
        setFocused(true);
        if (suggestions.length > 0) { updatePos(); setOpen(true); }
      }}
      onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
}
