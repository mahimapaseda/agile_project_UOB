import { InventoryItem } from '@/types';
import {
  isRowEmpty,
  parseCsv,
  parseDateToIso,
} from './student-csv-import';

/** Normalized keys from Data Base-Inventry.csv */
export type InventoryCsvFieldKey =
  | 'assetName'
  | 'assetType'
  | 'assetStatus'
  | 'location'
  | 'serialNo'
  | 'model'
  | 'bookName'
  | 'pageNumber'
  | 'quantity'
  | 'dateEntered'
  | 'receivedFrom'
  | 'other';

const INVENTORY_HEADER_ALIASES: { key: InventoryCsvFieldKey; patterns: string[] }[] = [
  { key: 'assetName', patterns: ['assest name', 'asset name'] },
  { key: 'assetType', patterns: ['assest type', 'asset type'] },
  { key: 'assetStatus', patterns: ['assest status', 'asset status'] },
  { key: 'location', patterns: ['location'] },
  { key: 'serialNo', patterns: ['serial no', 'serial number'] },
  { key: 'model', patterns: ['model'] },
  { key: 'bookName', patterns: ['name of the book', 'book name'] },
  { key: 'pageNumber', patterns: ['page number'] },
  { key: 'quantity', patterns: ['number of item', 'quantity', 'qty'] },
  { key: 'dateEntered', patterns: ['date entered'] },
  { key: 'receivedFrom', patterns: ['from whom received', 'received from'] },
  { key: 'other', patterns: ['other', 'additional'] },
];

function normalizeHeader(header: string): string {
  return header.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function resolveInventoryFieldKey(header: string): InventoryCsvFieldKey | null {
  const n = normalizeHeader(header);
  for (const { key, patterns } of INVENTORY_HEADER_ALIASES) {
    if (patterns.some((p) => n === p || n.includes(p))) return key;
  }
  return null;
}

function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const joined = rows[i].join(' ').toLowerCase();
    if (joined.includes('assest name') || joined.includes('asset name')) return i;
  }
  return 0;
}

export function mapInventoryCsvHeaders(headers: string[]): {
  mapping: Partial<Record<InventoryCsvFieldKey, number>>;
  unmapped: string[];
} {
  const mapping: Partial<Record<InventoryCsvFieldKey, number>> = {};
  const unmapped: string[] = [];
  headers.forEach((header, index) => {
    const key = resolveInventoryFieldKey(header);
    if (key) mapping[key] = index;
    else if (header.trim()) unmapped.push(header.trim());
  });
  return { mapping, unmapped };
}

function cell(row: string[], index: number | undefined): string {
  if (index === undefined) return '';
  return (row[index] ?? '').trim();
}

function normalizeAssetStatus(value: string): string {
  const v = value.trim().toLowerCase();
  if (!v) return 'active';
  if (v.includes('use')) return 'in_use';
  if (v.includes('stor')) return 'in_storage';
  if (v.includes('damage')) return 'damaged';
  if (v.includes('dispose')) return 'disposed';
  if (v.includes('lost')) return 'lost';
  if (v.includes('active')) return 'active';
  return v.replace(/\s+/g, '_');
}

function parseQuantity(value: string): number {
  const n = parseInt(value.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function buildInventoryFromCsvFields(
  fields: Partial<Record<InventoryCsvFieldKey, string>>,
): Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> {
  const assetName = (fields.assetName ?? '').trim();
  const dateEnteredRaw = fields.dateEntered?.trim() ?? '';
  const dateEntered = dateEnteredRaw ? parseDateToIso(dateEnteredRaw) ?? dateEnteredRaw : undefined;

  return {
    assetName,
    assetType: fields.assetType?.trim() || undefined,
    assetStatus: normalizeAssetStatus(fields.assetStatus ?? ''),
    location: fields.location?.trim() || undefined,
    serialNo: fields.serialNo?.trim() || undefined,
    model: fields.model?.trim() || undefined,
    bookName: fields.bookName?.trim() || undefined,
    pageNumber: fields.pageNumber?.trim() || undefined,
    quantity: parseQuantity(fields.quantity ?? '1'),
    dateEntered,
    receivedFrom: fields.receivedFrom?.trim() || undefined,
    other: fields.other?.trim() || undefined,
  };
}

function inventoryMatchKey(item: Pick<InventoryItem, 'serialNo' | 'assetName' | 'location'>): string {
  const serial = item.serialNo?.trim().toUpperCase();
  if (serial) return `serial:${serial}`;
  return `name:${item.assetName.trim().toLowerCase()}|loc:${(item.location ?? '').trim().toLowerCase()}`;
}

export interface InventoryImportRowPreview {
  rowNumber: number;
  action: 'create' | 'update' | 'skip' | 'error';
  assetName: string;
  messages: string[];
  payload?: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>;
  existingId?: string;
}

export interface InventoryImportAnalysis {
  fileName: string;
  headerRow: number;
  mappedFields: InventoryCsvFieldKey[];
  unmappedHeaders: string[];
  totalDataRows: number;
  rows: InventoryImportRowPreview[];
}

export function analyzeInventoryCsv(
  text: string,
  fileName: string,
  existing: InventoryItem[],
): InventoryImportAnalysis {
  const rows = parseCsv(text);
  const headerRowIndex = findHeaderRowIndex(rows);
  const headers = rows[headerRowIndex] ?? [];
  const { mapping, unmapped } = mapInventoryCsvHeaders(headers);

  const existingByKey = new Map<string, InventoryItem>();
  for (const item of existing) {
    existingByKey.set(inventoryMatchKey(item), item);
  }

  const previews: InventoryImportRowPreview[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isRowEmpty(row)) continue;

    const fields: Partial<Record<InventoryCsvFieldKey, string>> = {};
    for (const [key, colIndex] of Object.entries(mapping) as [InventoryCsvFieldKey, number][]) {
      fields[key] = cell(row, colIndex);
    }

    const rowNumber = i + 1;
    const assetName = fields.assetName?.trim() ?? '';

    if (!assetName) {
      previews.push({
        rowNumber,
        action: 'error',
        assetName: '(missing name)',
        messages: ['Asset name is required'],
      });
      continue;
    }

    const payload = buildInventoryFromCsvFields(fields);
    const match = existingByKey.get(inventoryMatchKey(payload));

    if (match) {
      previews.push({
        rowNumber,
        action: 'update',
        assetName,
        messages: [`Update existing record (${match.serialNo || match.assetName})`],
        payload,
        existingId: match.id,
      });
    } else {
      previews.push({
        rowNumber,
        action: 'create',
        assetName,
        messages: ['New inventory item'],
        payload,
      });
    }
  }

  return {
    fileName,
    headerRow: headerRowIndex + 1,
    mappedFields: Object.keys(mapping) as InventoryCsvFieldKey[],
    unmappedHeaders: unmapped,
    totalDataRows: previews.length,
    rows: previews,
  };
}
