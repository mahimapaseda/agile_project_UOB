'use client';

import { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, RefreshCw, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  addInventoryItem,
  getInventoryList,
  updateInventoryItem,
} from '@/lib/firestore';
import { analyzeInventoryCsv, type InventoryImportAnalysis } from '@/lib/inventory-csv-import';
import { spreadsheetFileToCsvText } from '@/lib/staff-spreadsheet';

export const INVENTORY_IMPORT_SAMPLE_CSV_URL = '/samples/inventory-import-sample.csv';

interface InventoryCsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function InventoryCsvImportDialog({
  open,
  onClose,
  onImported,
}: InventoryCsvImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<InventoryImportAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    failed: number;
  } | null>(null);

  const reset = () => {
    setAnalysis(null);
    setError('');
    setImportResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setError('');
    setImportResult(null);
    setAnalyzing(true);
    try {
      const text = await spreadsheetFileToCsvText(file);
      const existing = await getInventoryList();
      const result = analyzeInventoryCsv(text, file.name, existing);
      setAnalysis(result);
      if (result.totalDataRows === 0) {
        setError('No data rows found. Use the school inventory CSV format (see sample).');
      }
    } catch {
      setError('Could not read or parse the file. Use CSV or Excel (.xlsx).');
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!analysis) return;
    const actionable = analysis.rows.filter((r) => r.action === 'create' || r.action === 'update');
    if (actionable.length === 0) return;

    setImporting(true);
    setError('');
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const row of actionable) {
      if (!row.payload) {
        failed++;
        continue;
      }
      try {
        if (row.action === 'update' && row.existingId) {
          await updateInventoryItem(row.existingId, row.payload);
          updated++;
        } else {
          await addInventoryItem(row.payload);
          created++;
        }
      } catch {
        failed++;
      }
    }

    setImportResult({ created, updated, failed });
    setImporting(false);
    if (created > 0 || updated > 0) onImported();
  };

  const actionableCount =
    analysis?.rows.filter((r) => r.action === 'create' || r.action === 'update').length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex max-h-[min(92dvh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <DialogTitle>Import inventory from CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <p className="text-sm text-slate-600">
            Upload the school inventory spreadsheet (
            <span className="font-medium">Data Base-Inventry.csv</span> format). Existing items
            match by serial number, or by name + location.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={INVENTORY_IMPORT_SAMPLE_CSV_URL} download>
                <Download className="mr-2 h-4 w-4" />
                Download sample CSV
              </a>
            </Button>
          </div>

          <div
            className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/50"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <Upload className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Click to choose CSV or Excel file</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>

          {analyzing && (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analysing file…
            </p>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {analysis && analysis.totalDataRows > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p className="font-semibold text-slate-900">
                {analysis.totalDataRows} row{analysis.totalDataRows !== 1 ? 's' : ''} found
              </p>
              <p className="mt-1 text-slate-500">
                Header row {analysis.headerRow} · Mapped: {analysis.mappedFields.join(', ')}
              </p>
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs">
                {analysis.rows.slice(0, 20).map((row) => (
                  <li key={row.rowNumber} className="flex gap-2">
                    <span
                      className={
                        row.action === 'error'
                          ? 'text-red-600'
                          : row.action === 'create'
                            ? 'text-green-700'
                            : 'text-blue-700'
                      }
                    >
                      {row.action}
                    </span>
                    <span className="truncate text-slate-700">{row.assetName}</span>
                  </li>
                ))}
                {analysis.rows.length > 20 && (
                  <li className="text-slate-400">…and {analysis.rows.length - 20} more</li>
                )}
              </ul>
            </div>
          )}

          {importResult && (
            <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Created {importResult.created}, updated {importResult.updated}
              {importResult.failed > 0 ? `, ${importResult.failed} failed` : ''}.
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button
            type="button"
            disabled={!analysis || actionableCount === 0 || importing}
            onClick={() => void handleImport()}
          >
            {importing ? 'Importing…' : `Import ${actionableCount} item${actionableCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
