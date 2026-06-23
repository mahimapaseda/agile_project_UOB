import { getStaffList, searchStaff } from './firestore';
import { canViewStaffDirectory } from './access-control';
import type { Staff, UserProfile } from '@/types';

/** Loads staff list when the signed-in user may view the directory. */
export async function getStaffForProfile(
  profile: UserProfile | null | undefined,
  typeFilter?: string,
  statusFilter?: string,
): Promise<Staff[]> {
  if (!profile || !canViewStaffDirectory(profile)) return [];
  return getStaffList(typeFilter, statusFilter);
}

export async function searchStaffForProfile(
  profile: UserProfile | null | undefined,
  term: string,
): Promise<Staff[]> {
  if (!profile || !canViewStaffDirectory(profile)) return [];
  return searchStaff(term);
}
