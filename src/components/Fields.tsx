import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { clamp } from '@/lib/store';

const roundTo = (n: number, step: number) => Number((Math.round(n / step) * step).toFixed(2));

interface StepperProps {
  id: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function Stepper({ id, label, hint, value, onChange, min = 0, max = 9999, step = 1, suffix }: StepperProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (Number(draft) !== value) setDraft(String(value));
    // only resync when the outside value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const bump = (d: number) => onChange(clamp(roundTo(value + d, step), min, max));
  const typed = (raw: string) => {
    setDraft(raw);
    const n = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
  };
  const settle = () => {
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n)) setDraft(String(value));
    else {
      const v = clamp(roundTo(n, step), min, max);
      onChange(v);
      setDraft(String(v));
    }
  };

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <div className="stepper-row">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => bump(-step)} disabled={value <= min}>
          <Minus size={20} strokeWidth={2.2} />
        </button>
        <input
          id={id}
          className="num"
          inputMode={step % 1 ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={draft}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => typed(e.target.value)}
          onBlur={settle}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') settle();
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              bump(step);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              bump(-step);
            }
          }}
        />
        {suffix && <span className="stepper-suffix">{suffix}</span>}
        <button type="button" aria-label={`Increase ${label}`} onClick={() => bump(step)} disabled={value >= max}>
          <Plus size={20} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

interface SegProps<T extends string | number> {
  name: string;
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hideLegend?: boolean;
}

export function Segmented<T extends string | number>({ name, legend, value, options, onChange, hideLegend }: SegProps<T>) {
  return (
    <fieldset className="seg-wrap">
      <legend className={hideLegend ? 'sr-only' : 'field-label'}>{legend}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={String(o.value)}>
            <input
              type="radio"
              name={name}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div className={`toast ${message ? 'is-on' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 2400);
    return () => clearTimeout(id);
  }, [msg]);
  return [msg, setMsg] as const;
}
