import type jsPDF from 'jspdf';
import { Student, Staff, ExamResult, Examination } from '@/types';
import {
  EXAM_GRADING_SCALE,
  getLetterGrade,
  getResultLetterGrade,
  isSubjectAbsent,
  subjectPercentage,
  SUBJECT_FAIL_PERCENT,
  type ExamLetterGrade,
} from './exam-grading';
import { computeExamRanks } from './exam-rank';
import {
  buildSubjectColumns,
  displaySubjectLabel,
  formatSubjectMarkWithGrade,
  getSubjectMark,
} from './exam-result-display';
import { getSubjectsForExamination } from './exam-subjects';
import { calculateAge, formatDate, formatTimestamp } from './utils';
import { formatClassSection, getClassFieldLabel, isAdvancedLevelGrade } from './grade-class-options';
import { formatIdentityNumber } from './identity-numbers';
import { resolveProfileImageUrl } from './resolve-profile-image-url';

const SCHOOL = 'Delta Gemunupura College';
const SCHOOL_SUB = 'School Database Management System';
const PRIMARY = [30, 64, 175] as [number, number, number]; // blue-700
const GOLD = [245, 158, 11] as [number, number, number]; // amber-500

let jsPdfCtorPromise: Promise<typeof import('jspdf').default> | null = null;

async function getJsPdfCtor(): Promise<typeof import('jspdf').default> {
  if (!jsPdfCtorPromise) {
    jsPdfCtorPromise = import('jspdf').then((m) => m.default);
  }
  return jsPdfCtorPromise;
}

async function addHeader(doc: jsPDF, title: string, sub?: string) {
  const w = doc.internal.pageSize.getWidth();
  const headerH = 40;
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, w, headerH, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, headerH, w, 1.2, 'F');

  const logo = await loadSchoolLogoForPdf(28, 24);
  let titleX = w / 2;
  if (logo) {
    const aspect = logo.w / logo.h;
    let drawH = 28;
    let drawW = drawH * aspect;
    if (drawW > 24) {
      drawW = 24;
      drawH = drawW / aspect;
    }
    const logoY = (headerH - drawH) / 2;
    doc.addImage(logo.dataUrl, logo.format, MARGIN, logoY, drawW, drawH);
    titleX = MARGIN + drawW + 8 + (w - MARGIN - drawW - 8 - MARGIN) / 2;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(SCHOOL, titleX, 12, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(SCHOOL_SUB, titleX, 18, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, w / 2, 30, { align: 'center' });
  if (sub) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(sub, w / 2, 36, { align: 'center' });
  }
  doc.setTextColor(0, 0, 0);
  return headerH + 8;
}

