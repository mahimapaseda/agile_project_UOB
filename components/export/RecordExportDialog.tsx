'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, ArrowLeft, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExportColumn } from '@/lib/record-export-fields';
import { previewPdfOrientation } from '@/lib/record-export';

export type ExportFormat = 'csv' | 'pdf';

interface RecordExportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  records: T[];
  fields: ExportColumn<T>[];
  filePrefix: string;
  /** Default selected field keys — all fields when omitted */
  defaultFieldKeys?: string[];
  /** Default export format on step 1 */
  defaultFormat?: ExportFormat;
  /** Field keys omitted from PDF export and column picker (CSV unchanged) */
  pdfExcludedFieldKeys?: readonly string[];
  /** CSV exports every field immediately without the column picker */
  csvExportsAllFields?: boolean;
  /** PDF exports the curated column set immediately without the column picker */
  pdfExportsFixedColumns?: boolean;
}

export function RecordExportDialog<T>({
  open,
  onOpenChange,
  title,
  records,
  fields,
  filePrefix,
  defaultFieldKeys,
  defaultFormat = 'csv',
  pdfExcludedFieldKeys,
  csvExportsAllFields = false,
  pdfExportsFixedColumns = false,
}: RecordExportDialogProps<T>) {
  const [stage, setStage] = useState<1 | 2>(1);
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  const pickerFields = useMemo(() => {
    if (format !== 'pdf' || !pdfExcludedFieldKeys?.length) return fields;
    const excluded = new Set(pdfExcludedFieldKeys);
    return fields.filter((f) => !excluded.has(f.key));
  }, [fields, format, pdfExcludedFieldKeys]);
  const allKeys = useMemo(() => pickerFields.map((f) => f.key), [pickerFields]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(defaultFieldKeys ?? allKeys);

  useEffect(() => {
    if (!open) {
      setStage(1);
      setFormat(defaultFormat);
      setSelectedKeys(defaultFieldKeys ?? allKeys);
    }
  }, [open, allKeys, defaultFieldKeys, defaultFormat]);

  useEffect(() => {
    setSelectedKeys(defaultFieldKeys ?? allKeys);
  }, [pickerFields, defaultFieldKeys, allKeys]);

  useEffect(() => {
    if (format !== 'pdf' || !pdfExcludedFieldKeys?.length) return;
    const excluded = new Set(pdfExcludedFieldKeys);
    setSelectedKeys((prev) => prev.filter((k) => !excluded.has(k)));
  }, [format, pdfExcludedFieldKeys]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const selectAll = () => setSelectedKeys(allKeys);
  const clearAll = () => setSelectedKeys([]);

  const selectedColumns = useMemo(
    () => pickerFields.filter((f) => selectedKeys.includes(f.key)),
    [pickerFields, selectedKeys],
  );

  const pdfOrientation = useMemo(() => {
    if (format !== 'pdf') return null;
    return previewPdfOrientation(selectedKeys.length, selectedKeys);
  }, [format, selectedKeys]);

  const handleExport = async () => {
    if (!records.length) return;
    const { exportRecordsCSV, exportRecordsPDF } = await import('@/lib/record-export');
    if (format === 'csv') {
      const csvColumns = csvExportsAllFields
        ? fields
        : selectedColumns;
      if (!csvColumns.length) return;
      exportRecordsCSV(records, csvColumns, filePrefix);
    } else {
      if (!selectedColumns.length) return;
      await exportRecordsPDF(title, records, selectedColumns, filePrefix);
    }
    onOpenChange(false);
  };

  const handleFormatSelect = (nextFormat: ExportFormat) => {
    setFormat(nextFormat);
    if (nextFormat === 'csv' && csvExportsAllFields) {
      if (!records.length) return;
      void (async () => {
        const { exportRecordsCSV } = await import('@/lib/record-export');
        exportRecordsCSV(records, fields, filePrefix);
        onOpenChange(false);
      })();
      return;
    }
    if (nextFormat === 'pdf' && pdfExportsFixedColumns) {
      if (!records.length) return;
      void (async () => {
        const { exportRecordsPDF } = await import('@/lib/record-export');
        await exportRecordsPDF(title, records, fields, filePrefix);
        onOpenChange(false);
      })();
      return;
    }
    setStage(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {stage === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Export {title}</DialogTitle>
              <DialogDescription>
                Choose a file format for {records.length} record{records.length !== 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2 px-4 sm:grid-cols-2 sm:px-6">
              {(
                [
                  {
                    id: 'pdf' as const,
                    label: 'PDF',
                    hint: pdfExportsFixedColumns
                      ? 'Formatted staff directory · landscape'
                      : 'Portrait for few columns · landscape for detailed exports',
                    icon: FileText,
                    isDefault: defaultFormat === 'pdf',
                  },
                  {
                    id: 'csv' as const,
                    label: 'CSV',
                    hint: csvExportsAllFields
                      ? 'All fields · Excel / Google Sheets'
                      : 'Spreadsheet · Excel / Google Sheets',
                    icon: FileSpreadsheet,
                    isDefault: defaultFormat === 'csv',
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = format === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleFormatSelect(opt.id)}
                    className={cn(
                      'flex min-h-[88px] flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                      active
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active ? 'text-emerald-700' : 'text-slate-500')} />
                    <div>
                      <p className={cn('text-sm font-bold', active ? 'text-emerald-900' : 'text-slate-900')}>
                        {opt.label}
                        {opt.isDefault && (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase text-emerald-600">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{opt.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Select information</DialogTitle>
              <DialogDescription>
                Choose columns to include in your {format.toUpperCase()} export.
              </DialogDescription>
            </DialogHeader>

            <div className="px-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {selectedKeys.length} of {pickerFields.length} selected
                  {pdfOrientation && (
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      PDF layout:{' '}
                      <span className="font-semibold text-slate-600">
                        {pdfOrientation === 'landscape' ? 'Landscape (detailed)' : 'Portrait (compact)'}
                      </span>
                      {selectedKeys.length > 10 && (
                        <span className="block text-slate-400">
                          Many columns are split across multiple pages so text stays readable.
                        </span>
                      )}
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Select all
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-[min(50vh,320px)] space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
                {pickerFields.map((field) => {
                  const checked = selectedKeys.includes(field.key);
                  return (
                    <label
                      key={field.key}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                        checked ? 'bg-white shadow-sm ring-1 ring-emerald-100' : 'hover:bg-white/80',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleKey(field.key)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-800">{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStage(1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void handleExport()}
                disabled={!selectedKeys.length || !records.length}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export {format.toUpperCase()}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
