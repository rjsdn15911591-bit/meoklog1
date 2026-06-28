import { create } from 'zustand';

const DEV_KEY = 'muklog-dev-mode';
function loadDevMode(): boolean {
  try { return localStorage.getItem(DEV_KEY) === '1'; } catch { return false; }
}
function saveDevMode(v: boolean) {
  try { localStorage.setItem(DEV_KEY, v ? '1' : '0'); } catch {}
}

export interface ApiLog {
  id: string;
  time: number;
  method: string;
  endpoint: string;
  status: number | null;
  durationMs: number | null;
  ok: boolean;
  error?: string;
}

export interface AiFoodDebug {
  foodName: string;
  servingSize: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  kcalPer100: number;
  // GPT 추론 과정
  sizeRef?: string;
  sizeEstimate?: string;
  count?: number;
  gramsPerUnit?: string;
  cookingState?: string;
  densityUsed?: string;
}

export interface AiDebug {
  time: number;
  foods: AiFoodDebug[];
}

export type ErrorType = 'runtime' | 'promise' | 'console';

export interface ErrorLog {
  id: string;
  time: number;
  type: ErrorType;
  message: string;
  source?: string;
  line?: number;
  col?: number;
  stack?: string;
}

interface DevState {
  devMode: boolean;
  setDevMode: (v: boolean) => void;
  logs: ApiLog[];
  pushLog: (log: Omit<ApiLog, 'id' | 'time'>) => void;
  clearLogs: () => void;
  aiDebug: AiDebug | null;
  setAiDebug: (d: AiDebug | null) => void;
  errors: ErrorLog[];
  pushError: (err: Omit<ErrorLog, 'id' | 'time'>) => void;
  clearErrors: () => void;
}

let _logId = 0;
let _errId = 0;

export const useDevStore = create<DevState>((set) => ({
  devMode: loadDevMode(),
  setDevMode: (devMode) => { saveDevMode(devMode); set({ devMode }); },
  logs: [],
  pushLog: (log) =>
    set((s) => ({
      logs: [{ id: String(++_logId), time: Date.now(), ...log }, ...s.logs].slice(0, 100),
    })),
  clearLogs: () => set({ logs: [] }),
  aiDebug: null,
  setAiDebug: (aiDebug) => set({ aiDebug }),
  errors: [],
  pushError: (err) =>
    set((s) => ({
      errors: [{ id: String(++_errId), time: Date.now(), ...err }, ...s.errors].slice(0, 50),
    })),
  clearErrors: () => set({ errors: [] }),
}));
