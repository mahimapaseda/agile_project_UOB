import { Staff } from '@/types';

/** Principal, vice principal, technical officer, or explicit admin classification. */
export function isSchoolLeadership(staff: Pick<Staff, 'designation' | 'staffClassification' | 'department'>): boolean {
  const d = `${staff.designation} ${staff.staffClassification ?? ''} ${staff.department ?? ''}`.toLowerCase();
  return (
    (d.includes('principal') && !d.includes('vice')) ||
    d.includes('vice principal') ||
    d.includes('vice-principal') ||
    d.includes('technical officer') ||
    d.includes('school administration') ||
    d.includes('administration') && d.includes('principal')
  );
}

export function staffTypeDisplayLabel(staff: Pick<Staff, 'staffType' | 'designation' | 'staffClassification'>): string {
  if (isSchoolLeadership(staff)) return 'Administrative (leadership)';
  return staff.staffType === 'academic' ? 'Academic (teacher)' : 'Non-academic (support)';
}

export function staffTypeBadgeLabel(staff: Pick<Staff, 'staffType' | 'designation' | 'staffClassification'>): string {
  if (isSchoolLeadership(staff)) return 'Administrative';
  return staff.staffType === 'academic' ? 'Academic' : 'Non-academic';
}
