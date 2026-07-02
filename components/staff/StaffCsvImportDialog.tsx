'use client';

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getStaffList, addStaff, updateStaff } from '@/lib/firestore';
import { analyzeStaffCsv, type StaffImportAnalysis } from '@/lib/staff-csv-import';
import { spreadsheetFileToCsvText } from '@/lib/staff-spreadsheet';

/** Google Forms export layout — served from /public/samples */
export const STAFF_IMPORT_SAMPLE_CSV_URL = '/samples/staff-import-sample.csv';

interface StaffCsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function StaffCsvImportDialog({ open, onClose, onImported }: StaffCsvImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<StaffImportAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number } | null>(null);

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
      const existing = await getStaffList();
      const result = analyzeStaffCsv(text, file.name, existing);
      setAnalysis(result);
      if (result.totalDataRows === 0) {
        setError('No data rows found — only headers detected. Export responses from Google Forms first.');
      }
    } catch {
      setError('Could not read or parse the file. Use CSV or Excel (.xlsx) from Google Forms.');
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
          await updateStaff(row.existingId, row.payload);
          updated++;
        } else if (row.action === 'create') {
          await addStaff(row.payload);
          created++;
        }
      } catch {
        failed++;
      }
    }

    setImportResult({ created, updated, failed });
    setImporting(false);
    if (failed === 0) onImported();
  };

  const actionColor = (action: string) => {
    if (action === 'create') return 'bg-green-100 text-green-800 border-green-200';
    if (action === 'update') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action === 'error') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="flex w-[calc(100vw-1rem)] max-h-[min(92dvh,900px)] flex-col gap-0 overflow-hidden p-0 sm:w-full sm:!max-w-5xl md:!max-w-6xl lg:!max-w-7xl"
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-slate-50/80">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-blue-700" />
            Import staff from spreadsheet
          </DialogTitle>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Upload the Google Forms export: Staff members data collection form (CSV or .xlsx).
            Existing staff are matched by staff ID, registration, teacher number, or NIC and updated — not duplicated.
            Repeated rows in the same file are rejected.
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-4 sm:space-y-5">
          {error && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {importResult && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-900 rounded-lg p-3 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              Import complete: {importResult.created} created, {importResult.updated} updated
              {importResult.failed > 0 ? `, ${importResult.failed} failed` : ''}.
            </div>
          )}

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 sm:p-6 md:flex md:items-center md:gap-6 md:text-left">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Upload className="mx-auto mb-2 h-10 w-10 shrink-0 text-slate-400 md:mx-0 md:mb-0 md:h-12 md:w-12" />
            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-sm font-semibold text-slate-800">Choose CSV or Excel file</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Staff members data collection form (Responses). Sample file is headers only — fill
                in your rows before importing.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  disabled={analyzing}
                  onClick={() => inputRef.current?.click()}
                >
                  {analyzing ? 'Analyzing...' : 'Select file'}
                </Button>
                <Button type="button" variant="ghost" className="gap-2 text-emerald-700" asChild>
                  <a href={STAFF_IMPORT_SAMPLE_CSV_URL} download="staff-import-sample.csv">
                    <Download className="h-4 w-4" />
                    Download sample CSV
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {analysis && (
            <>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{analysis.totalDataRows}</p>
                  <p className="text-xs text-slate-500 sm:text-sm">Rows in file</p>
                </div>
                <div className="rounded-lg border border-green-100 bg-green-50 p-3 sm:p-4">
                  <p className="text-2xl font-bold text-green-700 sm:text-3xl">{analysis.toCreate}</p>
                  <p className="text-xs text-slate-500 sm:text-sm">To create</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 sm:p-4">
                  <p className="text-2xl font-bold text-blue-700 sm:text-3xl">{analysis.toUpdate}</p>
                  <p className="text-xs text-slate-500 sm:text-sm">To update</p>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 sm:p-4">
                  <p className="text-2xl font-bold text-red-700 sm:text-3xl">{analysis.errors}</p>
                  <p className="text-xs text-slate-500 sm:text-sm">Errors</p>
                </div>
              </div>

              {analysis.parseWarnings.length > 0 && (
                <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  {analysis.parseWarnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}

              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Mapped columns: </span>
                {Object.keys(analysis.mappedColumns).length} of {analysis.headerCount}
              </div>

              {analysis.rows.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="max-h-64 overflow-auto sm:max-h-72 md:max-h-[min(42vh,24rem)] lg:max-h-[min(48vh,28rem)]">
                    <table className="w-full min-w-[640px] text-left text-xs sm:min-w-[720px] sm:text-sm">
                      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className="w-14 whitespace-nowrap px-3 py-2.5 font-semibold text-slate-600">Row</th>
                          <th className="w-24 whitespace-nowrap px-3 py-2.5 font-semibold text-slate-600">Action</th>
                          <th className="w-28 whitespace-nowrap px-3 py-2.5 font-semibold text-slate-600">Staff ID</th>
                          <th className="min-w-[10rem] px-3 py-2.5 font-semibold text-slate-600">Name</th>
                          <th className="min-w-[8rem] px-3 py-2.5 font-semibold text-slate-600">Role</th>
                          <th className="min-w-[12rem] px-3 py-2.5 font-semibold text-slate-600">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {analysis.rows.map((r) => (
                          <tr key={r.rowNumber} className="hover:bg-slate-50/80">
                            <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{r.rowNumber}</td>
                            <td className="whitespace-nowrap px-3 py-2.5">
                              <span
                                className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold capitalize sm:text-xs ${actionColor(r.action)}`}
                              >
                                {r.action}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-800">{r.staffId}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-900">{r.name}</td>
                            <td className="px-3 py-2.5 text-slate-700">{r.designation}</td>
                            <td
                              className="px-3 py-2.5 text-slate-500 md:max-w-md lg:max-w-lg"
                              title={r.messages.join('; ')}
                            >
                              <span className="line-clamp-2 md:line-clamp-none">{r.messages[0]}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 bg-white sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClose} className="min-h-11 sm:min-h-10">
            Close
          </Button>
          {analysis && analysis.validRows > 0 && !importResult && (
            <Button
              type="button"
              disabled={importing}
              onClick={() => void handleImport()}
              className="min-h-11 gap-2 bg-blue-700 hover:bg-blue-800 sm:min-h-10"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Import {analysis.validRows} staff member{analysis.validRows !== 1 ? 's' : ''} to database
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
