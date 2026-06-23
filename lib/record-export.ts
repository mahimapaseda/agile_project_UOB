import type jsPDF from 'jspdf';
import type { Staff, Student } from '@/types';
import type { ExportColumn } from '@/lib/record-export-fields';
import {
  buildStaffPdfColumns,
  orderStaffCsvColumns,
  orderStudentCsvColumns,
  orderStudentPdfColumns,
} from '@/lib/record-export-fields';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRecordsCSV<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filePrefix: string,
) {
  if (!columns.length) return;
  const exportColumns =
    filePrefix === 'students-list'
      ? (orderStudentCsvColumns(columns as ExportColumn<Student>[]) as ExportColumn<T>[])
      : filePrefix === 'staff-directory'
        ? (orderStaffCsvColumns(columns as ExportColumn<Staff>[]) as ExportColumn<T>[])
        : columns;
  const header = exportColumns.map((c) => escapeCsv(c.label)).join(',');
  const body = rows
    .map((row) => exportColumns.map((col) => escapeCsv(col.getValue(row))).join(','))
    .join('\r\n');
  const csv = `\uFEFF${header}\r\n${body}`;
  downloadBlob(`${filePrefix}-${Date.now()}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

const SCHOOL = 'Delta Gemunupura College';
const PDF_MARGIN = 10;
const PORTRAIT_MAX_COLUMNS = 6;
const HEADER_GOLD: [number, number, number] = [245, 158, 11];

type LoadedImage = { dataUrl: string; format: 'PNG' | 'JPEG'; w: number; h: number };

let cachedSchoolLogo: LoadedImage | null | undefined;

async function loadImageAsDataUrl(
  src: string,
  opts?: { maxWidth?: number; maxHeight?: number; removeDarkBackground?: boolean },
): Promise<LoadedImage | null> {
  const maxW = opts?.maxWidth ?? 200;
  const maxH = opts?.maxHeight ?? 200;
  try {
    const img = new Image();
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

    ctx.drawImage(img, 0, 0, cw, ch);

    if (opts?.removeDarkBackground) {
      const imageData = ctx.getImageData(0, 0, cw, ch);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 45 && data[i + 1] < 45 && data[i + 2] < 45) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const usePng = opts?.removeDarkBackground;
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

async function getSchoolLogoForPdf(maxHeightMm: number, maxWidthMm: number): Promise<LoadedImage | null> {
  if (cachedSchoolLogo !== undefined) return cachedSchoolLogo;
  const pxPerMm = 12;
  cachedSchoolLogo = await loadImageAsDataUrl('/school-logo.png', {
    maxWidth: Math.round(maxWidthMm * pxPerMm),
    maxHeight: Math.round(maxHeightMm * pxPerMm),
    removeDarkBackground: true,
  });
  return cachedSchoolLogo;
}

type PdfTableMetrics = {
  fontSize: number;
  lineHeight: number;
  cellPad: number;
  rowPad: number;
};

const DEFAULT_METRICS: PdfTableMetrics = {
  fontSize: 7,
  lineHeight: 3.6,
  cellPad: 1.5,
  rowPad: 2,
};

let activeMetrics: PdfTableMetrics = DEFAULT_METRICS;
let activeMaxCellLines = 0;
let activeColumnLineLimits: Record<string, number> | null = null;
let activeStaffPdfLayout = false;

const STAFF_PDF_NARROW_KEYS = new Set([
  'gender',
  'status',
  'staffType',
  'maritalStatus',
  'joinedDate',
]);

function maxLinesForColumn(columnKey: string): number {
  if (activeColumnLineLimits && columnKey in activeColumnLineLimits) {
    return activeColumnLineLimits[columnKey];
  }
  return activeMaxCellLines;
}

function columnWidthShare(columnKey: string, columnCount: number): number {
  if (activeStaffPdfLayout && columnKey === 'name') return 0.15;
  if (activeStaffPdfLayout && STAFF_PDF_NARROW_KEYS.has(columnKey)) return 0.045;
  return Math.min(0.42, 0.9 / Math.max(columnCount, 1));
}

let jsPdfCtorPromise: Promise<typeof import('jspdf').default> | null = null;
async function getJsPdfCtor(): Promise<typeof import('jspdf').default> {
  if (!jsPdfCtorPromise) {
    jsPdfCtorPromise = import('jspdf').then((m) => m.default);
  }
  return jsPdfCtorPromise;
}

/** jsPDF Helvetica is Latin-1 only — normalize labels and values for PDF output. */
export function sanitizePdfText(text: string): string {
  return text
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/[\u2013\u2014\u00B7]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampCellLines(lines: string[], maxLines: number): string[] {
  if (!maxLines || lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  const last = clipped[maxLines - 1];
  if (last.length > 3 && !last.endsWith('…')) {
    clipped[maxLines - 1] = `${last.replace(/\s+\S*$/, '').trimEnd()}…`;
  }
  return clipped;
}

function splitCellLines(doc: jsPDF, text: string, width: number, columnKey?: string): string[] {
  const safe = sanitizePdfText(text);
  if (!safe) return [''];
  const inner = Math.max(6, width - activeMetrics.cellPad * 2);
  if (doc.getTextWidth(safe) <= inner) return [safe];
  const lines = doc.splitTextToSize(safe, inner);
  return clampCellLines(lines, maxLinesForColumn(columnKey ?? ''));
}

/** Break header labels at spaces — never split a single word like "Students". */
function splitHeaderLines(doc: jsPDF, label: string, width: number): string[] {
  const safe = sanitizePdfText(label);
  const inner = Math.max(6, width - activeMetrics.cellPad * 2);
  if (!safe) return [''];
  if (doc.getTextWidth(safe) <= inner) return [safe];

  const words = safe.split(' ');
  if (words.length === 1) {
    return doc.splitTextToSize(safe, inner);
  }

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (doc.getTextWidth(next) <= inner) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : doc.splitTextToSize(safe, inner);
}

function headerMinWidth(doc: jsPDF, label: string): number {
  doc.setFont('helvetica', 'bold');
  const lines = splitHeaderLines(doc, label, 80);
  const widest = Math.max(...lines.map((line) => doc.getTextWidth(line)), 0);
  doc.setFont('helvetica', 'normal');
  return widest + activeMetrics.cellPad * 2;
}

function fitColumnWidths(ideals: number[], mins: number[], tableWidth: number): number[] {
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

function measureColumnNeeds<T>(
  doc: jsPDF,
  columns: ExportColumn<T>[],
  rows: T[],
  tableWidth: number,
): { mins: number[]; ideals: number[] } {
  doc.setFontSize(activeMetrics.fontSize);

  const mins = columns.map((col) => {
    const base = headerMinWidth(doc, col.label);
    if (activeStaffPdfLayout && col.key === 'name') {
      return Math.max(base, tableWidth * 0.12);
    }
    if (activeStaffPdfLayout && STAFF_PDF_NARROW_KEYS.has(col.key)) {
      return Math.min(base, tableWidth * 0.05);
    }
    return base;
  });

  const ideals = columns.map((col, i) => {
    const maxShare = columnWidthShare(col.key, columns.length);
    let maxW = mins[i];
    for (const row of rows) {
      const val = sanitizePdfText(col.getValue(row));
      if (col.key === 'name' && activeStaffPdfLayout) {
        const singleLine = doc.getTextWidth(val) + activeMetrics.cellPad * 2;
        maxW = Math.max(maxW, Math.min(singleLine, tableWidth * maxShare));
        continue;
      }
      if (val.length <= 20) {
        maxW = Math.max(maxW, doc.getTextWidth(val) + activeMetrics.cellPad * 2);
        continue;
      }
      const colCap = Math.max(mins[i] * 1.8, tableWidth * maxShare);
      const lines = splitCellLines(doc, val, colCap, col.key);
      for (const line of lines) {
        maxW = Math.max(maxW, doc.getTextWidth(line) + activeMetrics.cellPad * 2);
      }
    }
    return Math.min(maxW, tableWidth * maxShare);
  });

  return { mins, ideals };
}

function computeColumnWidths<T>(
  doc: jsPDF,
  columns: ExportColumn<T>[],
  rows: T[],
  tableWidth: number,
): number[] {
  const { mins, ideals } = measureColumnNeeds(doc, columns, rows, tableWidth);
  return fitColumnWidths(ideals, mins, tableWidth);
}

function resolvePdfMetrics(columnCount: number): PdfTableMetrics {
  if (columnCount <= 8) {
    return { fontSize: 7, lineHeight: 3.6, cellPad: 1.5, rowPad: 2 };
  }
  if (columnCount <= 12) {
    return { fontSize: 6.5, lineHeight: 3.2, cellPad: 1.3, rowPad: 1.8 };
  }
  if (columnCount <= 16) {
    return { fontSize: 6, lineHeight: 3, cellPad: 1.2, rowPad: 1.6 };
  }
  return { fontSize: 5.5, lineHeight: 2.7, cellPad: 0.9, rowPad: 1.2 };
}

function resolveDenseListPdfMetrics(columnCount: number, staffList = false): PdfTableMetrics {
  if (staffList && columnCount <= 18) {
    return { fontSize: 6, lineHeight: 3, cellPad: 1.1, rowPad: 1.5 };
  }
  if (columnCount >= 14) {
    return { fontSize: 5.5, lineHeight: 2.7, cellPad: 0.9, rowPad: 1.2 };
  }
  return resolvePdfMetrics(columnCount);
}

function buildColumnChunks<T>(
  doc: jsPDF,
  columns: ExportColumn<T>[],
  rows: T[],
  tableWidth: number,
): ExportColumn<T>[][] {
  if (columns.length <= 1) return [columns];

  const chunks: ExportColumn<T>[][] = [];
  let index = 0;

  while (index < columns.length) {
    const chunk: ExportColumn<T>[] = [];
    while (index < columns.length) {
      const candidate = [...chunk, columns[index]];
      const { mins } = measureColumnNeeds(doc, candidate, rows, tableWidth);
      const minSum = mins.reduce((a, b) => a + b, 0);

      if (chunk.length > 0 && minSum > tableWidth) break;

      chunk.push(columns[index]);
      index++;

      if (minSum >= tableWidth * 0.88) break;
    }

    if (!chunk.length) {
      chunks.push([columns[index]]);
      index++;
      continue;
    }

    chunks.push(chunk);
  }

  return chunks;
}

const WIDE_EXPORT_KEYS = new Set([
  'address',
  'notes',
  'aestheticsSubject',
  'parentOccupation',
  'parentName',
  'name',
  'previousSchools',
  'siblings',
  'specialDisabilities',
]);

/** Compact exports use portrait; wider column sets use landscape. */
export function previewPdfOrientation(
  columnCount: number,
  selectedKeys: string[] = [],
): 'portrait' | 'landscape' {
  if (columnCount > PORTRAIT_MAX_COLUMNS) return 'landscape';
  if (columnCount > 4 && selectedKeys.some((k) => WIDE_EXPORT_KEYS.has(k))) return 'landscape';
  return 'portrait';
}

function resolvePdfOrientation<T>(
  doc: jsPDF,
  columns: ExportColumn<T>[],
  rows: T[],
): 'portrait' | 'landscape' {
  const portraitTableW = doc.internal.pageSize.getWidth() - PDF_MARGIN * 2;
  activeMetrics = resolvePdfMetrics(columns.length);
  const { mins, ideals } = measureColumnNeeds(doc, columns, rows, portraitTableW);
  const idealSum = ideals.reduce((a, b) => a + b, 0);
  const minSum = mins.reduce((a, b) => a + b, 0);

  if (columns.length <= PORTRAIT_MAX_COLUMNS && idealSum <= portraitTableW) {
    return 'portrait';
  }
  if (columns.length <= 4 && minSum <= portraitTableW) {
    return 'portrait';
  }
  return 'landscape';
}

function columnOffsets(widths: number[], margin: number): number[] {
  const xs: number[] = [];
  let x = margin;
  for (const w of widths) {
    xs.push(x);
    x += w;
  }
  return xs;
}

async function addSimpleHeader(doc: jsPDF, title: string, subtitle?: string): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const logoMaxH = 20;
  const logoMaxW = 18;
  const logo = await getSchoolLogoForPdf(logoMaxH, logoMaxW);

  const safeTitle = sanitizePdfText(title);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(safeTitle, w - 40);
  const titleBlockH = titleLines.length * 5;
  const subtitleH = subtitle ? 8 : 0;
  const headerH = Math.max(28, 16 + titleBlockH + subtitleH);

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, w, headerH, 'F');
  doc.setFillColor(...HEADER_GOLD);
  doc.rect(0, headerH, w, 1, 'F');

  if (logo) {
    const aspect = logo.w / logo.h;
    let drawH = logoMaxH;
    let drawW = drawH * aspect;
    if (drawW > logoMaxW) {
      drawW = logoMaxW;
      drawH = drawW / aspect;
    }
    const logoY = (headerH - drawH) / 2;
    doc.addImage(logo.dataUrl, logo.format, PDF_MARGIN, logoY, drawW, drawH);
  }

  const textCenterY = (headerH - titleBlockH - subtitleH) / 2 + 5;
  doc.setTextColor(255, 255, 255);
  titleLines.forEach((line: string, i: number) => {
    doc.text(line, w / 2, textCenterY + i * 5, { align: 'center' });
  });
  if (subtitle) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      sanitizePdfText(subtitle),
      w / 2,
      textCenterY + titleBlockH + 3,
      { align: 'center' },
    );
  }
  doc.setTextColor(0, 0, 0);
  return headerH + 6;
}

function addSimpleFooter(doc: jsPDF, pageNum?: number, pageTotal?: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const stamp = `Generated ${new Date().toLocaleString('en-GB')} · ${SCHOOL}`;
  const pageLabel =
    pageNum !== undefined && pageTotal !== undefined && pageTotal > 1
      ? `Page ${pageNum} of ${pageTotal}`
      : '';
  doc.text([stamp, pageLabel].filter(Boolean).join(' · '), w / 2, h - 8, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

function finalizePdfFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    addSimpleFooter(doc, page, total);
  }
}

function strokeRowGrid(
  doc: jsPDF,
  y: number,
  height: number,
  colXs: number[],
  margin: number,
  tableWidth: number,
) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  const top = y;
  const bottom = y + height;
  const left = margin;
  const right = margin + tableWidth;

  doc.line(left, top, right, top);
  doc.line(left, bottom, right, bottom);

  for (let i = 1; i < colXs.length; i++) {
    doc.line(colXs[i], top, colXs[i], bottom);
  }
  doc.line(left, top, left, bottom);
  doc.line(right, top, right, bottom);
}

function drawTableHeader<T>(
  doc: jsPDF,
  columns: ExportColumn<T>[],
  colWidths: number[],
  colXs: number[],
  y: number,
  margin: number,
  tableWidth: number,
): { nextY: number; headerHeight: number } {
  doc.setFontSize(activeMetrics.fontSize);
  doc.setFont('helvetica', 'bold');

  const headerLineCounts = columns.map((col, i) =>
    splitHeaderLines(doc, col.label, colWidths[i]).length,
  );
  const headerHeight = Math.max(
    8,
    Math.max(...headerLineCounts) * activeMetrics.lineHeight + activeMetrics.rowPad * 2,
  );

  doc.setFillColor(226, 236, 252);
  doc.rect(margin, y, tableWidth, headerHeight, 'F');

  columns.forEach((col, i) => {
    const lines = splitHeaderLines(doc, col.label, colWidths[i]);
    lines.forEach((line, lineIdx) => {
      doc.text(
        line,
        colXs[i] + activeMetrics.cellPad,
        y + activeMetrics.rowPad + activeMetrics.lineHeight + lineIdx * activeMetrics.lineHeight,
      );
    });
  });

  strokeRowGrid(doc, y, headerHeight, colXs, margin, tableWidth);

  doc.setFont('helvetica', 'normal');
  return { nextY: y + headerHeight, headerHeight };
}

function measureTableRow<T>(
  doc: jsPDF,
  row: T,
  columns: ExportColumn<T>[],
  colWidths: number[],
): number {
  doc.setFontSize(activeMetrics.fontSize);
  const lineCounts = columns.map((col, i) =>
    splitCellLines(doc, col.getValue(row), colWidths[i], col.key).length,
  );
  return Math.max(
    8,
    Math.max(...lineCounts) * activeMetrics.lineHeight + activeMetrics.rowPad * 2,
  );
}

function drawTableRow<T>(
  doc: jsPDF,
  row: T,
  columns: ExportColumn<T>[],
  colWidths: number[],
  colXs: number[],
  y: number,
  margin: number,
  tableWidth: number,
  stripe: boolean,
): { nextY: number; rowHeight: number } {
  doc.setFontSize(activeMetrics.fontSize);

  const lineCounts = columns.map((col, i) =>
    splitCellLines(doc, col.getValue(row), colWidths[i], col.key).length,
  );
  const rowHeight = Math.max(
    8,
    Math.max(...lineCounts) * activeMetrics.lineHeight + activeMetrics.rowPad * 2,
  );

  if (stripe) {
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, tableWidth, rowHeight, 'F');
  }

  columns.forEach((col, i) => {
    const lines = splitCellLines(doc, col.getValue(row), colWidths[i], col.key);
    lines.forEach((line, lineIdx) => {
      doc.text(
        line,
        colXs[i] + activeMetrics.cellPad,
        y + activeMetrics.rowPad + activeMetrics.lineHeight + lineIdx * activeMetrics.lineHeight,
      );
    });
  });

  strokeRowGrid(doc, y, rowHeight, colXs, margin, tableWidth);

  return { nextY: y + rowHeight, rowHeight };
}

async function renderTableSection<T>(
  doc: jsPDF,
  title: string,
  subtitle: string,
  rows: T[],
  columns: ExportColumn<T>[],
  startNewPage: boolean,
  metrics?: PdfTableMetrics,
): Promise<void> {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pageBottom = h - 18;
  const margin = PDF_MARGIN;
  const tableWidth = w - margin * 2;

  activeMetrics = metrics ?? resolvePdfMetrics(columns.length);

  const colWidths = computeColumnWidths(doc, columns, rows, tableWidth);
  const colXs = columnOffsets(colWidths, margin);

  if (startNewPage) {
    doc.addPage();
  }

  let y = await addSimpleHeader(doc, title, subtitle);

  const drawHeader = () => {
    const result = drawTableHeader(doc, columns, colWidths, colXs, y, margin, tableWidth);
    y = result.nextY;
  };

  drawHeader();

  for (let idx = 0; idx < rows.length; idx++) {
    const rowHeight = measureTableRow(doc, rows[idx], columns, colWidths);
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = await addSimpleHeader(doc, `${sanitizePdfText(title)} (continued)`, subtitle);
      drawHeader();
    }

    const drawn = drawTableRow(
      doc,
      rows[idx],
      columns,
      colWidths,
      colXs,
      y,
      margin,
      tableWidth,
      idx % 2 === 0,
    );
    y = drawn.nextY;
  }
}

export async function exportRecordsPDF<T>(
  title: string,
  rows: T[],
  columns: ExportColumn<T>[],
  filePrefix: string,
) {
  if (!columns.length) return;
  const JsPdf = await getJsPdfCtor();

  const isStudentList = filePrefix === 'students-list';
  const isStaffDirectory = filePrefix === 'staff-directory';
  const isDenseList = isStudentList || isStaffDirectory;

  let exportColumns = columns;
  if (isStudentList) {
    exportColumns = orderStudentPdfColumns(columns as ExportColumn<Student>[]) as ExportColumn<T>[];
  } else if (isStaffDirectory) {
    exportColumns = buildStaffPdfColumns(columns as ExportColumn<Staff>[]) as ExportColumn<T>[];
  }

  const probe = new JsPdf({ format: 'a4', orientation: 'portrait' });
  const orientation =
    isDenseList && exportColumns.length > PORTRAIT_MAX_COLUMNS
      ? 'landscape'
      : resolvePdfOrientation(probe, exportColumns, rows);
  const doc = new JsPdf({ format: 'a4', orientation });

  const tableWidth = doc.internal.pageSize.getWidth() - PDF_MARGIN * 2;
  const denseMetrics = isDenseList
    ? resolveDenseListPdfMetrics(exportColumns.length, isStaffDirectory)
    : undefined;
  activeMetrics = denseMetrics ?? resolvePdfMetrics(exportColumns.length);
  activeStaffPdfLayout = isStaffDirectory;
  activeMaxCellLines = isStaffDirectory ? 2 : isStudentList ? 3 : 0;
  activeColumnLineLimits = isStaffDirectory
    ? { name: 0, nameWithInitials: 0, subjects: 2, gradesTaught: 2, appointedSubject: 2 }
    : null;

  const columnChunks = isDenseList
    ? [exportColumns]
    : buildColumnChunks(doc, exportColumns, rows, tableWidth);

  const layoutLabel = orientation === 'landscape' ? 'Landscape' : 'Portrait';
  const multiPart = !isDenseList && columnChunks.length > 1;

  for (let i = 0; i < columnChunks.length; i++) {
    const chunk = columnChunks[i];
    const partLabel = multiPart ? `Part ${i + 1} of ${columnChunks.length}` : '';
    const columnHint = multiPart
      ? `${chunk[0].label} – ${chunk[chunk.length - 1].label}`
      : '';
    const subtitle = isStaffDirectory
      ? `Staff directory · ${rows.length} record${rows.length !== 1 ? 's' : ''} · ${layoutLabel}`
      : [
          `Total: ${rows.length} records`,
          layoutLabel,
          multiPart
            ? 'split columns for readability'
            : isStudentList
              ? 'full student record'
              : 'compact',
          partLabel,
          columnHint,
        ]
          .filter(Boolean)
          .join(' · ');

    await renderTableSection(
      doc,
      multiPart ? `${title} (${partLabel})` : title,
      subtitle,
      rows,
      chunk,
      i > 0,
      denseMetrics,
    );
  }

  finalizePdfFooters(doc);
  doc.save(`${filePrefix}-${Date.now()}.pdf`);
}