function addFooter(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(14, h - 14, w - 14, h - 14);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${new Date().toLocaleString('en-GB')} · ${SCHOOL}`, w / 2, h - 7, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

// ─── Students ────────────────────────────────────────────────────────────────

export async function exportStudentsPDF(students: Student[]) {
  const JsPdf = await getJsPdfCtor();
  const doc = new JsPdf({ format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = await addHeader(doc, 'Student List', `Total: ${students.length} students · ${new Date().toLocaleDateString('en-GB')}`);

  const cols = [14, 45, 95, 135, 160, 185];
  const headers = ['Adm. No.', 'Name', 'Grade', 'Gender', 'Parent Phone', 'Status'];

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, w - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, cols[i], y + 5.5));
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    if (y > 270) {
      addFooter(doc);
      doc.addPage();
      y = await addHeader(doc, 'Student List (continued)');
    }
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y - 1, w - 28, 8, 'F');
    }
    doc.text(s.admissionNumber, cols[0], y + 4);
    doc.text(s.name.slice(0, 25), cols[1], y + 4);
    doc.text(s.grade, cols[2], y + 4);
    doc.text(s.gender, cols[3], y + 4);
    doc.text(s.parentPhone, cols[4], y + 4);
    doc.text(s.status, cols[5], y + 4);
    y += 8;
  }

  addFooter(doc);
  doc.save(`students-list-${Date.now()}.pdf`);
}

type LoadedImage = { dataUrl: string; format: 'PNG' | 'JPEG'; w: number; h: number };

async function loadImageAsDataUrl(
  src: string,
  opts?: {
    maxWidth?: number;
    maxHeight?: number;
    circular?: boolean;
    crossOrigin?: boolean;
    removeDarkBackground?: boolean;
  }
): Promise<LoadedImage | null> {
  const maxW = opts?.maxWidth ?? 200;
  const maxH = opts?.maxHeight ?? 200;
  try {
    const img = new Image();
    if (opts?.crossOrigin) img.crossOrigin = 'Anonymous';
    img.src = src;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
    });

    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const cw = Math.max(1, Math.round(img.width * scale));
    const ch = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (opts?.circular) {
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, Math.min(cw, ch) / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    ctx.drawImage(img, 0, 0, cw, ch);

    if (opts?.removeDarkBackground) {
      const imageData = ctx.getImageData(0, 0, cw, ch);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r < 45 && g < 45 && b < 45) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const usePng = opts?.removeDarkBackground || opts?.circular;
    return {
      dataUrl: usePng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92),
      format: usePng ? 'PNG' : 'JPEG',
      w: cw,
      h: ch,
    };
  } catch {
    return null;
  }
}

/** School logo for PDF headers — transparent background, full aspect ratio */
async function loadSchoolLogoForPdf(maxHeightMm: number, maxWidthMm: number): Promise<LoadedImage | null> {
  const pxPerMm = 12;
  return loadImageAsDataUrl('/school-logo.png', {
    maxWidth: Math.round(maxWidthMm * pxPerMm),
    maxHeight: Math.round(maxHeightMm * pxPerMm),
    removeDarkBackground: true,
  });
}

const MARGIN = 14;
const FOOTER_Y = 287;
const SLATE_50: [number, number, number] = [248, 250, 252];
const SLATE_100: [number, number, number] = [241, 245, 249];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_900: [number, number, number] = [15, 23, 42];

function displayValue(value?: string | null): string {
  const v = value?.trim();
  return v && v !== '-' ? v : '—';
}

function capitalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeColors(status: Student['status']): { fill: [number, number, number]; text: [number, number, number] } {
  switch (status) {
    case 'active':
      return { fill: [220, 252, 231], text: [22, 101, 52] };
    case 'graduated':
      return { fill: [219, 234, 254], text: [30, 64, 175] };
    case 'transferred':
      return { fill: [254, 243, 199], text: [180, 83, 9] };
    default:
      return { fill: [243, 244, 246], text: [75, 85, 99] };
  }
}

async function addProfilePdfHeader(doc: jsPDF, admissionNumber: string, pageLabel = 'Student Profile') {
  const w = doc.internal.pageSize.getWidth();
  const headerH = 34;
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, w, headerH, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, headerH, w, 1.5, 'F');

  const logoMaxH = 26;
  const logoMaxW = 24;
  const logo = await loadSchoolLogoForPdf(logoMaxH, logoMaxW);
  let textStartX = MARGIN + 4;
  if (logo) {
    const aspect = logo.w / logo.h;
    let drawH = logoMaxH;
    let drawW = drawH * aspect;
    if (drawW > logoMaxW) {
      drawW = logoMaxW;
      drawH = drawW / aspect;
    }
    const logoY = (headerH - drawH) / 2;
    doc.addImage(logo.dataUrl, logo.format, MARGIN, logoY, drawW, drawH);
    textStartX = MARGIN + drawW + 6;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(SCHOOL, textStartX, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(SCHOOL_SUB, textStartX, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(pageLabel, w - MARGIN, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Index No. ${admissionNumber}`, w - MARGIN, 17, { align: 'right' });
  doc.setFontSize(7);
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}`, w - MARGIN, 23, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function drawStatusBadge(doc: jsPDF, status: Student['status'], x: number, y: number) {
  const label = capitalizeStatus(status);
  const { fill, text } = statusBadgeColors(status);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const padX = 3;
  const badgeW = doc.getTextWidth(label) + padX * 2;
  const badgeH = 5.5;
  doc.setFillColor(...fill);
  doc.roundedRect(x, y - badgeH + 1.5, badgeW, badgeH, 1.5, 1.5, 'F');
  doc.setTextColor(...text);
  doc.text(label, x + padX, y);
  doc.setTextColor(0, 0, 0);
}

function drawContactChip(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number): number {
  doc.setFillColor(...SLATE_100);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, maxWidth, 9, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...SLATE_500);
  doc.text(label.toUpperCase(), x + 2.5, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_900);
  const lines = doc.splitTextToSize(value, maxWidth - 5);
  doc.text(lines.slice(0, 1), x + 2.5, y + 7);
  return x + maxWidth + 2;
}

function measureCardFields(
  doc: jsPDF,
  rows: [string, string][],
  startY: number,
  width: number,
  labelWidth = 34,
): number {
  const lineH = 4.6;
  doc.setFontSize(7.2);
  let y = startY;
  rows.forEach(([, val]) => {
    const lines = doc.splitTextToSize(val, width - labelWidth - 2);
    y += Math.max(lineH, lines.length * 3.5);
  });
  return y + 1;
}

function drawSectionWithFields(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  width: number,
  rows: [string, string][],
  labelWidth = 34,
): number {
  const headerH = 7;
  const contentX = x + 3;
  const contentY = y + headerH + 4;
  const contentWidth = width - 6;
  const contentEndY = measureCardFields(doc, rows, contentY, contentWidth, labelWidth);
  const bodyH = contentEndY - (y + 7) + 3;

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(x, y, width, headerH, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(title.toUpperCase(), x + 3, y + 4.8);
  doc.setTextColor(0, 0, 0);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y + headerH, width, bodyH, 0, 2, 'FD');

  let fieldY = contentY;
  const lineH = 4.6;
  doc.setFontSize(7.2);
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE_500);
    doc.text(label, contentX, fieldY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE_900);
    const lines = doc.splitTextToSize(val, contentWidth - labelWidth - 2);
    doc.text(lines, contentX + labelWidth, fieldY);
    fieldY += Math.max(lineH, lines.length * 3.5);
  });

  return contentEndY + 2;
}

function drawStudentHero(
  doc: jsPDF,
  student: Student,
  profileImg: LoadedImage | null,
  y: number,
): number {
  const w = doc.internal.pageSize.getWidth();
  const innerPad = 5;
  const photoSize = 34;
  const photoX = MARGIN + innerPad;
  const photoY = y + innerPad;
  const chipH = 9;
  const chipGap = 4;
  const chipY = photoY + photoSize + chipGap;
  const heroH = chipY - y + chipH + innerPad;

  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, w - MARGIN * 2, heroH, 3, 3, 'FD');

  if (profileImg) {
    doc.addImage(profileImg.dataUrl, profileImg.format, photoX, photoY, photoSize, photoSize);
  } else {
    doc.setFillColor(...PRIMARY);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    const initials = student.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 2.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  const infoX = photoX + photoSize + 8;
  const infoRight = w - MARGIN - innerPad;
  const infoWidth = infoRight - infoX - 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const statusLabel = capitalizeStatus(student.status);
  const badgeW = doc.getTextWidth(statusLabel) + 6;
  drawStatusBadge(doc, student.status, infoRight - badgeW, photoY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...SLATE_900);
  const nameLines = doc.splitTextToSize(student.name, infoWidth);
  doc.text(nameLines.slice(0, 2), infoX, photoY + 8);

  const metaY = photoY + 8 + Math.min(nameLines.length, 2) * 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_500);
  const meta = [
    student.nameWithInitials,
    student.grade,
    student.section ? formatClassSection(student.grade, student.section) : null,
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(doc.splitTextToSize(meta, infoWidth).slice(0, 2), infoX, metaY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY);
  doc.text(`#${student.admissionNumber}`, infoX, metaY + 7);

  const chipPad = innerPad;
  const chipW = (w - MARGIN * 2 - chipPad * 2 - 2) / 2;
  let chipX = MARGIN + chipPad;
  chipX = drawContactChip(doc, 'Telephone', displayValue(student.phone), chipX, chipY, chipW);
  drawContactChip(doc, 'WhatsApp', displayValue(student.whatsapp), chipX, chipY, chipW);

  return y + heroH + 6;
}

