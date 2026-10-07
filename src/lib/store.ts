import { useEffect, useRef, useState } from 'react';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (isPlainObject(fallback) && isPlainObject(parsed)) return { ...fallback, ...parsed } as T;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the app still works for this visit */
  }
}

/** useState that survives reloads. Everything stays on this device. */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStored(key, initial));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    writeStored(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

export interface Tournament {
  currentBout: number;
  activeMats: number;
  avgBoutTime: number;
  expectedDelay: number;
}

export const TOURNAMENT_KEY = 'btb:tournament';
export const DEFAULT_TOURNAMENT: Tournament = {
  currentBout: 101,
  activeMats: 6,
  avgBoutTime: 6,
  expectedDelay: 0,
};

export interface LastPrediction {
  predictedWait: number;
  likelyLow: number;
  likelyHigh: number;
  baselineWait: number;
  inputs: {
    currentBout: number;
    nextBout: number;
    activeMats: number;
    avgBoutTime: number;
    expectedDelay: number;
    boutsAhead: number | null;
  };
  at: number;
}
export const LAST_KEY = 'btb:last';

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
