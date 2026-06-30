import { Timestamp } from 'firebase/firestore';

export type UserRole =
  | 'principal'
  | 'technical_officer'
  | 'vice_principal'
  | 'staff'
  | 'student'
  | 'parent';

/** Staff login category (stored in Firestore `staff_users`) */
export type StaffRole =
  | 'principal'
  | 'technical_officer'
  | 'vice_principal'
  | 'teacher'
  | 'clerk';

export type AccountType = 'staff' | 'student' | 'parent';

export type NotificationType =
  | 'exam_result'
  | 'attendance'
  | 'announcement'
  | 'timetable'
  | 'system';

export interface NotificationPreferences {
  /** In-app alerts when exam results are published for a linked student. */
  examResults: boolean;
  /** School-wide and role-targeted announcements. */
  announcements: boolean;
  /** When a class timetable is published or updated. */
  timetable: boolean;
  /** Browser notifications when the app is open (and permission granted). */
  browserPush: boolean;
  /** Reserved for a future attendance module. */
  attendance: boolean;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  examinationId?: string;
  admissionNumber?: string;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  /** Firestore collection group: staff_users | student_users | parents */
  accountType: AccountType;
  /** Set when accountType is staff */
  staffRole?: StaffRole;
  /** Grades this teacher may view (synced from linked `staff.gradesTaught`). */
  allowedStudentGrades?: string[];
  linkedId?: string;
  phone?: string;
  photoURL?: string;
  /** True when a Quick PIN is configured (hash stored server-side only). */
  quickPinEnabled?: boolean;
  /** Student must set a new password after signing in with a temporary one. */
  mustChangePassword?: boolean;
  isActive: boolean;
  notificationPreferences?: NotificationPreferences;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Matches Google Form: Student's details form (Responses) */
export interface Student {
  id: string;
  /** 03. Index number */
  admissionNumber: string;
  /** 01. Name with initials */
  nameWithInitials?: string;
  /** 02. Full name */
  name: string;
  /** Profile image URL from form */
  profileImageUrl?: string;
  /** 04. National Identity Card number */
  nic?: string;
  /** 05. Date of birth */
  dateOfBirth: string;
  /** 06. Gender */
  gender: 'male' | 'female' | 'other';
  /** 07. Religion */
  religion?: string;
  /** 08. Address */
  address: string;
  /** 09. Telephone number */
  phone?: string;
  /** 10. WhatsApp number */
  whatsapp?: string;
  /** 11. Email address */
  email?: string;
  /** 12. Grade */
  grade: string;
  /** 13. Class — A/B/C for grades 6–11; A/L stream for grades 12–13 */
  section?: string;
  /** 14. Date of admission to school */
  admissionDate: string;
  /** 15. Schools previously attended */
  previousSchools?: string;
  /** 16. Medium of study */
  mediumOfStudy?: string;
  /** 17. Aesthetics subject currently being studied */
  aestheticsSubject?: string;
  /** 18. Name of parent/Guardian */
  parentName: string;
  /** 19. Contact number of parent/Guardian */
  parentPhone: string;
  parentEmail?: string;
  /** 20. NIC number of parent/Guardian */
  parentNic?: string;
  /** 21. Occupation of Parent/Guardian */
  parentOccupation?: string;
  /** 22. Names of siblings (If any) */
  siblings?: string;
  /** 23. Grades in which they are studying */
  siblingGrades?: string;
  /** 24. Special disabilities (if any) */
  specialDisabilities?: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  nationality?: string;
  bloodGroup?: string;
  /** Form Timestamp from CSV import */
  formSubmittedAt?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Matches Google Form: Staff members data collection form (Responses) */
export interface Staff {
  id: string;
  /** Internal / linked ID (registration number, teacher no., or STF…) */
  staffId: string;
  /** Form: Name with initials */
  nameWithInitials?: string;
  /** Form: Full name */
  name: string;
  /** Form: Upload your Profile photo */
  profileImageUrl?: string;
  /** Form: National Identity Card Number */
  nic: string;
  /** Form: Registration Number */
  registrationNumber?: string;
  /** Form: Class and Grade (e.g. SLTS-2II) */
  classAndGrade?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  /** Form: Marital Status */
  maritalStatus?: string;
  spouseName?: string;
  spouseAddress?: string;
  spousePhone?: string;
  /** Form: Date of first Appointment */
  firstAppointmentDate?: string;
  /** Form: Date of Appointment to this school — maps to joinedDate */
  joinedDate: string;
  /** Form: Previously served schools */
  previousSchools?: string;
  /** Form: Educational Qualifications */
  educationalQualifications?: string;
  /** Form: Professional Qualifications */
  professionalQualifications?: string;
  /** Combined for display / legacy */
  qualification?: string;
  /** Form: Appointed Subject */
  appointedSubject?: string;
  /** Form: Subjects Taught (also stored as subjects[]) */
  subjectsTaught?: string;
  subjects?: string[];
  /** Form: Grades Taught */
  gradesTaught?: string;
  /** Form: This school's teacher's Number */
  teacherNumber?: string;
  address: string;
  phone: string;
  whatsapp?: string;
  /** Form: Email Address 2 — primary work email */
  email: string;
  /** Form: Staff Classification (e.g. Teacher) */
  staffClassification?: string;
  staffType: 'academic' | 'non-academic';
  designation: string;
  department?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: 'active' | 'inactive' | 'retired';
  /** Form Timestamp */
  formSubmittedAt?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Examination {
  id: string;
  examName: string;
  year: number;
  term: string;
  grade: string;
  /** Class A/B/C (grades 6–11) or A/L stream (grades 12–13). */
  section: string;
  examDate: string;
  totalSubjects?: number;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubjectResult {
  subject: string;
  maxMarks: number;
  obtainedMarks: number;
  grade: string;
  /** True when the student did not appear for this subject (shown as AB). */
  absent?: boolean;
}

export interface ExamResult {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  examinationId: string;
  examName: string;
  grade: string;
  year: number;
  term: string;
  subjects: SubjectResult[];
  totalMaxMarks: number;
  totalObtainedMarks: number;
  percentage: number;
  rank?: number;
  remarks?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LoginAccountCounts {
  staffLogins: number;
  studentLogins: number;
  parentLogins: number;
  totalLogins: number;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  activeStaff: number;
  academicStaff: number;
  nonAcademicStaff: number;
  totalExaminations: number;
  loginAccounts: LoginAccountCounts;
}

export type Grade =
  | 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5'
  | 'Grade 6' | 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10'
  | 'Grade 11' | 'Grade 12' | 'Grade 13';

export const GRADES: Grade[] = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12', 'Grade 13',
];

export const SUBJECTS = [
  'Mathematics', 'Science', 'Sinhala', 'English', 'Tamil',
  'History', 'Geography', 'Civics', 'Buddhism', 'Christianity',
  'Islam', 'Hinduism', 'Art', 'Music', 'Drama',
  'Physical Education', 'ICT', 'Agriculture', 'Commerce',
  'Accounting', 'Economics', 'Business Studies',
  'Physics', 'Chemistry', 'Biology', 'Combined Mathematics',
  'Health Science', 'Engineering Technology', 'Bio Systems Technology',
];

export const GRADE_LETTERS = ['A', 'B', 'C', 'S', 'F'];

/** Matches school inventory spreadsheet: Data Base-Inventry.csv */
export type InventoryAssetStatus =
  | 'active'
  | 'in_use'
  | 'in_storage'
  | 'damaged'
  | 'disposed'
  | 'lost';

export interface InventoryItem {
  id: string;
  /** Assest Name */
  assetName: string;
  /** Assest type */
  assetType?: string;
  /** Assest Status */
  assetStatus: InventoryAssetStatus | string;
  location?: string;
  serialNo?: string;
  model?: string;
  /** Name of the book (library items) */
  bookName?: string;
  pageNumber?: string;
  /** Number of Item */
  quantity: number;
  /** Date Entered */
  dateEntered?: string;
  /** From Whom received */
  receivedFrom?: string;
  /** Other / additional notes */
  other?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const INVENTORY_ASSET_STATUSES: { value: InventoryAssetStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'in_use', label: 'In use' },
  { value: 'in_storage', label: 'In storage' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'disposed', label: 'Disposed' },
  { value: 'lost', label: 'Lost' },
];

export const INVENTORY_ASSET_TYPES = [
  'Furniture',
  'IT Equipment',
  'Book',
  'Sports Equipment',
  'Laboratory',
  'Office Supplies',
  'Vehicle',
  'Building',
  'Other',
] as const;

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface TimetablePeriod {
  period: number;
  subject: string;
  teacherName?: string;
  teacherStaffId?: string;
  room?: string;
}

export interface TimetableDaySchedule {
  day: Weekday;
  periods: TimetablePeriod[];
}

export interface ClassTimetable {
  id: string;
  title: string;
  grade: string;
  section: string;
  academicYear: number;
  term: string;
  schedule: TimetableDaySchedule[];
  notes?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** School-wide integrations (`school_settings/integrations`). */
export interface SchoolIntegrations {
  /** Official school WhatsApp number (local format, e.g. 0771234567). */
  whatsappPhone?: string | null;
  whatsappConnectedAt?: Timestamp | null;
  whatsappUpdatedByUid?: string | null;
  whatsappUpdatedByName?: string | null;
  updatedAt?: Timestamp;
}