function drawExamResultsSection(doc: jsPDF, results: ExamResult[], startY: number): number {
  const w = doc.internal.pageSize.getWidth();
  let examY = startY;
  const cardW = w - MARGIN * 2;

  for (const r of results) {
    const estimatedH = 18 + r.subjects.length * 5;
    if (examY + estimatedH > FOOTER_Y - 10) return examY;

    doc.setFillColor(...SLATE_100);
    doc.roundedRect(MARGIN, examY, cardW, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_900);
    doc.text(`${r.examName} — ${r.term} ${r.year}`, MARGIN + 3, examY + 5.2);
    doc.setTextColor(...PRIMARY);
    doc.text(`${r.percentage.toFixed(1)}%`, w - MARGIN - 3, examY + 5.2, { align: 'right' });
    examY += 10;

    const summary = [
      `Total ${r.totalObtainedMarks}/${r.totalMaxMarks}`,
      r.rank ? `Rank #${r.rank}` : null,
      `Grade ${r.grade}`,
    ]
      .filter(Boolean)
      .join('  ·  ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE_500);
    doc.text(summary, MARGIN + 3, examY);
    examY += 5;

    const rc = [MARGIN + 2, MARGIN + 78, MARGIN + 118, MARGIN + 148, MARGIN + 168];
    doc.setFillColor(...PRIMARY);
    doc.rect(MARGIN, examY, cardW, 5.5, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    ['Subject', 'Obtained', 'Max', 'Grade', '%'].forEach((h, i) => doc.text(h, rc[i], examY + 3.8));
    examY += 6.5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE_900);
    r.subjects.forEach((s, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(MARGIN, examY - 0.5, cardW, 5.2, 'F');
      }
      const absent = isSubjectAbsent(s);
      const pct = subjectPercentage(s);
      doc.text(displaySubjectLabel(s.subject).slice(0, 32), rc[0], examY + 3.2);
      if (absent) doc.setTextColor(180, 83, 9);
      doc.text(absent ? 'AB' : String(s.obtainedMarks), rc[1], examY + 3.2);
      doc.setTextColor(0, 0, 0);
      doc.text(String(s.maxMarks), rc[2], examY + 3.2);
      doc.setFont('helvetica', 'bold');
      if (absent) doc.setTextColor(180, 83, 9);
      doc.text(absent ? 'AB' : s.grade, rc[3], examY + 3.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(absent ? 180 : 100, absent ? 83 : 100, absent ? 9 : 100);
      doc.text(absent ? 'AB' : `${pct.toFixed(1)}%`, rc[4], examY + 3.2);
      doc.setTextColor(0, 0, 0);
      examY += 5.2;
    });
    examY += 4;
  }

  return examY;
}

export async function exportStudentProfilePDF(student: Student, results: ExamResult[]) {
  const JsPdf = await getJsPdfCtor();
  const doc = new JsPdf({ format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  await addProfilePdfHeader(doc, student.admissionNumber);

  const profileUrl = resolveProfileImageUrl(student.profileImageUrl);
  const profileImg = profileUrl
    ? await loadImageAsDataUrl(profileUrl, { maxWidth: 240, maxHeight: 240, circular: true, crossOrigin: true })
    : null;

  let y = drawStudentHero(doc, student, profileImg, 40);

  const colGap = 6;
  const colW = (w - MARGIN * 2 - colGap) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + colGap;
  const isAL = isAdvancedLevelGrade(student.grade);
  const subjectLabel = isAL ? 'A/L subjects' : 'Aesthetic studies';
  const age = student.dateOfBirth ? `${calculateAge(student.dateOfBirth)} years` : '—';

  const personalEndY = drawSectionWithFields(doc, 'Personal details', leftX, y, colW, [
    ['Full name', displayValue(student.name)],
    ['Name with initials', displayValue(student.nameWithInitials)],
    ['NIC', displayValue(formatIdentityNumber(student.nic))],
    ['Date of birth', `${formatDate(student.dateOfBirth)} (${age})`],
    ['Gender', capitalizeStatus(student.gender)],
    ['Blood group', displayValue(student.bloodGroup)],
    ['Nationality', displayValue(student.nationality)],
    ['Religion', displayValue(student.religion)],
  ], 36);

  const academicEndY = drawSectionWithFields(doc, 'Academic details', rightX, y, colW, [
    ['Grade', displayValue(student.grade)],
    [getClassFieldLabel(student.grade), student.section ? formatClassSection(student.grade, student.section) : '—'],
    ['Admission date', formatDate(student.admissionDate)],
    ['Previous schools', displayValue(student.previousSchools)],
    ['Medium of study', displayValue(student.mediumOfStudy)],
    [subjectLabel, displayValue(student.aestheticsSubject)],
    ['Enrollment status', capitalizeStatus(student.status)],
    ['Form submitted', displayValue(student.formSubmittedAt)],
    ['Notes', displayValue(student.notes)],
  ], 36);

  y = Math.max(personalEndY, academicEndY) + 4;

  const parentEndY = drawSectionWithFields(doc, 'Parent / guardian', leftX, y, colW, [
    ['Name', displayValue(student.parentName)],
    ['Contact number', displayValue(student.parentPhone)],
  ], 36);

  const familyEndY = drawSectionWithFields(doc, 'Family & health', rightX, y, colW, [
    ['Siblings', displayValue(student.siblings)],
    ['Sibling grades', displayValue(student.siblingGrades)],
    ['Special disabilities', displayValue(student.specialDisabilities)],
  ], 36);

  y = Math.max(parentEndY, familyEndY) + 4;

  y = drawSectionWithFields(doc, 'Record information', MARGIN, y, w - MARGIN * 2, [
    ['Index number', displayValue(student.admissionNumber)],
    ['Last updated', formatTimestamp(student.updatedAt)],
    ['Record created', formatTimestamp(student.createdAt)],
    ['Profile image', student.profileImageUrl ? 'On file' : 'Not provided'],
  ], 36) + 4;

  if (results.length > 0) {
    if (y > FOOTER_Y - 50) {
      addFooter(doc);
      doc.addPage();
      await addProfilePdfHeader(doc, student.admissionNumber, 'Exam Results');
      y = 40;
    }

    const examHeaderH = 7;
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(MARGIN, y, w - MARGIN * 2, examHeaderH, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`EXAMINATION RESULTS (${results.length})`, MARGIN + 3, y + 4.8);
    doc.setTextColor(0, 0, 0);
    y = drawExamResultsSection(doc, results, y + examHeaderH + 4);
  }

  addFooter(doc);
  doc.save(`student-${student.admissionNumber}-${Date.now()}.pdf`);
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export async function exportStaffPDF(staff: Staff[]) {
  const JsPdf = await getJsPdfCtor();
  const doc = new JsPdf({ format: 'a4', orientation: 'landscape' });
  const w = doc.internal.pageSize.getWidth();
  let y = await addHeader(doc, 'Staff Directory', `Total: ${staff.length} staff members`);

  const cols = [14, 50, 105, 145, 175, 210, 240];
  const headers = ['Staff ID', 'Name', 'Type', 'Designation', 'Phone', 'Joined', 'Status'];

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, w - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, cols[i], y + 5.5));
  y += 10;

  doc.setFont('helvetica', 'normal');
  for (let idx = 0; idx < staff.length; idx++) {
    const s = staff[idx];
    if (y > 185) { 
      addFooter(doc); 
      doc.addPage(); 
      y = await addHeader(doc, 'Staff Directory (continued)'); 
    }
    if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 1, w - 28, 8, 'F'); }
    doc.text(s.staffId, cols[0], y + 4);
    doc.text(s.name.slice(0, 28), cols[1], y + 4);
    doc.text(s.staffType, cols[2], y + 4);
    doc.text(s.designation.slice(0, 20), cols[3], y + 4);
    doc.text(s.phone, cols[4], y + 4);
    doc.text(formatDate(s.joinedDate), cols[5], y + 4);
    doc.text(s.status, cols[6], y + 4);
    y += 8;
  }

  addFooter(doc);
  doc.save(`staff-directory-${Date.now()}.pdf`);
}

