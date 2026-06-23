import { getInventoryList, searchInventory } from './firestore';
import { canViewInventory } from './access-control';
import type { InventoryItem, UserProfile } from '@/types';

/** Loads inventory when the signed-in user may view the module. */
export async function getInventoryForProfile(
  profile: UserProfile | null | undefined,
  typeFilter?: string,
  statusFilter?: string,
): Promise<InventoryItem[]> {
  if (!profile || !canViewInventory(profile)) return [];
  return getInventoryList(typeFilter, statusFilter);
}

export async function searchInventoryForProfile(
  profile: UserProfile | null | undefined,
  term: string,
): Promise<InventoryItem[]> {
  if (!profile || !canViewInventory(profile)) return [];
  return searchInventory(term);
}
