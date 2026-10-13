"use client";

import { Minus, Plus } from "lucide-react";

type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  id: string;
};

/** Stepper +/− animé pour les quantités du formulaire de ramassage. */
export function Stepper({ label, value, onChange, decreaseLabel, increaseLabel, id }: StepperProps) {
  const clamp = (v: number) => Math.max(0, Math.min(9999, v));

  return (
    <div className="glass-light flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <label htmlFor={id} className="text-sm font-medium text-mist/90">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`${decreaseLabel} — ${label}`}
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= 0}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-mist transition-all duration-200 hover:border-emerald/50 hover:bg-emerald-soft active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={9999}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          className="w-12 [appearance:textfield] rounded-lg bg-transparent text-center font-display text-base font-bold text-mist focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={`${increaseLabel} — ${label}`}
          onClick={() => onChange(clamp(value + 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-accent text-ink transition-all duration-200 hover:brightness-110 active:scale-90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