export async function exportStaffProfilePDF(staff: Staff) {
  const JsPdf = await getJsPdfCtor();
  const doc = new JsPdf({ format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = await addHeader(doc, 'Staff Profile', staff.staffId);

  doc.setFillColor(...PRIMARY);
  doc.circle(w / 2, y + 14, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const initials = staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  doc.text(initials, w / 2, y + 18, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 32;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(staff.name, w / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${staff.designation} · ${staff.staffType === 'academic' ? 'Academic' : 'Non-Academic'} · ${staff.status.toUpperCase()}`, w / 2, y, { align: 'center' });
  y += 12;
  doc.setTextColor(0, 0, 0);

  const rows: [string, string][] = [
    ['Staff ID', staff.staffId],
    ['NIC', formatIdentityNumber(staff.nic)],
    ['Date of Birth', formatDate(staff.dateOfBirth)],
    ['Gender', staff.gender],
    ['Designation', staff.designation],
    ['Staff Type', staff.staffType === 'academic' ? 'Academic' : 'Non-Academic'],
    ['Department', staff.department || '-'],
    ['Subjects', staff.subjects?.join(', ') || '-'],
    ['Qualification', staff.qualification || '-'],
    ['Joined Date', formatDate(staff.joinedDate)],
    ['Status', staff.status],
    ['Phone', staff.phone],
    ['Email', staff.email],
    ['Address', staff.address],
  ];

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(14, y, w - 28, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Staff Details', 17, y + 5);
  doc.setTextColor(0, 0, 0);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  rows.forEach(([label, val]) => {
    if (!val || val === '-') return;
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 17, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val.slice(0, 80), 80, y);
    y += 6;
  });

  if (staff.notes) {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 17, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(staff.notes, w - 31);
    doc.text(lines, 17, y);
  }

  addFooter(doc);
  doc.save(`staff-${staff.staffId}-${Date.now()}.pdf`);
}

/** Teacher-visible staff fields only. */
export async function exportStaffProfilePDFLimited(staff: Staff) {
  const JsPdf = await getJsPdfCtor();
  const doc = new JsPdf({ format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = await addHeader(doc, 'Staff Contact', staff.name);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(staff.name, w / 2, y, { align: 'center' });
  y += 10;

  const rows: [string, string][] = [
    ['Full name', staff.name],
    ['Name with initials', staff.nameWithInitials || '—'],
    ['Class and grade', staff.classAndGrade || '—'],
    ['Telephone number', staff.phone || '—'],
    ['WhatsApp number', staff.whatsapp || '—'],
    ['Email address', staff.email || '—'],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 17, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val.slice(0, 90), 70, y);
    y += 7;
  });

  addFooter(doc);
  doc.save(`staff-contact-${Date.now()}.pdf`);
}

export async function exportStaffPDFLimited(staff: Staff[]) {
  const JsPdf = await getJsPdfCtor();
  const doc = new JsPdf({ format: 'a4', orientation: 'landscape' });
  const w = doc.internal.pageSize.getWidth();
  let y = await addHeader(doc, 'Staff Contact Directory', `Total: ${staff.length}`);

  const cols = [14, 52, 95, 130, 168, 205, 250];
  const headers = ['Full name', 'Initials', 'Class & grade', 'Telephone', 'WhatsApp', 'Email'];

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, w - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, cols[i], y + 5.5));
  y += 10;

  doc.setFont('helvetica', 'normal');
  for (let idx = 0; idx < staff.length; idx++) {
    const s = staff[idx];
    if (y > 185) {
      addFooter(doc);
      doc.addPage();
      y = await addHeader(doc, 'Staff Contact Directory (continued)');
    }
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y - 1, w - 28, 8, 'F');
    }
    doc.text(s.name.slice(0, 22), cols[0], y + 4);
    doc.text((s.nameWithInitials || '—').slice(0, 18), cols[1], y + 4);
    doc.text((s.classAndGrade || '—').slice(0, 16), cols[2], y + 4);
    doc.text(s.phone || '—', cols[3], y + 4);
    doc.text(s.whatsapp || '—', cols[4], y + 4);
    doc.text((s.email || '—').slice(0, 28), cols[5], y + 4);
    y += 8;
  }

  addFooter(doc);
  doc.save(`staff-contact-directory-${Date.now()}.pdf`);
}

// ─── Examination Reports ──────────────────────────────────────────────────────

type ExamReportRow = ExamResult & { computedRank: number };

type ExamReportTableLayout = {
  colWidths: number[];
  colXs: number[];
  headers: string[];
  fontSize: number;
  lineHeight: number;
  cellPad: number;
  rowPad: number;
};

function sanitizeExamPdfText(text: string): string {
  return text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

type ExamSubjectStat = {
  subject: string;
  count: number;
  absent: number;
  avg: number;
  high: number;
  low: number;
};

type ExamAbsentEntry = {
  admissionNumber: string;
  studentName: string;
  subject: string;
};

function computeGradeDistribution(rows: ExamReportRow[]): Record<ExamLetterGrade, number> {
  const counts: Record<ExamLetterGrade, number> = { A: 0, B: 0, C: 0, S: 0, F: 0 };
  for (const row of rows) {
    const grade = getResultLetterGrade(row.percentage, row.subjects);
    counts[grade] += 1;
  }
  return counts;
}

function computeSubjectStats(rows: ExamReportRow[], subjects: string[]): ExamSubjectStat[] {
  return subjects.map((subject) => {
    const pcts: number[] = [];
    let absent = 0;
    for (const row of rows) {
      const mark = getSubjectMark(row, subject);
      if (!mark) continue;
      if (isSubjectAbsent(mark)) {
        absent += 1;
        continue;
      }
      pcts.push(subjectPercentage(mark));
    }
    if (!pcts.length) {
      return { subject, count: 0, absent, avg: 0, high: 0, low: 0 };
    }
    return {
      subject,
      count: pcts.length,
      absent,
      avg: pcts.reduce((sum, v) => sum + v, 0) / pcts.length,
      high: Math.max(...pcts),
      low: Math.min(...pcts),
    };
  });
}

function collectAbsentEntries(rows: ExamReportRow[], subjects: string[]): ExamAbsentEntry[] {
  const entries: ExamAbsentEntry[] = [];
  for (const row of rows) {
    for (const subject of subjects) {
      const mark = getSubjectMark(row, subject);
      if (mark && isSubjectAbsent(mark)) {
        entries.push({
          admissionNumber: row.admissionNumber,
          studentName: row.studentName,
          subject,
        });
      }
    }
  }
  return entries.sort((a, b) => {
    const byName = a.studentName.localeCompare(b.studentName);
    return byName !== 0 ? byName : a.subject.localeCompare(b.subject);
  });
}

function finalizeExamPdfFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, h - 14, w - MARGIN, h - 14);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const stamp = `Generated on ${new Date().toLocaleString('en-GB')} · ${SCHOOL}`;
    const pageLabel = total > 1 ? `Page ${page} of ${total}` : '';
    doc.text([stamp, pageLabel].filter(Boolean).join(' · '), w / 2, h - 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
}

function drawExamReportSummaryPanel(
  doc: jsPDF,
  y: number,
  exam: Examination,
  rows: ExamReportRow[],
  subjects: string[],
  tableWidth: number,
): number {
  const gradeDist = computeGradeDistribution(rows);
  const avgPercent = rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length;
  const passed = rows.filter((r) => getResultLetterGrade(r.percentage, r.subjects) !== 'F').length;
  const totalAbsent = rows.reduce(
    (sum, row) => sum + row.subjects.filter((sub) => isSubjectAbsent(sub)).length,
    0,
  );
  const top = rows[0];
  const classGrade = getLetterGrade(avgPercent);
  const panelHeight = totalAbsent > 0 ? 26 : 22;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, y, tableWidth, panelHeight, 2, 2, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('Examination summary', MARGIN + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const meta = [
    exam.examDate ? `Date: ${formatDate(exam.examDate)}` : null,
    exam.description ? exam.description : null,
    `${subjects.length} subject column${subjects.length !== 1 ? 's' : ''}`,
    `Class grade: ${classGrade}`,
    `Highest: ${top.percentage.toFixed(1)}% (${top.studentName})`,
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(doc.splitTextToSize(meta, tableWidth - 6), MARGIN + 3, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(
    `Students ${rows.length}  |  Pass ${passed} (${Math.round((passed / rows.length) * 100)}%)  |  Average ${avgPercent.toFixed(1)}%  |  AB ${totalAbsent}  |  Any subject below ${SUBJECT_FAIL_PERCENT}% or AB = Grade F`,
    MARGIN + 3,
    y + 15.5,
  );

  const gradeLine = (['A', 'B', 'C', 'S', 'F'] as ExamLetterGrade[])
    .map((g) => `${g}: ${gradeDist[g]}`)
    .join('   ');
  doc.setFont('helvetica', 'normal');
  doc.text(`Grade distribution: ${gradeLine}`, MARGIN + 3, y + 20);
  if (totalAbsent > 0) {
    doc.setTextColor(180, 83, 9);
    doc.text('AB = Absent (did not appear for subject)', MARGIN + 3, y + 24.5);
    doc.setTextColor(0, 0, 0);
  }

  doc.setTextColor(0, 0, 0);
  return y + panelHeight + 4;
}

function drawExamReportSubjectStats(
  doc: jsPDF,
  y: number,
  stats: ExamSubjectStat[],
  tableWidth: number,
): number {
  if (!stats.some((s) => s.count > 0)) return y;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('Subject analysis', MARGIN, y + 4);
  y += 7;

  const cols = [MARGIN, MARGIN + 48, MARGIN + 60, MARGIN + 72, MARGIN + 88, MARGIN + 104, MARGIN + 120];
  const headers = ['Subject', 'Sat', 'AB', 'Avg %', 'High', 'Low'];

  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y, tableWidth, 6, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, cols[i], y + 4.2));
  y += 7;

  doc.setFont('helvetica', 'normal');
  for (const stat of stats) {
    if (!stat.count && !stat.absent) continue;
    doc.text(displaySubjectLabel(stat.subject), cols[0], y + 3.5);
    doc.text(String(stat.count), cols[1], y + 3.5);
    if (stat.absent > 0) doc.setTextColor(180, 83, 9);
    doc.text(String(stat.absent), cols[2], y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text(stat.count ? stat.avg.toFixed(1) : '—', cols[3], y + 3.5);
    doc.text(stat.count ? stat.high.toFixed(1) : '—', cols[4], y + 3.5);
    doc.text(stat.count ? stat.low.toFixed(1) : '—', cols[5], y + 3.5);
    y += 5.5;
  }

  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  const scale = EXAM_GRADING_SCALE.map((s) => `${s.grade} ${s.min}-${Math.floor(s.max)}%`).join('  ·  ');
  doc.text(`Grading scale: ${scale}`, MARGIN, y + 4);
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

function drawExamReportAbsences(
  doc: jsPDF,
  y: number,
  entries: ExamAbsentEntry[],
  tableWidth: number,
): number {
  if (!entries.length) return y;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text(`Absences (AB) — ${entries.length} subject entr${entries.length === 1 ? 'y' : 'ies'}`, MARGIN, y + 4);
  y += 7;

  const cols = [MARGIN, MARGIN + 24, MARGIN + 52, MARGIN + 120];
  const headers = ['Adm. No.', 'Name', 'Subject'];

  doc.setFillColor(255, 251, 235);
  doc.rect(MARGIN, y, tableWidth, 6, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, cols[i], y + 4.2));
  y += 7;

  doc.setFont('helvetica', 'normal');
  for (const entry of entries) {
    doc.setTextColor(0, 0, 0);
    doc.text(entry.admissionNumber, cols[0], y + 3.5);
    const nameLines = doc.splitTextToSize(sanitizeExamPdfText(entry.studentName), cols[2] - cols[1] - 2);
    nameLines.forEach((line: string, lineIdx: number) => doc.text(line, cols[1], y + 3.5 + lineIdx * 3.2));
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.text(displaySubjectLabel(entry.subject), cols[3], y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    y += Math.max(5.5, nameLines.length * 3.2 + 2);
  }

  return y + 4;
}

async function drawExamReportSignatures(doc: jsPDF, y: number, tableWidth: number): Promise<number> {
  const h = doc.internal.pageSize.getHeight();
  if (y > h - 36) {
    doc.addPage();
    y = await addHeader(doc, 'Exam Report (continued)');
  }

  y += 8;
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.3);
  const sigW = (tableWidth - 12) / 2;
  doc.line(MARGIN, y + 10, MARGIN + sigW, y + 10);
  doc.line(MARGIN + sigW + 12, y + 10, MARGIN + tableWidth, y + 10);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Class teacher', MARGIN, y + 14);
  doc.text('Principal', MARGIN + sigW + 12, y + 14);
  doc.setTextColor(0, 0, 0);
  return y + 18;
}

function fitExamColumnWidths(ideals: number[], mins: number[], tableWidth: number): number[] {
  const sum = ideals.reduce((a, b) => a + b, 0);
  if (sum <= tableWidth) {
    const extra = tableWidth - sum;
    const flex = ideals.map((ideal, i) => Math.max(0, ideal - mins[i]));
    const flexSum = flex.reduce((a, b) => a + b, 0) || 1;
    return ideals.map((ideal, i) => ideal + (flex[i] / flexSum) * extra);
  }
  const minSum = mins.reduce((a, b) => a + b, 0);
  const flex = ideals.map((ideal, i) => Math.max(0, ideal - mins[i]));
  const flexSum = flex.reduce((a, b) => a + b, 0);
  if (flexSum <= 0 || minSum >= tableWidth) {
    return mins.map((m) => (m / minSum) * tableWidth);
  }
  const shrink = sum - tableWidth;
  return ideals.map((ideal, i) => Math.max(mins[i], ideal - (flex[i] / flexSum) * shrink));
}

function buildExamReportTableLayout(
  doc: jsPDF,
  subjects: string[],
  rows: ExamReportRow[],
  tableWidth: number,
): ExamReportTableLayout {
  const fontSize = subjects.length > 6 ? 6.5 : 7;
  const lineHeight = 3.2;
  const cellPad = 1.2;
  const rowPad = 1.5;
  doc.setFontSize(fontSize);

  const subjectLabels = subjects.map(displaySubjectLabel);
  const headers = ['Rank', 'Adm. No.', 'Name', ...subjectLabels, 'Total', '%', 'Grade'];
  const nameIdx = 2;
  const subjectStart = 3;
  const totalIdx = subjectStart + subjects.length;
  const pctIdx = totalIdx + 1;
  const gradeIdx = pctIdx + 1;

  const mins = headers.map((label, i) => {
    doc.setFont('helvetica', 'bold');
    const headerW = doc.getTextWidth(sanitizeExamPdfText(label)) + cellPad * 2;
    doc.setFont('helvetica', 'normal');
    if (i === nameIdx) return Math.max(headerW, tableWidth * 0.14);
    if (i === 0 || i === gradeIdx) return Math.max(headerW, 10);
    if (i === 1) return Math.max(headerW, 16);
    if (i === totalIdx || i === pctIdx) return Math.max(headerW, 12);
    return Math.max(headerW, 14);
  });

  const ideals = mins.map((min, i) => {
    let maxW = min;
    if (i === nameIdx) {
      for (const row of rows) {
        const name = sanitizeExamPdfText(row.studentName);
        const lines = doc.splitTextToSize(name, Math.max(20, tableWidth * 0.22));
        for (const line of lines) {
          maxW = Math.max(maxW, doc.getTextWidth(line) + cellPad * 2);
        }
      }
      return Math.min(maxW, tableWidth * 0.24);
    }
    for (const row of rows) {
      let val = '';
      if (i === 0) val = String(row.computedRank);
      else if (i === 1) val = row.admissionNumber;
      else if (i === totalIdx) val = `${row.totalObtainedMarks}/${row.totalMaxMarks}`;
      else if (i === pctIdx) val = `${row.percentage.toFixed(1)}%`;
      else if (i === gradeIdx) val = getResultLetterGrade(row.percentage, row.subjects);
      else {
        const subject = subjects[i - subjectStart];
        const sub = getSubjectMark(row, subject);
        val = formatSubjectMarkWithGrade(sub);
      }
      maxW = Math.max(maxW, doc.getTextWidth(sanitizeExamPdfText(val)) + cellPad * 2);
    }
    return maxW;
  });

  const colWidths = fitExamColumnWidths(ideals, mins, tableWidth);
  const colXs: number[] = [];
  let x = MARGIN;
  for (const width of colWidths) {
    colXs.push(x);
    x += width;
  }

  return { colWidths, colXs, headers, fontSize, lineHeight, cellPad, rowPad };
}

function splitExamCellLines(doc: jsPDF, text: string, width: number, layout: ExamReportTableLayout): string[] {
  const safe = sanitizeExamPdfText(text);
  if (!safe) return [''];
  const inner = Math.max(6, width - layout.cellPad * 2);
  return doc.splitTextToSize(safe, inner);
}

function measureExamReportRow(
  doc: jsPDF,
  row: ExamReportRow,
  subjects: string[],
  layout: ExamReportTableLayout,
): number {
  doc.setFontSize(layout.fontSize);
  const nameLines = splitExamCellLines(doc, row.studentName, layout.colWidths[2], layout).length;
  return Math.max(7, nameLines * layout.lineHeight + layout.rowPad * 2);
}

function drawExamReportTableHeader(doc: jsPDF, y: number, layout: ExamReportTableLayout, tableWidth: number): number {
  doc.setFontSize(layout.fontSize);
  doc.setFont('helvetica', 'bold');
  const headerLines = layout.headers.map((h, i) =>
    splitExamCellLines(doc, h, layout.colWidths[i], layout),
  );
  const headerHeight = Math.max(
    8,
    Math.max(...headerLines.map((lines) => lines.length)) * layout.lineHeight + layout.rowPad * 2,
  );

  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y, tableWidth, headerHeight, 'F');
  doc.setTextColor(0, 0, 0);

  layout.headers.forEach((_, i) => {
    headerLines[i].forEach((line, lineIdx) => {
      doc.text(
        line,
        layout.colXs[i] + layout.cellPad,
        y + layout.rowPad + layout.lineHeight + lineIdx * layout.lineHeight,
      );
    });
  });

  doc.setFont('helvetica', 'normal');
  return y + headerHeight;
}

function drawExamReportTableRow(
  doc: jsPDF,
  row: ExamReportRow,
  subjects: string[],
  layout: ExamReportTableLayout,
  y: number,
  tableWidth: number,
  stripe: boolean,
): number {
  doc.setFontSize(layout.fontSize);
  const rowHeight = measureExamReportRow(doc, row, subjects, layout);
  const subjectStart = 3;
  const totalIdx = subjectStart + subjects.length;
  const pctIdx = totalIdx + 1;
  const gradeIdx = pctIdx + 1;
  const overallGrade = getResultLetterGrade(row.percentage, row.subjects);

  if (stripe) {
    doc.setFillColor(249, 250, 251);
    doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');
  }

  const values = [
    String(row.computedRank),
    row.admissionNumber,
    row.studentName,
    ...subjects.map((subject) => {
      const match = getSubjectMark(row, subject);
      return formatSubjectMarkWithGrade(match);
    }),
    `${row.totalObtainedMarks}/${row.totalMaxMarks}`,
    `${row.percentage.toFixed(1)}%`,
    overallGrade,
  ];

  values.forEach((val, i) => {
    const subjectKey = i >= subjectStart && i < totalIdx ? subjects[i - subjectStart] : undefined;
    const sub = subjectKey ? getSubjectMark(row, subjectKey) : undefined;
    const absent = sub ? isSubjectAbsent(sub) : false;
    const failed = sub ? isSubjectAbsent(sub) || subjectPercentage(sub) < SUBJECT_FAIL_PERCENT : false;

    if (i === gradeIdx) {
      if (overallGrade === 'F') doc.setTextColor(220, 38, 38);
      else if (overallGrade === 'A') doc.setTextColor(22, 163, 74);
      else doc.setTextColor(0, 0, 0);
    } else if (absent) {
      doc.setTextColor(180, 83, 9);
    } else if (failed) {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    const lines = splitExamCellLines(doc, val, layout.colWidths[i], layout);
    lines.forEach((line, lineIdx) => {
      doc.text(
        line,
        layout.colXs[i] + layout.cellPad,
        y + layout.rowPad + layout.lineHeight + lineIdx * layout.lineHeight,
      );
    });
  });

  doc.setTextColor(0, 0, 0);
  return y + rowHeight;
}

export async function exportExamReportPDF(exam: Examination, results: ExamResult[]) {
  const JsPdf = await getJsPdfCtor();
  const doc = new JsPdf({ format: 'a4', orientation: 'landscape' });
  const w = doc.internal.pageSize.getWidth();
  const tableWidth = w - MARGIN * 2;
  const pageBottom = 192;
  const streamLabel = exam.section ? formatClassSection(exam.grade, exam.section) : '';
  const subtitle = [exam.term, String(exam.year), exam.grade, streamLabel].filter(Boolean).join(' · ');
  let y = await addHeader(doc, `Examination Report: ${exam.examName}`, subtitle);

  if (results.length === 0) {
    doc.setFontSize(9);
    doc.text('No results found for this examination.', MARGIN, y);
    addFooter(doc);
    doc.save(`exam-report-${Date.now()}.pdf`);
    return;
  }

  const gradeSubjects = getSubjectsForExamination(exam.grade, exam.section);
  const subjects = buildSubjectColumns(results, gradeSubjects);
  const rankMap = computeExamRanks(
    results.map((r) => ({ studentId: r.studentId, percentage: r.percentage })),
  );
  const sorted: ExamReportRow[] = [...results]
    .sort((a, b) => b.percentage - a.percentage)
    .map((r) => ({ ...r, computedRank: rankMap.get(r.studentId) ?? 0 }));

  const subjectStats = computeSubjectStats(sorted, subjects);
  const absentEntries = collectAbsentEntries(sorted, subjects);
  y = drawExamReportSummaryPanel(doc, y, exam, sorted, subjects, tableWidth);
  y = drawExamReportSubjectStats(doc, y, subjectStats, tableWidth);
  y = drawExamReportAbsences(doc, y, absentEntries, tableWidth);
  y += 2;

  const layout = buildExamReportTableLayout(doc, subjects, sorted, tableWidth);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('Student results', MARGIN, y + 4);
  doc.setTextColor(0, 0, 0);
  y += 7;
  y = drawExamReportTableHeader(doc, y, layout, tableWidth);

  for (let idx = 0; idx < sorted.length; idx++) {
    const rowHeight = measureExamReportRow(doc, sorted[idx], subjects, layout);
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = await addHeader(doc, 'Exam Report (continued)');
      y = drawExamReportTableHeader(doc, y, layout, tableWidth);
    }
    y = drawExamReportTableRow(doc, sorted[idx], subjects, layout, y, tableWidth, idx % 2 === 0);
  }

  y = await drawExamReportSignatures(doc, y, tableWidth);
  finalizeExamPdfFooters(doc);
  doc.save(`exam-${exam.examName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

export async function exportStudentReportCardPDF(
  result: ExamResult,
  exam: Examination,
  profileImageUrl?: string | null,
) {
  const JsPdf = await getJsPdfCtor();
  const doc = new JsPdf({ format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  let y = await addHeader(doc, 'Report Card', `${exam.examName} · ${exam.term} ${exam.year}`);

  const profileUrl = resolveProfileImageUrl(profileImageUrl ?? undefined);
  const profileImg = profileUrl
    ? await loadImageAsDataUrl(profileUrl, { maxWidth: 240, maxHeight: 240, circular: true, crossOrigin: true })
    : null;

  const bannerH = 32;
  const photoSize = 24;
  const photoX = 18;
  const photoY = y + 4;
  const textX = photoX + photoSize + 7;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, w - 28, bannerH, 3, 3, 'F');

  if (profileImg) {
    doc.addImage(profileImg.dataUrl, profileImg.format, photoX, photoY, photoSize, photoSize);
  } else {
    doc.setFillColor(...PRIMARY);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const initials = result.studentName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 1.8, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(result.studentName, textX, y + 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Admission No: ${result.admissionNumber}`, textX, y + 18);
  doc.text(`Grade: ${result.grade}`, textX, y + 24);
  const overallGrade = getResultLetterGrade(result.percentage, result.subjects);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...PRIMARY);
  doc.text(`${result.percentage.toFixed(1)}%`, w - 20, y + 14, { align: 'right' });
  doc.setFontSize(14);
  if (overallGrade === 'F') doc.setTextColor(220, 38, 38);
  else if (overallGrade === 'A') doc.setTextColor(22, 163, 74);
  else doc.setTextColor(...PRIMARY);
  doc.text(`Grade ${overallGrade}`, w - 20, y + 22, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (result.rank) doc.text(`Rank #${result.rank}`, w - 20, y + 28, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += bannerH + 2;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, w - 28, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  ['Subject', 'Marks Obtained', 'Max Marks', 'Grade', '%'].forEach((h, i) => {
    doc.text(h, [14, 80, 120, 150, 165][i], y + 5.5);
  });
  y += 9;
  doc.setFont('helvetica', 'normal');
  result.subjects.forEach((s, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 1, w - 28, 8, 'F'); }
    const absent = isSubjectAbsent(s);
    const pct = subjectPercentage(s);
    const failed = isSubjectAbsent(s) || subjectPercentage(s) < SUBJECT_FAIL_PERCENT;
    doc.setTextColor(0, 0, 0);
    doc.text(displaySubjectLabel(s.subject), 14, y + 4);
    if (absent) doc.setTextColor(180, 83, 9);
    else if (failed) doc.setTextColor(220, 38, 38);
    doc.text(absent ? 'AB' : String(s.obtainedMarks), 80, y + 4);
    doc.setTextColor(0, 0, 0);
    doc.text(String(s.maxMarks), 120, y + 4);
    doc.setFont('helvetica', 'bold');
    if (absent) doc.setTextColor(180, 83, 9);
    else if (failed) doc.setTextColor(220, 38, 38);
    else doc.setTextColor(0, 0, 0);
    doc.text(absent ? 'AB' : s.grade, 150, y + 4);
    doc.setFont('helvetica', 'normal');
    if (absent) doc.setTextColor(180, 83, 9);
    else doc.setTextColor(failed ? 220 : 100, failed ? 38 : 100, failed ? 38 : 100);
    doc.text(absent ? 'AB' : `${pct.toFixed(1)}%`, 165, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 8;
  });

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(14, y, w - 28, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${result.totalObtainedMarks} / ${result.totalMaxMarks}  (${result.percentage.toFixed(1)}%)`, 17, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;

  if (result.remarks) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(`Remarks: ${result.remarks}`, 14, y);
  }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, h - 35, w - 14, h - 35);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text("Class Teacher's Signature: ____________________", 14, h - 25);
  doc.text("Principal's Signature: ____________________", w - 14, h - 25, { align: 'right' });
  doc.text('School Stamp:', 14, h - 15);

  addFooter(doc);
  doc.save(`report-card-${result.admissionNumber}-${Date.now()}.pdf`);
}
