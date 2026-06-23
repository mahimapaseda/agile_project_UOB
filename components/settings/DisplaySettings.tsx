'use client';

import { useEffect, useState } from 'react';
import { Check, LayoutGrid, Type } from 'lucide-react';
import {
  FONT_SCALE_OPTIONS,
  readCompactDensity,
  readFontScale,
  setCompactDensity,
  setFontScale,
  type FontScale,
} from '@/lib/display-preferences';
import { cn } from '@/lib/utils';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-xl px-4 py-3.5 transition-colors hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          checked ? 'border-blue-700 bg-blue-700' : 'border-slate-200 bg-slate-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        >
          {checked && <Check className="absolute inset-0 m-auto h-2.5 w-2.5 text-blue-700" />}
        </span>
      </button>
    </label>
  );
}

export function DisplaySettings() {
  const [fontScale, setFontScaleState] = useState<FontScale>('device');
  const [compactUI, setCompactUI] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFontScaleState(readFontScale());
    setCompactUI(readCompactDensity());
    setMounted(true);
  }, []);

  const handleFontScale = (scale: FontScale) => {
    setFontScaleState(scale);
    setFontScale(scale);
  };

  const toggleCompact = () => {
    const next = !compactUI;
    setCompactUI(next);
    setCompactDensity(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <Type className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Text size</h3>
          <span className="ml-1 text-[11px] text-slate-400">· saved on this device</span>
        </div>

        <p className="border-b border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
          Choose how large text appears in Delta DBMS. &ldquo;Follow device&rdquo; respects your system
          setting (Settings → Display → Font size on iPhone or Android).
        </p>

        <div
          className="divide-y divide-slate-100"
          role="radiogroup"
          aria-label="Text size"
        >
          {FONT_SCALE_OPTIONS.map((option) => {
            const selected = fontScale === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleFontScale(option.value)}
                className={cn(
                  'flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors',
                  selected ? 'bg-blue-50/80' : 'hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    selected ? 'border-blue-700 bg-blue-700' : 'border-slate-300 bg-white',
                  )}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800">{option.label}</span>
                  <span className="mt-0.5 block text-[12px] text-slate-500">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {mounted && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
              Preview
            </p>
            <p className="text-base font-semibold text-slate-900">Delta Gemunupura College DBMS</p>
            <p className="mt-1 text-sm text-slate-600">
              Student records, examinations, and school information at a glance.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <LayoutGrid className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Layout</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            label="Compact lists"
            description="Tighter row spacing on tables and cards. Does not change text size."
            checked={compactUI}
            onChange={toggleCompact}
          />
        </div>
      </div>
    </div>
  );
}
