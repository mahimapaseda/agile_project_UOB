'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Download, Printer, ArrowLeft, Search, Pencil, Trash2, User, Upload, Eye } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getExamination, getResults, deleteResult, getStudents } from '@/lib/firestore';
import { Examination, ExamResult, Student } from '@/types';
import {
  formatDate,
  getLetterGrade,
  getResultGradeColor,
  getResultLetterGrade,
  isPassingResult,
} from '@/lib/utils';
import { isSubjectAbsent, subjectPercentage, SUBJECT_FAIL_PERCENT } from '@/lib/exam-grading';
import { canManageExams, canViewExaminationsPortal } from '@/lib/access-control';
import { useAuth } from '@/lib/auth-context';
import { AccessGate } from '@/components/auth/AccessGate';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { DataLoadError } from '@/components/ui/DataLoadError';
import { AddResultDialog } from '@/components/examinations/AddResultDialog';
const ExamResultsCsvImportDialog = dynamic(
  () =>
    import('@/components/examinations/ExamResultsCsvImportDialog').then((m) => ({
      default: m.ExamResultsCsvImportDialog,
    })),
  { ssr: false },
);
import { ExamCurriculumPanel } from '@/components/examinations/ExamCurriculumPanel';
import { ViewExamResultDialog } from '@/components/examinations/ViewExamResultDialog';
import { ExamOverviewPanel } from '@/components/examinations/ExamOverviewPanel';
import { getCurriculumForGrade, getSubjectsForExamination, countCurriculumSubjects } from '@/lib/exam-subjects';
import {
  buildSubjectColumns,
  displaySubjectLabel,
  getSubjectMark,
} from '@/lib/exam-result-display';
import { classSectionsMatch, formatClassSection } from '@/lib/grade-class-options';
import { cn } from '@/lib/utils';
import { computeExamRanks } from '@/lib/exam-rank';

function ExaminationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Examination | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddResult, setShowAddResult] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewingResult, setViewingResult] = useState<ExamResult | null>(null);
  const { userProfile } = useAuth();
  const canManage = canManageExams(userProfile);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const e = await getExamination(id);
      setExam(e);
      const r = e ? await getResults(id) : [];
      setResults(r);
      if (e) {
        const all = await getStudents(e.grade, 'active');
        const inClass = e.section
          ? all.filter((s) => classSectionsMatch(e.grade, s.section, e.section))
          : all;
        setEnrolledStudents(inClass);
      } else {
        setEnrolledStudents([]);
      }
    } catch (err) {
      setLoadError(formatFirestoreError(err));
      setExam(null);
      setResults([]);
      setEnrolledStudents([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteResult = async (resultId: string) => {
    await deleteResult(resultId);
    setResults(prev => prev.filter(r => r.id !== resultId));
  };

  if (loading) {
    return (
      <>
        <Header
          title="Examination"
          backHref="/dashboard/examinations"
          backLabel="Back to examinations"
        />
        <PageMain className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </PageMain>
      </>
    );
  }

  if (!exam) {
    return (
      <>
        <Header
          title="Not Found"
          backHref="/dashboard/examinations"
          backLabel="Back to examinations"
        />
        <PageMain className="text-center">
          {loadError && (
            <div className="mb-4 text-left">
              <DataLoadError message={loadError} onRetry={() => void load()} />
            </div>
          )}
          <p className="text-gray-500 mb-4">
            {loadError ? 'Could not load this examination.' : 'Examination not found.'}
          </p>
          <Button onClick={() => router.push('/dashboard/examinations')}>Back</Button>
        </PageMain>
      </>
    );
  }

  const enrolledIds = new Set(enrolledStudents.map((s) => s.id));
  const classResults = results.filter((r) => enrolledIds.has(r.studentId));
  const orphanResults = results.filter((r) => !enrolledIds.has(r.studentId));
  const classResultIds = new Set(classResults.map((r) => r.studentId));
  const missingStudents = enrolledStudents
    .filter((s) => !classResultIds.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const searchLower = search.trim().toLowerCase();
  const filtered = classResults.filter(
    (r) =>
      !searchLower ||
      r.studentName.toLowerCase().includes(searchLower) ||
      r.admissionNumber.toLowerCase().includes(searchLower),
  );
  const filteredMissing = missingStudents.filter(
    (s) =>
      !searchLower ||
      s.name.toLowerCase().includes(searchLower) ||
      s.admissionNumber.toLowerCase().includes(searchLower),
  );
  const filteredOrphans = orphanResults.filter(
    (r) =>
      !searchLower ||
      r.studentName.toLowerCase().includes(searchLower) ||
      r.admissionNumber.toLowerCase().includes(searchLower),
  );
  const sorted = [...filtered].sort((a, b) => b.percentage - a.percentage);
  const rankMap = computeExamRanks(
    classResults.map((r) => ({ studentId: r.studentId, percentage: r.percentage })),
  );
  const avgPercent =
    classResults.length > 0
      ? classResults.reduce((s, r) => s + r.percentage, 0) / classResults.length
      : 0;
  const passed = classResults.filter((r) => isPassingResult(r.percentage, r.subjects)).length;
  const passRate =
    classResults.length > 0 ? Math.round((passed / classResults.length) * 100) : null;
  const curriculum = getCurriculumForGrade(exam.grade);
  const gradeSubjects = getSubjectsForExamination(exam.grade, exam.section);
  const subjectCount = countCurriculumSubjects(exam.grade, exam.section);
  const subjectColumns = buildSubjectColumns(classResults, gradeSubjects);
  const handleExportExam = async () => {
    const { exportExamReportPDF } = await import('@/lib/pdf-export');
    await exportExamReportPDF(exam, classResults);
  };
  const handleExportReportCard = async (result: ExamResult) => {
    const student = enrolledStudents.find(
      (s) => s.id === result.studentId || s.admissionNumber === result.admissionNumber,
    );
    const { exportStudentReportCardPDF } = await import('@/lib/pdf-export');
    await exportStudentReportCardPDF(result, exam, student?.profileImageUrl);
  };

  return (
    <>
      <Header
        title={exam.examName}
        subtitle={`${exam.term} · ${exam.year} · ${exam.grade}${exam.section ? ` · ${formatClassSection(exam.grade, exam.section)}` : ''}`}
        backHref="/dashboard/examinations"
        backLabel="Back to examinations"
      />
      <PageMain className="mx-auto w-full max-w-[96rem] space-y-3 sm:space-y-4">
        {/* Exam Header */}
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div className="min-w-0">
                <h2 className="hidden text-base font-bold text-gray-900 lg:block lg:text-lg">{exam.examName}</h2>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                  <Badge variant="default">{exam.grade}</Badge>
                  {exam.section && (
                    <Badge variant="secondary">{formatClassSection(exam.grade, exam.section)}</Badge>
                  )}
                  <Badge variant="secondary">{exam.term}</Badge>
                  <Badge variant="outline">{exam.year}</Badge>
                  {exam.examDate && <span className="text-xs sm:text-sm text-gray-400">{formatDate(exam.examDate)}</span>}
                </div>
                {exam.description && <p className="text-xs sm:text-sm text-gray-500 mt-2">{exam.description}</p>}
                {gradeSubjects.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs text-purple-600">
                      {subjectCount} subjects per student · {curriculum?.label}
                    </p>
                    {subjectColumns.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subjectColumns.map((subject) => (
                          <Badge key={subject} variant="outline" className="text-[10px] font-normal">
                            {displaySubjectLabel(subject)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:w-auto lg:flex-wrap">
                <Button variant="outline" size="sm" onClick={() => void handleExportExam()} className="w-full lg:w-auto">
                  <Download className="w-4 h-4" /> Export
                </Button>
                {canManage && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="w-full lg:w-auto">
                      <Upload className="w-4 h-4" /> Import
                    </Button>
                    <Button variant="outline" size="sm" asChild className="w-full lg:w-auto">
                      <Link href={`/dashboard/examinations/${id}/edit`}><Pencil className="w-4 h-4" /> Edit</Link>
                    </Button>
                    <Button size="sm" onClick={() => setShowAddResult(true)} className="col-span-2 w-full sm:col-span-1 lg:col-span-1 lg:w-auto">
                      <Plus className="w-4 h-4" /> Add Result
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {curriculum && (
          <ExamCurriculumPanel defaultBand={curriculum.band} compact />
        )}

        {enrolledStudents.length > 0 && (
          <ExamOverviewPanel
            enrolledCount={enrolledStudents.length}
            appearedCount={classResults.length}
            missingStudents={missingStudents}
            orphanCount={orphanResults.length}
            passRate={passRate}
            classAverage={classResults.length > 0 ? avgPercent : null}
            gradeLabel={classResults.length > 0 ? getLetterGrade(avgPercent) : '—'}
            examGrade={exam.grade}
            examSection={exam.section}
            canManage={canManage}
            onImport={() => setShowImport(true)}
            onAddResult={() => setShowAddResult(true)}
          />
        )}

        {/* Results Table */}
        <div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by name or admission number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {classResults.length === 0 && filteredMissing.length === 0 && filteredOrphans.length === 0 ? (
              <div className="p-12 text-center">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No results yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  {canManage ? 'Add student results for this examination' : 'No results recorded yet'}
                </p>
                {canManage && (
                  <Button className="mt-4" onClick={() => setShowAddResult(true)}>
                    <Plus className="w-4 h-4" /> Add First Result
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table (lg+) */}
                <div className="hidden lg:block">
                  <ResponsiveTable>
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Rank</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Adm. No.</th>
                        <th className="min-w-[10rem] text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                        {subjectColumns.map((subject) => (
                          <th
                            key={subject}
                            className="text-center px-2 py-3 text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap"
                            title={displaySubjectLabel(subject)}
                          >
                            {displaySubjectLabel(subject)}
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Total</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">%</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sorted.map((r) => {
                        const rank = rankMap.get(r.studentId) ?? 0;
                        return (
                        <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${rank <= 3 ? 'font-medium' : ''}`}>
                          <td className="sticky left-0 z-10 bg-white px-3 py-3 hover:bg-gray-50">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              rank === 1 ? 'bg-amber-100 text-amber-700' :
                              rank === 2 ? 'bg-gray-100 text-gray-600' :
                              rank === 3 ? 'bg-orange-100 text-orange-600' :
                              'text-gray-400'
                            }`}>
                              {rank}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{r.admissionNumber}</td>
                          <td className="px-3 py-3 text-gray-900">{r.studentName}</td>
                          {subjectColumns.map((subject) => {
                            const sub = getSubjectMark(r, subject);
                            const absent = sub ? isSubjectAbsent(sub) : false;
                            const failed = sub
                              ? isSubjectAbsent(sub) || subjectPercentage(sub) < SUBJECT_FAIL_PERCENT
                              : false;
                            return (
                              <td key={subject} className="px-2 py-3 text-center text-xs whitespace-nowrap">
                                {sub ? (
                                  <span
                                    title={
                                      absent
                                        ? 'Absent (AB) · Overall Grade F'
                                        : `${sub.obtainedMarks}/${sub.maxMarks} · Grade ${sub.grade}${failed ? ' · Below 35% (overall F)' : ''}`
                                    }
                                    className={
                                      absent
                                        ? 'font-bold text-amber-600'
                                        : failed
                                          ? 'font-semibold text-red-600'
                                          : 'text-gray-700'
                                    }
                                  >
                                    {absent ? (
                                      'AB'
                                    ) : (
                                      <>
                                        <span className={failed ? 'text-red-600' : 'font-medium text-gray-900'}>
                                          {sub.obtainedMarks}
                                        </span>
                                        <span className={failed ? 'text-red-400' : 'text-gray-400'}>/{sub.maxMarks}</span>
                                      </>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center text-gray-700 whitespace-nowrap">{r.totalObtainedMarks}/{r.totalMaxMarks}</td>
                          <td className="px-3 py-3 text-center font-semibold text-gray-900 whitespace-nowrap">{r.percentage.toFixed(1)}%</td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className={`font-bold text-sm ${getResultGradeColor(r.percentage, r.subjects)}`}>
                              {getResultLetterGrade(r.percentage, r.subjects)}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setViewingResult(r)} title="View result">
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => void handleExportReportCard(r)} title="Export Report Card">
                                <Printer className="w-3 h-3" />
                              </Button>
                              {canManage && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Result</AlertDialogTitle>
                                      <AlertDialogDescription>Delete the result for <strong>{r.studentName}</strong>?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteResult(r.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </td>
                        </tr>
                      );})}
                      {filteredMissing.length > 0 && (
                        <>
                          <tr className="bg-amber-50/80">
                            <td
                              colSpan={subjectColumns.length + 6}
                              className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-800"
                            >
                              Not appeared · {filteredMissing.length} student{filteredMissing.length !== 1 ? 's' : ''}
                            </td>
                          </tr>
                          {filteredMissing.map((student) => (
                            <tr key={student.id} className="bg-amber-50/30 hover:bg-amber-50/50">
                              <td className="sticky left-0 z-10 bg-amber-50/30 px-3 py-3 text-center text-xs text-amber-600">
                                —
                              </td>
                              <td className="px-3 py-3 font-mono text-xs text-amber-800 whitespace-nowrap">
                                {student.admissionNumber}
                              </td>
                              <td className="px-3 py-3 text-amber-950">{student.name}</td>
                              {subjectColumns.map((subject) => (
                                <td key={subject} className="px-2 py-3 text-center text-xs text-amber-400">
                                  —
                                </td>
                              ))}
                              <td className="px-3 py-3 text-center text-xs text-amber-400">—</td>
                              <td className="px-3 py-3 text-center text-xs text-amber-400">—</td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <Badge className="bg-amber-200/90 text-amber-900 hover:bg-amber-200/90">
                                  Not appeared
                                </Badge>
                              </td>
                              <td className="px-3 py-3">
                                {canManage && (
                                  <div className="flex items-center justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
                                      onClick={() => setShowAddResult(true)}
                                      title="Add result for this student"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {filteredOrphans.length > 0 && (
                        <>
                          <tr className="bg-slate-100">
                            <td
                              colSpan={subjectColumns.length + 6}
                              className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                            >
                              Stale results · {filteredOrphans.length} (not in current class list)
                            </td>
                          </tr>
                          {filteredOrphans.map((r) => (
                            <tr key={r.id} className="bg-slate-50/80 hover:bg-slate-100/80">
                              <td className="sticky left-0 z-10 bg-slate-50/80 px-3 py-3 text-center text-xs text-slate-400">
                                —
                              </td>
                              <td className="px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                                {r.admissionNumber}
                              </td>
                              <td className="px-3 py-3 text-slate-800">{r.studentName}</td>
                              {subjectColumns.map((subject) => {
                                const sub = getSubjectMark(r, subject);
                                return (
                                  <td key={subject} className="px-2 py-3 text-center text-xs text-slate-500">
                                    {sub ? (isSubjectAbsent(sub) ? 'AB' : `${sub.obtainedMarks}/${sub.maxMarks}`) : '—'}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-3 text-center text-slate-600 whitespace-nowrap">
                                {r.totalObtainedMarks}/{r.totalMaxMarks}
                              </td>
                              <td className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                                {r.percentage.toFixed(1)}%
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <Badge variant="outline" className="text-slate-600">
                                  Stale
                                </Badge>
                              </td>
                              <td className="px-3 py-3">
                                {canManage && (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => setViewingResult(r)} title="View result">
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete stale result</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Remove the result for <strong>{r.studentName}</strong>? This student is not in the current class.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteResult(r.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                  </ResponsiveTable>
                </div>

                {/* Mobile & tablet cards (< lg) */}
                <div className="divide-y divide-gray-100 lg:hidden">
                  {sorted.map((r) => {
                    const rank = rankMap.get(r.studentId) ?? 0;
                    return (
                    <div key={r.id} className="p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
                          rank === 1 ? 'bg-amber-100 text-amber-700' :
                          rank === 2 ? 'bg-gray-100 text-gray-600' :
                          rank === 3 ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{r.studentName}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{r.admissionNumber}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{r.percentage.toFixed(1)}%</p>
                          <p className={`text-xs font-bold ${getResultGradeColor(r.percentage, r.subjects)}`}>
                            {getResultLetterGrade(r.percentage, r.subjects)}
                          </p>
                        </div>
                      </div>
                      {r.subjects.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 pl-10 sm:grid-cols-3">
                          {r.subjects.map((sub) => {
                            const absent = isSubjectAbsent(sub);
                            const failed = absent || subjectPercentage(sub) < SUBJECT_FAIL_PERCENT;
                            return (
                            <span
                              key={sub.subject}
                              className={cn(
                                'flex items-center justify-between gap-1 rounded-md px-2 py-1 text-[10px] ring-1',
                                absent
                                  ? 'bg-amber-50 text-amber-800 ring-amber-200'
                                  : failed
                                    ? 'bg-rose-50 text-rose-800 ring-rose-200'
                                    : 'bg-slate-50 text-slate-700 ring-slate-200',
                              )}
                            >
                              <span className="truncate font-medium">{displaySubjectLabel(sub.subject)}</span>
                              <span className="shrink-0 tabular-nums">
                                {absent ? 'AB' : `${sub.obtainedMarks}/${sub.maxMarks}`}
                              </span>
                            </span>
                          );})}
                        </div>
                      )}
                      <div className="flex items-center justify-between pl-10 pr-1">
                        <p className="text-[11px] text-gray-500">
                          Total {r.totalObtainedMarks}/{r.totalMaxMarks}
                        </p>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" onClick={() => setViewingResult(r)} title="View result">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => void handleExportReportCard(r)} title="Export Report Card">
                            <Printer className="w-4 h-4" />
                          </Button>
                          {canManage && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Result</AlertDialogTitle>
                                  <AlertDialogDescription>Delete the result for <strong>{r.studentName}</strong>?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteResult(r.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  );})}
                  {filteredMissing.length > 0 && (
                    <>
                      <div className="bg-amber-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Not appeared · {filteredMissing.length}
                      </div>
                      {filteredMissing.map((student) => (
                        <div key={student.id} className="border-t border-amber-100 bg-amber-50/40 p-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                              —
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-amber-950">{student.name}</p>
                              <p className="font-mono text-[11px] text-amber-700">{student.admissionNumber}</p>
                            </div>
                            <Badge className="shrink-0 bg-amber-200/90 text-amber-900 hover:bg-amber-200/90">
                              Not appeared
                            </Badge>
                          </div>
                          {canManage && (
                            <div className="flex justify-end pl-10">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 border-amber-300 text-xs text-amber-800"
                                onClick={() => setShowAddResult(true)}
                              >
                                <Plus className="w-3 h-3" /> Add result
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  {filteredOrphans.length > 0 && (
                    <>
                      <div className="bg-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        Stale results · {filteredOrphans.length}
                      </div>
                      {filteredOrphans.map((r) => (
                        <div key={r.id} className="border-t border-slate-200 bg-slate-50/60 p-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                              —
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800">{r.studentName}</p>
                              <p className="font-mono text-[11px] text-slate-500">{r.admissionNumber}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-slate-700">{r.percentage.toFixed(1)}%</p>
                              <Badge variant="outline" className="text-[10px] text-slate-600">Stale</Badge>
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex justify-end gap-0.5 pl-10">
                              <Button variant="ghost" size="icon" onClick={() => setViewingResult(r)} title="View result">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete stale result</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove the result for <strong>{r.studentName}</strong>? This student is not in the current class.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteResult(r.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="pb-6">
          <Button variant="outline" asChild>
            <Link href="/dashboard/examinations"><ArrowLeft className="w-4 h-4" /> Back to Examinations</Link>
          </Button>
        </div>
      </PageMain>

      {showImport && exam && (
        <ExamResultsCsvImportDialog
          open={showImport}
          exam={exam}
          existingResults={results}
          createdBy={userProfile?.uid || ''}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            void load();
          }}
        />
      )}

      {showAddResult && exam && (
        <AddResultDialog
          exam={exam}
          existingStudentIds={results.map(r => r.studentId)}
          onClose={() => setShowAddResult(false)}
          onAdded={(newResult) => {
            setResults(prev => [...prev, newResult]);
            setShowAddResult(false);
          }}
        />
      )}

      <ViewExamResultDialog
        open={viewingResult !== null}
        result={viewingResult}
        exam={exam}
        onClose={() => setViewingResult(null)}
      />
    </>
  );
}

export default function ExaminationDetailRoute() {
  return (
    <AccessGate
      allow={canViewExaminationsPortal}
      redirectTo="/dashboard/examinations"
      deniedMessage="You do not have permission to view examinations."
      backLabel="Back to examinations"
    >
      <ExaminationDetailPage />
    </AccessGate>
  );
}
