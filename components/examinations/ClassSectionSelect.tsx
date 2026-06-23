'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getClassFieldLabel,
  getClassOptionsForGrade,
  isAdvancedLevelGrade,
} from '@/lib/grade-class-options';

interface ClassSectionSelectProps {
  grade: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  id?: string;
}

export function ClassSectionSelect({
  grade,
  value,
  onValueChange,
  error,
  id = 'class-section',
}: ClassSectionSelectProps) {
  const options = grade ? getClassOptionsForGrade(grade) : [];
  const label = grade ? getClassFieldLabel(grade) : 'Class';

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label} *</Label>
      <Select value={value} onValueChange={onValueChange} disabled={!grade}>
        <SelectTrigger id={id}>
          <SelectValue
            placeholder={
              grade
                ? isAdvancedLevelGrade(grade)
                  ? 'Select stream'
                  : 'Select class'
                : 'Select grade first'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} textValue={opt.label}>
              <div className="flex flex-col py-0.5">
                <span>{opt.label}</span>
                {opt.hint ? (
                  <span className="text-[10px] font-normal leading-tight text-slate-500">{opt.hint}</span>
                ) : null}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
