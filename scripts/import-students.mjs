/**
 * Import or update students from a Google Forms CSV export.
 *
 * Usage:
 *   npm run import-students -- "path/to/file.csv"
 *   npm run import-students -- "path/to/file.csv" --dry-run
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_PATH in .env.local (or default adminsdk JSON in project root).
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvLocal() {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const GRADES = Array.from({ length: 13 }, (_, i) => `Grade ${i + 1}`);

const SCIENTIFIC = /^[+-]?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+$/;

function expandScientificNotation(value) {
  const trimmed = value.trim();
  if (!SCIENTIFIC.test(trimmed)) return trimmed;
  const match = trimmed.match(/^([+-]?)(\d(?:\.\d+)?)[eE]([+-]?\d+)$/);
  if (!match) return trimmed;
  const sign = match[1] === '-' ? '-' : '';
  const mantissa = match[2];
  const exponent = parseInt(match[3], 10);
  if (!Number.isFinite(exponent)) return trimmed;
  const parts = mantissa.split('.');
  const intPart = parts[0] ?? '';
  const fracPart = parts[1] ?? '';
  const digits = intPart + fracPart;
  const decimalPos = intPart.length;
  const newPos = decimalPos + exponent;
  if (newPos <= 0) return `${sign}0.${'0'.repeat(-newPos)}${digits.replace(/^0+/, '') || '0'}`;
  if (newPos >= digits.length) return `${sign}${digits}${'0'.repeat(newPos - digits.length)}`;
  return `${sign}${digits.slice(0, newPos)}.${digits.slice(newPos)}`.replace(/\.$/, '');
}

function normalizeIdentityNumber(value) {
  if (value === undefined || value === null) return undefined;
  let v = String(value).trim();
  if (!v) return undefined;
  v = v.replace(/\s+/g, '');
  const oldNic = v.match(/^(\d{9})([vVxX])$/);
  if (oldNic) return `${oldNic[1]}${oldNic[2].toUpperCase()}`;
  if (SCIENTIFIC.test(v)) v = expandScientificNotation(v);
  if (/^\d+\.\d+$/.test(v)) {
    const asNum = Number(v);
    if (Number.isFinite(asNum) && asNum >= 1e9 && asNum < 1e16 && Math.abs(asNum - Math.round(asNum)) < 1e-6) {
      v = String(Math.round(asNum));
    } else {
      v = v.replace(/\.0+$/, '').replace(/\.$/, '');
    }
  }
  if (/^\d+$/.test(v)) return v.replace(/^0+(?=\d)/, '') || '0';
  return v;
}

const HEADER_ALIASES = [
  { key: 'timestamp', patterns: ['timestamp'] },
  { key: 'nameInitials', patterns: ['01.name with initials', 'name with initials'] },
  { key: 'fullName', patterns: ['02. full name', 'full name'] },
  { key: 'profileImage', patterns: ['profile image'] },
  { key: 'indexNumber', patterns: ['03. index number', 'index number'] },
  { key: 'nic', patterns: ['04.national identity card', 'national identity card', 'nic number'] },
  { key: 'dateOfBirth', patterns: ['05.date of birth', 'date of birth', 'dob'] },
  { key: 'gender', patterns: ['06.gender', 'gender'] },
  { key: 'religion', patterns: ['07.religion', 'religion'] },
  { key: 'address', patterns: ['08.address', 'address'] },
  { key: 'phone', patterns: ['09.telephone', 'telephone number', 'phone'] },
  { key: 'whatsapp', patterns: ['10.whatsapp', 'whatsapp'] },
  { key: 'email', patterns: ['11.email', 'email address', '^email$'] },
  { key: 'siblingGrades', patterns: ['23.grades in which', 'grades in which they are studying', 'sibling grades'] },
  { key: 'grade', patterns: ['12.grade', '^grade$'] },
  { key: 'classSection', patterns: ['13.class', '^class$'] },
  { key: 'admissionDate', patterns: ['14.date of admission', 'admission to school', 'admission date'] },
  { key: 'previousSchools', patterns: ['15.schools previously', 'previously attended'] },
  { key: 'medium', patterns: ['16.medium', 'medium of study'] },
  { key: 'alSubjects', patterns: ['a/l subjects', 'al subjects', 'subjects you are study'] },
  { key: 'aesthetics', patterns: ['17 aesthetics', 'aesthetics subject', 'aesthetics'] },
  { key: 'parentName', patterns: ['18.name of parent', '^name of parent/guardian', '^name of parent / guardian'] },
  { key: 'parentPhone', patterns: ['19. contact number of parent', '^contact number of parent/guardian', '^contact number of parent / guardian'] },
  { key: 'parentNic', patterns: ['20.nic number of parent', '^nic number of parent/guardian', '^nic number of parent / guardian'] },
  { key: 'parentOccupation', patterns: ['21.occupation of parent', '^occupation of parent/guardian', '^occupation of parent / guardian'] },
  { key: 'siblings', patterns: ['22.names of siblings', 'siblings'] },
  { key: 'disabilities', patterns: ['24. special disabilities', 'disabilities'] },
  { key: 'examYear', patterns: ['year to appear for the exam', 'exam year'] },
];

const CSV_AL_STREAM_ALIASES = {
  science: 'Science',
  maths: 'Science',
  math: 'Science',
  'science (maths)': 'Science',
  'physical science': 'Science',
  'physical science (maths)': 'Science',
  bio: 'Science',
  biology: 'Science',
  'science (bio)': 'Science',
  'biological science': 'Science',
  'biological science (bio)': 'Science',
  commerce: 'Commerce',
  arts: 'Arts',
};

function normalizeHeader(header) {
  return header.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function patternMatches(normalizedHeader, pattern) {
  if (pattern.startsWith('^') && pattern.endsWith('$')) return normalizedHeader === pattern.slice(1, -1);
  if (pattern.startsWith('^')) return normalizedHeader.startsWith(pattern.slice(1));
  return normalizedHeader === pattern || normalizedHeader.includes(pattern);
}

function resolveFieldKey(header) {
  const n = normalizeHeader(header);
  for (const { key, patterns } of HEADER_ALIASES) {
    if (patterns.some((p) => patternMatches(n, p))) return key;
  }
  return null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      if (ch === '\r') i++;
    } else if (ch !== '\r') {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }

  return rows;
}

function mapCsvHeaders(headers) {
  const columnIndex = {};
  const mappedColumns = {};
  const unmappedHeaders = [];

  headers.forEach((h, i) => {
    const key = resolveFieldKey(h);
    if (key) {
      if (columnIndex[key] !== undefined) return;
      columnIndex[key] = i;
      mappedColumns[key] = h.trim();
    } else if (h.trim()) {
      unmappedHeaders.push(h.trim());
    }
  });

  return { columnIndex, mappedColumns, unmappedHeaders };
}

function isRowEmpty(cells) {
  return cells.every((c) => !c.trim());
}

function parseDateToIso(value) {
  const v = value.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{4}$/.test(v)) return `${v}-01-01`;
  const yearWithNote = v.match(/(\d{4})\s*[\(/]/);
  if (yearWithNote) return `${yearWithNote[1]}-01-01`;
  const dotYear = v.match(/^(\d{4})\.(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (dotYear) {
    const year = dotYear[1];
    const month = String(parseInt(dotYear[2], 10)).padStart(2, '0');
    const day = dotYear[3] ? String(parseInt(dotYear[3], 10)).padStart(2, '0') : '01';
    return `${year}-${month}-${day}`;
  }
  const ymdSlash = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdSlash) {
    const year = ymdSlash[1];
    const month = String(parseInt(ymdSlash[2], 10)).padStart(2, '0');
    const day = String(parseInt(ymdSlash[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const slash = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slash) {
    let day = parseInt(slash[1], 10);
    let month = parseInt(slash[2], 10);
    const year = parseInt(slash[3], 10);
    if (day <= 12 && month > 12) {
      month = day;
      day = month;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

function normalizeGrade(value) {
  const v = value.trim();
  if (!v) return null;
  const direct = GRADES.find((g) => g.toLowerCase() === v.toLowerCase());
  if (direct) return direct;
  const num = v.match(/^(\d{1,2})$/);
  if (num) {
    const g = `Grade ${num[1]}`;
    if (GRADES.includes(g)) return g;
  }
  const gradeWord = v.match(/grade\s*(\d{1,2})/i);
  if (gradeWord) {
    const g = `Grade ${gradeWord[1]}`;
    if (GRADES.includes(g)) return g;
  }
  return v.startsWith('Grade ') ? v : null;
}

function normalizeGender(value) {
  const v = value.trim().toLowerCase();
  if (v === 'male' || v === 'm' || v === 'boy') return 'male';
  if (v === 'female' || v === 'f' || v === 'girl') return 'female';
  if (v) return 'other';
  return null;
}

function isAdvancedLevelGrade(grade) {
  return grade === 'Grade 12' || grade === 'Grade 13';
}

function normalizeClassSection(grade, section) {
  const raw = (section ?? '').trim();
  if (!raw) return '';
  if (!isAdvancedLevelGrade(grade)) return raw;
  const alias = CSV_AL_STREAM_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  return raw;
}

function opt(value) {
  const v = value?.trim();
  return v || undefined;
}

function sanitizeFirestoreWrite(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    out[key] = value === '' ? null : value;
  }
  return out;
}

function buildStudentFromCsvFields(fields) {
  const errors = [];
  const fullName = fields.fullName?.trim();
  const initials = fields.nameInitials?.trim();
  const name = fullName || initials;
  if (!name || name.length < 2) errors.push('Missing student name');

  const indexRaw = normalizeIdentityNumber(fields.indexNumber);
  const admissionNumber = indexRaw ? indexRaw.replace(/\s+/g, '') : '';
  if (!admissionNumber) errors.push('Missing index number');

  const dobRaw = fields.dateOfBirth;
  const dateOfBirth = dobRaw ? parseDateToIso(dobRaw) : null;
  if (dobRaw && !dateOfBirth) errors.push(`Invalid date of birth: ${dobRaw}`);

  const genderRaw = fields.gender;
  const gender = genderRaw ? normalizeGender(genderRaw) : null;
  if (genderRaw && !gender) errors.push(`Invalid gender: ${genderRaw}`);

  const address = fields.address?.trim();
  if (!address || address.length < 5) errors.push('Missing or short address');

  const parentName = fields.parentName?.trim();
  if (!parentName || parentName.length < 2) errors.push('Missing parent/guardian name');

  const parentPhone = fields.parentPhone?.replace(/\s+/g, '');
  if (!parentPhone || parentPhone.length < 9) errors.push('Missing parent contact');

  const gradeRaw = fields.grade;
  const grade = gradeRaw ? normalizeGrade(gradeRaw) : null;
  if (!gradeRaw) errors.push('Missing grade');
  else if (!grade || !GRADES.includes(grade)) errors.push(`Unrecognized grade: ${gradeRaw}`);

  const admRaw = fields.admissionDate;
  const admissionDate = admRaw ? parseDateToIso(admRaw) : new Date().toISOString().split('T')[0];
  if (admRaw && !admissionDate) errors.push(`Invalid admission date: ${admRaw}`);

  const email = fields.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Invalid email: ${email}`);

  if (errors.length) return { errors };

  const alSubjectLine = opt(fields.alSubjects);
  const examYearLine = opt(fields.examYear);
  const aestheticsSubject = isAdvancedLevelGrade(grade) ? alSubjectLine ?? opt(fields.aesthetics) : opt(fields.aesthetics);

  const payload = {
    admissionNumber,
    nameWithInitials: opt(initials),
    name: fullName || initials,
    profileImageUrl: opt(fields.profileImage),
    nic: opt(normalizeIdentityNumber(fields.nic)),
    dateOfBirth: dateOfBirth || '2000-01-01',
    gender: gender || 'other',
    religion: opt(fields.religion),
    address,
    phone: opt(fields.phone?.replace(/\s+/g, '')),
    whatsapp: opt(fields.whatsapp?.replace(/\s+/g, '')),
    email: email || null,
    grade,
    section: (() => {
      const raw = opt(fields.classSection);
      if (!raw || !grade) return raw ?? null;
      return normalizeClassSection(grade, raw) || raw;
    })(),
    admissionDate,
    previousSchools: opt(fields.previousSchools) ?? null,
    mediumOfStudy: opt(fields.medium) ?? null,
    aestheticsSubject: aestheticsSubject ?? null,
    parentName,
    parentPhone,
    parentNic: opt(normalizeIdentityNumber(fields.parentNic)) ?? null,
    parentOccupation: opt(fields.parentOccupation) ?? null,
    siblings: opt(fields.siblings) ?? null,
    siblingGrades: opt(fields.siblingGrades) ?? null,
    specialDisabilities: opt(fields.disabilities) ?? null,
    notes: examYearLine ? `A/L exam year: ${examYearLine}` : null,
    status: 'active',
    nationality: 'Sri Lankan',
    formSubmittedAt: opt(fields.timestamp) ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  return { payload, errors: [] };
}

function analyzeStudentCsv(csvText, fileName, existingStudents) {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return { fileName, rows: [], mappedColumns: {}, unmappedHeaders: [], toCreate: 0, toUpdate: 0, errors: 0, skipped: 0 };
  }

  const [headerRow, ...dataRows] = table;
  const { columnIndex, mappedColumns, unmappedHeaders } = mapCsvHeaders(headerRow);

  const PENDING_IMPORT_ID = '__pending__';

  function indexStudentForLookup(map, student) {
    map.set(student.admissionNumber.toUpperCase(), student);
    const nic = normalizeIdentityNumber(student.nic);
    if (nic) map.set(`NIC:${nic}`, student);
  }

  function findExistingStudent(map, payload) {
    const byAdmission = map.get(payload.admissionNumber.toUpperCase());
    if (byAdmission) return byAdmission;
    const nic = normalizeIdentityNumber(payload.nic);
    if (nic) return map.get(`NIC:${nic}`);
    return undefined;
  }

  const byAdmission = new Map();
  for (const s of existingStudents) {
    indexStudentForLookup(byAdmission, s);
  }

  const rows = [];
  let toCreate = 0;
  let toUpdate = 0;
  let errors = 0;
  let skipped = 0;

  dataRows.forEach((cells, i) => {
    if (isRowEmpty(cells)) {
      skipped++;
      return;
    }

    const rowNumber = i + 2;
    const fields = {};
    for (const key of Object.keys(columnIndex)) {
      const idx = columnIndex[key];
      const val = (cells[idx] ?? '').trim();
      if (val) fields[key] = val;
    }

    const { payload, errors: buildErrors } = buildStudentFromCsvFields(fields);
    if (buildErrors.length || !payload) {
      errors++;
      rows.push({ rowNumber, action: 'error', admissionNumber: fields.indexNumber || '—', name: fields.fullName || fields.nameInitials || '—', messages: buildErrors });
      return;
    }

    const existing = findExistingStudent(byAdmission, payload);
    if (existing?.id === PENDING_IMPORT_ID) {
      errors++;
      rows.push({
        rowNumber,
        action: 'error',
        admissionNumber: payload.admissionNumber,
        name: payload.name,
        grade: payload.grade,
        messages: ['Duplicate student in this file (same index number or NIC)'],
      });
      return;
    }
    if (existing) {
      toUpdate++;
      rows.push({ rowNumber, action: 'update', admissionNumber: payload.admissionNumber, name: payload.name, grade: payload.grade, existingId: existing.id, payload });
    } else {
      toCreate++;
      rows.push({ rowNumber, action: 'create', admissionNumber: payload.admissionNumber, name: payload.name, grade: payload.grade, payload });
      indexStudentForLookup(byAdmission, { id: PENDING_IMPORT_ID, ...payload });
    }
  });

  return { fileName, rows, mappedColumns, unmappedHeaders, toCreate, toUpdate, errors, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvArg = args.find((a) => !a.startsWith('--'));

  if (!csvArg) {
    console.error('\nUsage: npm run import-students -- "path/to/students.csv" [--dry-run]\n');
    process.exit(1);
  }

  const csvPath = resolve(csvArg);
  if (!existsSync(csvPath)) {
    console.error('\n❌ CSV file not found:', csvPath, '\n');
    process.exit(1);
  }

  const csvText = readFileSync(csvPath, 'utf8');
  const fileName = csvPath.split(/[\\/]/).pop() || 'import.csv';

  let db = null;
  let existingStudents = [];

  if (!dryRun) {
    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      join(root, 'delta-gemunupura-dbms-firebase-adminsdk-fbsvc-6a36b477a0.json');

    if (!existsSync(serviceAccountPath)) {
      console.error('\n❌ Service account not found:', serviceAccountPath);
      console.error('   Set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local, or use --dry-run\n');
      process.exit(1);
    }

    if (!getApps().length) {
      initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) });
    }
    db = getFirestore();

    const snap = await db.collection('students').get();
    existingStudents = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  const analysis = analyzeStudentCsv(csvText, fileName, existingStudents);

  console.log(`\n📋 Student CSV import: ${fileName}`);
  console.log(`   Mapped columns: ${Object.keys(analysis.mappedColumns).length}`);
  if (analysis.unmappedHeaders.length) {
    console.log(`   Unmapped: ${analysis.unmappedHeaders.join(', ')}`);
  }
  console.log(`   Create: ${analysis.toCreate} | Update: ${analysis.toUpdate} | Errors: ${analysis.errors} | Skipped: ${analysis.skipped}\n`);

  for (const row of analysis.rows) {
    const tag = row.action === 'error' ? '❌' : row.action === 'update' ? '↻' : '+';
    const extra = row.action === 'error' ? ` — ${row.messages.join('; ')}` : '';
    console.log(`   ${tag} Row ${row.rowNumber}: [${row.action}] ${row.admissionNumber} — ${row.name} (${row.grade || '—'})${extra}`);
  }

  if (analysis.errors > 0) {
    console.log('\n⚠️  Fix errors before importing.\n');
    process.exit(1);
  }

  const actionable = analysis.rows.filter((r) => r.action === 'create' || r.action === 'update');
  if (actionable.length === 0) {
    console.log('\nNothing to import.\n');
    return;
  }

  if (dryRun) {
    console.log(`\n✓ Dry run complete — ${actionable.length} student(s) ready to import. Run without --dry-run to apply.\n`);
    return;
  }

  console.log('\n⏳ Writing to Firestore...\n');
  let created = 0;
  let updated = 0;

  for (const row of actionable) {
    const data = sanitizeFirestoreWrite(row.payload);
    if (row.action === 'update' && row.existingId) {
      await db.collection('students').doc(row.existingId).update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
      updated++;
      console.log(`   ↻ Updated ${row.admissionNumber} — ${row.name}`);
    } else if (row.action === 'create') {
      const ref = await db.collection('students').add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      created++;
      console.log(`   + Created ${row.admissionNumber} — ${row.name} (${ref.id})`);
    }
  }

  console.log(`\n✅ Done: ${created} created, ${updated} updated.\n`);
}

main().catch((err) => {
  console.error('\n❌ Import failed:', err.message || err);
  process.exit(1);
});
