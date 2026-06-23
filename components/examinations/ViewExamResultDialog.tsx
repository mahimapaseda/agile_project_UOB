'use client';

import { Examination, ExamResult } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  getGradeColor,
  getResultLetterGrade,
  getResultGradeColor,
  isSubjectAbsent,
  normalizeExamGrade,
  subjectPercentage,
} from '@/lib/exam-grading';

interface ViewExamResultDialogProps {
  open: boolean;
  result: ExamResult | null;
  exam: Examination | null;
  onClose: () => void;
}

function gradeClass(grade: string): string {
  return getGradeColor(grade);
}

export function ViewExamResultDialog({ open, result, exam, onClose }: ViewExamResultDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left pr-8">{result.studentName}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span className="font-mono text-xs">{result.admissionNumber}</span>
            {exam && (
              <>
                <span>·</span>
                <span>{exam.examName}</span>
                <Badge variant="outline" className="text-xs">
                  {exam.grade}
                </Badge>
              </>
            )}
            <span className="ml-auto font-semibold text-gray-900">
              <span className={getResultGradeColor(result.percentage, result.subjects)}>
                {result.percentage.toFixed(1)}% ({getResultLetterGrade(result.percentage, result.subjects)})
              </span>
            </span>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Marks Obtained</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Max Marks</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.subjects.map((s, idx) => {
                const absent = isSubjectAbsent(s);
                const pct = subjectPercentage(s);
                return (
                  <tr key={`${s.subject}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-3 py-2 text-gray-900 max-w-[200px]">{s.subject}</td>
                    <td className={`px-3 py-2 text-center ${absent ? 'font-bold text-amber-600' : 'text-gray-700'}`}>
                      {absent ? 'AB' : s.obtainedMarks}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500">{s.maxMarks}</td>
                    <td className={`px-3 py-2 text-center font-bold ${gradeClass(s.grade)}`}>
                      {absent ? 'AB' : normalizeExamGrade(s.grade)}
                    </td>
                    <td className={`px-3 py-2 text-center ${absent ? 'font-bold text-amber-600' : 'text-gray-600'}`}>
                      {absent ? 'AB' : `${pct.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="bg-blue-900 text-white px-4 py-2.5 text-sm font-semibold">
            Total: {result.totalObtainedMarks} / {result.totalMaxMarks} ({result.percentage.toFixed(1)}%)
          </div>
        </div>

        {result.remarks && (
          <p className="text-sm text-gray-600 italic">
            <span className="font-medium not-italic text-gray-700">Remarks:</span> {result.remarks}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
