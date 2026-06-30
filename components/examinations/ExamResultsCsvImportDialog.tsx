'use client';

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Examination, ExamResult } from '@/types';
import { getStudents, getResults, addResult, updateResult } from '@/lib/firestore';
import {
  analyzeExamResultsCsv,
  computeRankByPercentage,
  downloadExamResultsCsvTemplate,
  getExamResultsCsvFormatHelp,
  getExamResultsImportSampleFileName,
  getExamResultsImportSampleUrl,
  type ExamResultImportAnalysis,
} from '@/lib/exam-results-csv-import';
import { countCurriculumSubjects } from '@/lib/exam-subjects';
import { classSectionsMatch, formatClassSection } from '@/lib/grade-class-options';

interface ExamResultsCsvImportDialogProps {
  open: boolean;
  exam: Examination;
  existingResults: ExamResult[];
  createdBy: string;
  onClose: () => void;
  onImported: () => void;
}

export function ExamResultsCsvImportDialog({
  open,
  exam,
  existingResults,
  createdBy,
  onClose,
  onImported,
}: ExamResultsCsvImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<ExamResultImportAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number } | null>(null);

  const subjectCount = countCurriculumSubjects(exam.grade, exam.section);

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
      const text = await file.text();
      const allStudents = await getStudents(exam.grade, 'active');
      const students = exam.section
        ? allStudents.filter((s) => classSectionsMatch(exam.grade, s.section, exam.section))
        : allStudents;
      const result = analyzeExamResultsCsv(text, file.name, exam, students, existingResults, createdBy);
      setAnalysis(result);
      if (result.totalDataRows === 0) {
        setError('No data rows found — add student rows below the header row.');
      }
    } catch {
      setError('Could not read or parse the CSV file.');
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
        if (row.action === 'update' && row.existingResultId) {
          await updateResult(row.existingResultId, row.payload);
          updated++;
        } else {
          await addResult(row.payload);
          created++;
        }
      } catch {
        failed++;
      }
    }

    if (failed < actionable.length) {
      const allResults = await getResults(exam.id);
      const rankMap = computeRankByPercentage(
        allResults.map((r) => ({ studentId: r.studentId, percentage: r.percentage }))
      );
      await Promise.all(
        allResults.map((r) => {
          const rank = rankMap.get(r.studentId);
          if (rank === undefined || r.rank === rank) return Promise.resolve();
          return updateResult(r.id, { rank });
        })
      );
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
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import results from CSV
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {exam.examName} · {exam.grade}
            {exam.section ? ` · ${formatClassSection(exam.grade, exam.section)}` : ''} · {subjectCount} curriculum subjects
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
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

          <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Choose CSV file</p>
            <p className="mx-auto mt-1 mb-3 max-w-2xl text-xs text-gray-500">
              {getExamResultsCsvFormatHelp(exam.grade, exam.section)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={analyzing}
                onClick={() => inputRef.current?.click()}
              >
                {analyzing ? 'Analyzing...' : 'Select file'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-blue-700"
                onClick={() => downloadExamResultsCsvTemplate(exam)}
              >
                <Download className="w-4 h-4" />
                Download template ({exam.grade})
              </Button>
              <Button type="button" variant="ghost" className="gap-2 text-slate-600" asChild>
                <a
                  href={getExamResultsImportSampleUrl(exam.grade, exam.section)}
                  download={getExamResultsImportSampleFileName(exam.grade, exam.section)}
                >
                  <Download className="w-4 h-4" />
                  Sample CSV
                </a>
              </Button>
            </div>
          </div>

          {analysis && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 border p-3">
                  <p className="text-2xl font-bold text-gray-900">{analysis.totalDataRows}</p>
                  <p className="text-xs text-gray-500">Rows in file</p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-100 p-3">
                  <p className="text-2xl font-bold text-green-700">{analysis.toCreate}</p>
                  <p className="text-xs text-gray-500">To create</p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                  <p className="text-2xl font-bold text-blue-700">{analysis.toUpdate}</p>
                  <p className="text-xs text-gray-500">To update</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                  <p className="text-2xl font-bold text-red-700">{analysis.errors}</p>
                  <p className="text-xs text-gray-500">Errors</p>
                </div>
              </div>

              {analysis.subjectColumns.length > 0 && (
                <p className="text-xs text-gray-600">
                  Matched {analysis.subjectColumns.length} subject column
                  {analysis.subjectColumns.length !== 1 ? 's' : ''}:{' '}
                  {analysis.subjectColumns.slice(0, 4).join(', ')}
                  {analysis.subjectColumns.length > 4 ? '…' : ''}
                </p>
              )}

              {analysis.parseWarnings.length > 0 && (
                <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  {analysis.parseWarnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}

              <div className="max-h-80 overflow-hidden overflow-y-auto rounded-lg border">
                <table className="w-full min-w-[40rem] text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Row</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Action</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Admission No.</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Student</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Subjects</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Avg %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analysis.rows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${actionColor(row.action)}`}>
                            {row.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono">{row.admissionNumber || '—'}</td>
                        <td className="min-w-[12rem] px-3 py-2">{row.studentName || '—'}</td>
                        <td className="px-3 py-2">{row.subjectCount || '—'}</td>
                        <td className="px-3 py-2">
                          {row.action !== 'error' ? `${row.percentage.toFixed(1)}%` : row.messages[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {analysis && (analysis.toCreate > 0 || analysis.toUpdate > 0) && !importResult && (
            <Button type="button" disabled={importing} onClick={() => void handleImport()}>
              {importing ? 'Importing...' : `Import ${analysis.toCreate + analysis.toUpdate} result(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
