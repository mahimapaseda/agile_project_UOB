'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  RefreshCcw,
  UserIcon,
  IdCard,
  Phone,
  Mail,
  MapPin,
  Users,
  GraduationCap,
  StickyNote,
  CalendarDays,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addStudent, updateStudent } from '@/lib/firestore';
import { getCachedStudents } from '@/lib/client-data-cache';
import { getStudentsForProfile } from '@/lib/students-for-profile';
import { useAuth } from '@/lib/auth-context';
import { Student, GRADES } from '@/types';
import { STUDENT_FIELD_LABELS as L } from '@/lib/student-form-fields';
import { normalizeIdentityNumber } from '@/lib/identity-numbers';
import { DEFAULT_STUDENT_INDEX, suggestNextStudentIndexNumber } from '@/lib/student-index';
import {
  formatClassSection,
  getClassFieldHint,
  getClassFieldLabel,
  getClassOptionsForGrade,
  getDefaultClassSection,
  isAdvancedLevelGrade,
  normalizeClassSection,
} from '@/lib/grade-class-options';
import {
  AESTHETIC_STUDIES_LABEL,
  AESTHETIC_STUDIES_OPTIONS,
  isGrade6to9,
} from '@/lib/exam-subjects';
import { cn, formatDate, calculateAge } from '@/lib/utils';
import { StatIconBadge } from '@/components/ui/StatIconBadge';
import { ProfileImageUrlField } from '@/components/ProfileImageUrlField';
import { ProfileImagePreview } from '@/components/ProfileImagePreview';

const schema = z.object({
  admissionNumber: z.string().min(1, 'Required'),
  nameWithInitials: z.string().optional(),
  name: z.string().min(2, 'Full name required'),
  profileImageUrl: z.string().optional(),
  nic: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Required'),
  gender: z.enum(['male', 'female', 'other']),
  religion: z.string().optional(),
  address: z.string().min(5, 'Address required'),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  grade: z.string().min(1, 'Grade required'),
  section: z.string().optional(),
  admissionDate: z.string().min(1, 'Required'),
  previousSchools: z.string().optional(),
  mediumOfStudy: z.string().optional(),
  aestheticsSubject: z.string().optional(),
  parentName: z.string().min(2, 'Parent name required'),
  parentPhone: z.string().min(9, 'Parent phone required'),
  parentEmail: z.string().email().optional().or(z.literal('')),
  parentNic: z.string().optional(),
  parentOccupation: z.string().optional(),
  siblings: z.string().optional(),
  siblingGrades: z.string().optional(),
  specialDisabilities: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated', 'transferred']),
  nationality: z.string().optional(),
  bloodGroup: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function formToPayload(data: FormData): Omit<Student, 'id' | 'createdAt' | 'updatedAt'> {
  const entries = Object.entries(data).map(([k, v]) => {
    if (k === 'section' && typeof v === 'string') {
      const normalized = normalizeClassSection(data.grade, v);
      return [k, normalized === '' ? undefined : normalized];
    }
    if ((k === 'nic' || k === 'parentNic') && typeof v === 'string') {
      return [k, normalizeIdentityNumber(v) ?? undefined];
    }
    return [k, v === '' ? undefined : v];
  });
  return Object.fromEntries(entries) as Omit<Student, 'id' | 'createdAt' | 'updatedAt'>;
}

function studentToDefaults(student: Student): FormData {
  return {
    admissionNumber: student.admissionNumber,
    nameWithInitials: student.nameWithInitials || '',
    name: student.name,
    profileImageUrl: student.profileImageUrl || '',
    nic: normalizeIdentityNumber(student.nic) || '',
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    religion: student.religion || '',
    address: student.address,
    phone: student.phone || '',
    whatsapp: student.whatsapp || '',
    email: student.email || '',
    grade: student.grade,
    section: normalizeClassSection(student.grade, student.section) || '',
    admissionDate: student.admissionDate,
    previousSchools: student.previousSchools || '',
    mediumOfStudy: student.mediumOfStudy || '',
    aestheticsSubject: student.aestheticsSubject || '',
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    parentEmail: student.parentEmail || '',
    parentNic: normalizeIdentityNumber(student.parentNic) || '',
    parentOccupation: student.parentOccupation || '',
    siblings: student.siblings || '',
    siblingGrades: student.siblingGrades || '',
    specialDisabilities: student.specialDisabilities || '',
    status: student.status,
    nationality: student.nationality || 'Sri Lankan',
    bloodGroup: student.bloodGroup || '',
    notes: student.notes || '',
  };
}

type Accent = 'blue' | 'indigo' | 'violet' | 'amber';
type StepId =
  | 'identity'
  | 'personal'
  | 'contact'
  | 'academic'
  | 'parent'
  | 'family'
  | 'review';

interface StepDef {
  id: StepId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  accent: Accent;
  validate: (keyof FormData)[];
}

const STEPS: StepDef[] = [
  {
    id: 'identity',
    label: 'Identity & Photo',
    shortLabel: 'Identity',
    description: 'Index number, names and profile picture',
    icon: IdCard,
    accent: 'blue',
    validate: ['admissionNumber', 'name'],
  },
  {
    id: 'personal',
    label: 'Personal Details',
    shortLabel: 'Personal',
    description: 'Date of birth, gender, religion and address',
    icon: UserIcon,
    accent: 'indigo',
    validate: ['dateOfBirth', 'gender', 'address'],
  },
  {
    id: 'contact',
    label: 'Contact Information',
    shortLabel: 'Contact',
    description: 'Student phone, WhatsApp and email',
    icon: Phone,
    accent: 'violet',
    validate: [],
  },
  {
    id: 'academic',
    label: 'Academic Information',
    shortLabel: 'Academic',
    description: 'Grade, class, admission and school history',
    icon: GraduationCap,
    accent: 'blue',
    validate: ['grade', 'admissionDate', 'status'],
  },
  {
    id: 'parent',
    label: 'Parent / Guardian',
    shortLabel: 'Parent',
    description: 'Guardian name, contact and occupation',
    icon: Users,
    accent: 'indigo',
    validate: ['parentName', 'parentPhone'],
  },
  {
    id: 'family',
    label: 'Family & Additional',
    shortLabel: 'Family',
    description: 'Siblings and special needs',
    icon: Heart,
    accent: 'amber',
    validate: [],
  },
  {
    id: 'review',
    label: 'Review & Save',
    shortLabel: 'Review',
    description: 'Verify everything looks right',
    icon: StickyNote,
    accent: 'amber',
    validate: [],
  },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const ACCENT_GRADIENT: Record<Accent, string> = {
  blue: 'from-blue-600 to-blue-800',
  indigo: 'from-indigo-500 to-indigo-700',
  violet: 'from-violet-500 to-violet-700',
  amber: 'from-amber-500 to-amber-600',
};

const FIELD_TO_STEP: Partial<Record<keyof FormData, StepId>> = {
  admissionNumber: 'identity',
  nameWithInitials: 'identity',
  name: 'identity',
  profileImageUrl: 'identity',
  nic: 'identity',
  dateOfBirth: 'personal',
  gender: 'personal',
  religion: 'personal',
  address: 'personal',
  nationality: 'personal',
  bloodGroup: 'personal',
  phone: 'contact',
  whatsapp: 'contact',
  email: 'contact',
  grade: 'academic',
  section: 'academic',
  admissionDate: 'academic',
  status: 'academic',
  previousSchools: 'academic',
  mediumOfStudy: 'academic',
  aestheticsSubject: 'academic',
  parentName: 'parent',
  parentPhone: 'parent',
  parentEmail: 'parent',
  parentNic: 'parent',
  parentOccupation: 'parent',
  siblings: 'family',
  siblingGrades: 'family',
  specialDisabilities: 'family',
  notes: 'review',
};

interface StudentFormProps {
  student?: Student;
  isEdit?: boolean;
}

export function StudentForm({ student, isEdit }: StudentFormProps) {
  const { userProfile, linkedStaff } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stepIdx, setStepIdx] = useState(0);
  const [profileFilePreview, setProfileFilePreview] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: student
      ? studentToDefaults(student)
      : {
          admissionNumber: DEFAULT_STUDENT_INDEX,
          admissionDate: new Date().toISOString().split('T')[0],
          status: 'active',
          nationality: 'Sri Lankan',
          gender: 'male',
        },
  });

  const assignNextIndexNumber = async (extraNumbers: string[] = []) => {
    const cached = getCachedStudents<Student>();
    const students =
      cached ??
      (await getStudentsForProfile(userProfile, undefined, undefined, { linkedStaff }));
    const used = [...students.map((s) => s.admissionNumber), ...extraNumbers];
    setValue('admissionNumber', suggestNextStudentIndexNumber(used));
  };

  useEffect(() => {
    if (!isEdit && userProfile) void assignNextIndexNumber();
  }, [isEdit, userProfile]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    control,
    formState: { errors },
  } = form;

  useEffect(() => {
    return () => {
      if (profileFilePreview) URL.revokeObjectURL(profileFilePreview);
    };
  }, [profileFilePreview]);

  const gender = watch('gender');
  const status = watch('status');
  const grade = watch('grade');
  const section = watch('section');

  useEffect(() => {
    if (!grade) return;
    const normalized = normalizeClassSection(grade, section);
    const valid = getClassOptionsForGrade(grade).some((o) => o.value === normalized);
    if (!valid && section) {
      setValue('section', getDefaultClassSection(grade));
    } else if (normalized && normalized !== section) {
      setValue('section', normalized);
    }
  }, [grade, section, setValue]);
  const nameLive = watch('name');
  const initialsLive = watch('nameWithInitials');
  const admissionLive = watch('admissionNumber');
  const profileImageLive = watch('profileImageUrl');
  const profileImagePreviewSrc = profileFilePreview ?? profileImageLive;
  const bloodGroup = watch('bloodGroup');

  const visibleSteps = useMemo(() => STEPS, []);

  useEffect(() => {
    if (stepIdx > visibleSteps.length - 1) {
      setStepIdx(Math.max(0, visibleSteps.length - 1));
    }
  }, [visibleSteps.length, stepIdx]);

  const currentStep = visibleSteps[Math.min(stepIdx, visibleSteps.length - 1)];
  const isLastStep = stepIdx === visibleSteps.length - 1;

  const initials = (initialsLive || nameLive || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const goNext = async () => {
    if (currentStep.validate.length > 0) {
      const ok = await trigger(currentStep.validate, { shouldFocus: true });
      if (!ok) return;
    }
    if (stepIdx < visibleSteps.length - 1) {
      setStepIdx(stepIdx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (targetIdx: number) => {
    if (targetIdx <= stepIdx) {
      setStepIdx(targetIdx);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');
    try {
      const payload = formToPayload(data);
      if (isEdit && student) {
        await updateStudent(student.id, payload);
      } else {
        await addStudent(payload);
      }
      router.push('/dashboard/students');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        setError(
          'Permission denied. Sign in as staff (principal, teacher, etc.) and publish firestore.rules.',
        );
      } else if (msg.includes('undefined') || msg.includes('invalid data')) {
        setError('Could not save: invalid field data. Clear optional fields or try again.');
      } else {
        setError(msg ? `Could not save: ${msg}` : 'Failed to save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = () => {
    for (const key of Object.keys(errors) as (keyof FormData)[]) {
      const stepId = FIELD_TO_STEP[key];
      if (stepId) {
        const idx = visibleSteps.findIndex((s) => s.id === stepId);
        if (idx !== -1) {
          setStepIdx(idx);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        }
      }
    }
  };

  const fieldError = (name: keyof FormData) =>
    errors[name]?.message as string | undefined;

  const errorCount = Object.keys(errors).length;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-5"
    >
      <IdentityStrip
        initials={initials}
        name={nameLive || 'Untitled student'}
        admissionNumber={admissionLive || '—'}
        grade={grade}
        section={section}
        status={status}
        profileImageUrl={profileImagePreviewSrc}
        isEdit={!!isEdit}
      />

      <Stepper steps={visibleSteps} currentIdx={stepIdx} onJump={goToStep} />

      <StepHeader step={currentStep} currentIdx={stepIdx} total={visibleSteps.length} />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {currentStep.id === 'identity' && (
            <IdentityStep
              control={control}
              register={register}
              fieldError={fieldError}
              regenerateAdmission={() => void assignNextIndexNumber([admissionLive].filter(Boolean))}
              profileImageUrl={profileImagePreviewSrc}
              initials={initials}
              name={nameLive}
              onImageFile={(_dataUrl, previewUrl) => {
                if (profileFilePreview) URL.revokeObjectURL(profileFilePreview);
                setProfileFilePreview(previewUrl);
              }}
              onClearFilePreview={() => {
                if (profileFilePreview) URL.revokeObjectURL(profileFilePreview);
                setProfileFilePreview(null);
              }}
            />
          )}
          {currentStep.id === 'personal' && (
            <PersonalStep
              register={register}
              fieldError={fieldError}
              gender={gender}
              bloodGroup={bloodGroup}
              setGender={(v) => setValue('gender', v)}
              setBloodGroup={(v) => setValue('bloodGroup', v)}
            />
          )}
          {currentStep.id === 'contact' && (
            <ContactStep register={register} fieldError={fieldError} />
          )}
          {currentStep.id === 'academic' && (
            <AcademicStep
              register={register}
              fieldError={fieldError}
              grade={grade}
              section={section ?? ''}
              status={status}
              aestheticsSubject={watch('aestheticsSubject')}
              setGrade={(v) => setValue('grade', v)}
              setSection={(v) => setValue('section', v)}
              setStatus={(v) => setValue('status', v)}
              setAestheticsSubject={(v) => setValue('aestheticsSubject', v)}
            />
          )}
          {currentStep.id === 'parent' && (
            <ParentStep register={register} fieldError={fieldError} />
          )}
          {currentStep.id === 'family' && <FamilyStep register={register} />}
          {currentStep.id === 'review' && (
            <ReviewStep
              register={register}
              values={form.getValues()}
              errorCount={errorCount}
              jumpToStep={(id) => {
                const idx = visibleSteps.findIndex((s) => s.id === id);
                if (idx !== -1) setStepIdx(idx);
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={stepIdx === 0 ? () => router.back() : goBack}
          className="h-11 w-full justify-center gap-2 sm:h-10 sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          {stepIdx === 0 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {!isLastStep ? (
            <Button
              type="button"
              onClick={() => void goNext()}
              className="h-11 w-full justify-center gap-2 bg-blue-700 hover:bg-blue-800 sm:h-10 sm:w-auto sm:min-w-36"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full justify-center gap-2 bg-blue-700 hover:bg-blue-800 sm:h-10 sm:w-auto sm:min-w-44"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEdit ? 'Update student' : 'Save student'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <p className="pb-2 text-center text-[11px] text-slate-400 sm:text-left">
        Step {stepIdx + 1} of {visibleSteps.length} · Matches Google Form / CSV import fields
      </p>
    </form>
  );
}

/* ─── Identity strip (blue theme) ───────────────────────────────────────── */

function IdentityStrip({
  initials,
  name,
  admissionNumber,
  grade,
  section,
  status,
  profileImageUrl,
  isEdit,
}: {
  initials: string;
  name: string;
  admissionNumber: string;
  grade?: string;
  section?: string;
  status: Student['status'];
  profileImageUrl?: string;
  isEdit: boolean;
}) {
  return (
    <motion.section
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="surface-blue relative overflow-hidden rounded-2xl border border-slate-200/80 px-3 py-3 shadow-lg shadow-blue-900/15 sm:px-5 sm:py-4"
    >
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-400/20 blur-3xl" aria-hidden />

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div className="relative shrink-0">
          <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/10 ring-2 ring-white/30 sm:h-16 sm:w-16">
            <ProfileImagePreview
              src={profileImageUrl}
              alt={name}
              initials={initials}
              imageClassName="h-full w-full object-cover"
              fallbackClassName="flex h-full w-full items-center justify-center bg-blue-100 text-base font-extrabold text-blue-900 sm:text-lg"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-amber-950 shadow-md">
            {isEdit ? 'Edit' : 'New'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-blue-200">
            {isEdit ? 'Editing student' : 'Adding a new student'}
          </p>
          <h2 className="mt-0.5 truncate text-base font-extrabold leading-tight sm:text-lg">
            {name}
          </h2>
          <p className="truncate font-mono text-[11px] font-semibold text-blue-200 sm:text-xs">
            {admissionNumber}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {grade && (
              <Badge
                variant="default"
                className="border-white/20 bg-white/15 text-[9.5px] text-white"
              >
                {grade}
                {section ? ` · ${section}` : ''}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[9.5px] capitalize">
              {status}
            </Badge>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Stepper({
  steps,
  currentIdx,
  onJump,
}: {
  steps: StepDef[];
  currentIdx: number;
  onJump: (idx: number) => void;
}) {
  const percent = ((currentIdx + 1) / steps.length) * 100;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4">
      <div className="mb-3 flex items-center gap-3">
        <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Progress
        </p>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="h-full rounded-full accent-bar-blue"
          />
        </div>
        <p className="shrink-0 text-[11px] font-bold tabular-nums text-blue-700">
          {currentIdx + 1}/{steps.length}
        </p>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scroll-touch snap-x snap-mandatory">
        {steps.map((s, idx) => {
          const isActive = idx === currentIdx;
          const isDone = idx < currentIdx;
          const clickable = idx <= currentIdx;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => clickable && onJump(idx)}
              disabled={!clickable}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-2 text-[11.5px] font-semibold transition-all',
                'min-h-[40px] sm:min-h-[34px]',
                isActive &&
                  'border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-900/20',
                !isActive &&
                  isDone &&
                  'border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-400',
                !isActive && !isDone && 'border-slate-200 bg-white text-slate-500',
                !clickable && 'cursor-not-allowed opacity-80',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold',
                  isActive && 'bg-white/20 text-white',
                  !isActive && isDone && 'bg-blue-600 text-white',
                  !isActive && !isDone && 'bg-slate-100 text-slate-500',
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </span>
              <span className="whitespace-nowrap">{s.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepHeader({
  step,
  currentIdx,
  total,
}: {
  step: StepDef;
  currentIdx: number;
  total: number;
}) {
  const Icon = step.icon;
  return (
    <div className="flex items-center gap-3 px-1">
      <StatIconBadge icon={Icon} accent={ACCENT_GRADIENT[step.accent]} size="md" className="shadow-md" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Step {currentIdx + 1} of {total}
        </p>
        <h2 className="truncate text-base font-extrabold leading-tight text-slate-900 sm:text-lg">
          {step.label}
        </h2>
        <p className="truncate text-[11.5px] text-slate-500 sm:text-xs">{step.description}</p>
      </div>
    </div>
  );
}

type Register = ReturnType<typeof useForm<FormData>>['register'];
type Control = ReturnType<typeof useForm<FormData>>['control'];

function IdentityStep({
  control,
  register,
  fieldError,
  regenerateAdmission,
  profileImageUrl,
  initials,
  name,
  onImageFile,
  onClearFilePreview,
}: {
  control: Control;
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
  regenerateAdmission: () => void;
  profileImageUrl?: string;
  initials: string;
  name?: string;
  onImageFile: (dataUrl: string, previewUrl: string) => void;
  onClearFilePreview: () => void;
}) {
  return (
    <StepCard accent="blue">
      <div className="mb-5 flex flex-col items-stretch gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="flex shrink-0 justify-center sm:justify-start">
          <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ProfileImagePreview
              src={profileImageUrl}
              alt={name || 'Student'}
              initials={initials}
              imageClassName="h-full w-full object-cover"
              fallbackClassName="flex h-full w-full items-center justify-center bg-blue-100 text-2xl font-extrabold text-blue-900"
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <Controller
            name="profileImageUrl"
            control={control}
            render={({ field }) => (
              <ProfileImageUrlField
                label={L.profileImageUrl}
                value={field.value ?? ''}
                onChange={field.onChange}
                onImageFile={onImageFile}
                onClearFile={onClearFilePreview}
                placeholder="https://..."
              />
            )}
          />
        </div>
      </div>

      <Grid>
        <Field label={L.admissionNumber} required error={fieldError('admissionNumber')}>
          <div className="relative">
            <Input
              {...register('admissionNumber')}
              placeholder="1234"
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={regenerateAdmission}
              title="Generate new index number"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-700"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </Field>
        <Field label={L.nameWithInitials} hint="e.g. K. Silva">
          <Input {...register('nameWithInitials')} placeholder="K. Silva" />
        </Field>
        <Field label={L.name} required error={fieldError('name')} span={2}>
          <Input {...register('name')} placeholder="Full legal name" />
        </Field>
        <Field label={L.nic} hint="Student NIC if applicable">
          <Input {...register('nic')} placeholder="NIC number" />
        </Field>
      </Grid>
    </StepCard>
  );
}

function PersonalStep({
  register,
  fieldError,
  gender,
  bloodGroup,
  setGender,
  setBloodGroup,
}: {
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
  gender: FormData['gender'];
  bloodGroup?: string;
  setGender: (v: FormData['gender']) => void;
  setBloodGroup: (v: string) => void;
}) {
  return (
    <StepCard accent="indigo">
      <Grid>
        <Field label={L.dateOfBirth} required error={fieldError('dateOfBirth')}>
          <IconInput icon={CalendarDays}>
            <Input type="date" {...register('dateOfBirth')} className="pl-9" />
          </IconInput>
        </Field>

        <Field label={L.gender} required>
          <ChipGroup
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
            value={gender}
            onChange={(v) => setGender(v as FormData['gender'])}
            accent="indigo"
          />
        </Field>

        <Field label={L.religion}>
          <Input {...register('religion')} placeholder="e.g. Buddhism" />
        </Field>

        <Field label="Nationality">
          <Input {...register('nationality')} placeholder="Sri Lankan" />
        </Field>

        <Field label="Blood group">
          <Select
            value={bloodGroup || '__none__'}
            onValueChange={(v) => setBloodGroup(v === '__none__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not set</SelectItem>
              {BLOOD_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={L.address} required error={fieldError('address')} span={2}>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Textarea
              {...register('address')}
              rows={3}
              placeholder="Street, town, district"
              className="pl-9"
            />
          </div>
        </Field>
      </Grid>
    </StepCard>
  );
}

function ContactStep({
  register,
  fieldError,
}: {
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
}) {
  return (
    <StepCard accent="violet">
      <p className="mb-4 text-[11.5px] text-slate-500">
        All contact fields are optional but recommended for reaching the student.
      </p>
      <Grid>
        <Field label={L.phone}>
          <IconInput icon={Phone}>
            <Input {...register('phone')} type="tel" placeholder="0771234567" className="pl-9" />
          </IconInput>
        </Field>
        <Field label={L.whatsapp}>
          <IconInput icon={Phone}>
            <Input {...register('whatsapp')} type="tel" className="pl-9" />
          </IconInput>
        </Field>
        <Field label={L.email} error={fieldError('email')} span={2}>
          <IconInput icon={Mail}>
            <Input
              {...register('email')}
              type="email"
              placeholder="student@school.lk"
              className="pl-9"
            />
          </IconInput>
        </Field>
      </Grid>
    </StepCard>
  );
}

function AcademicStep({
  register,
  fieldError,
  grade,
  section,
  status,
  aestheticsSubject,
  setGrade,
  setSection,
  setStatus,
  setAestheticsSubject,
}: {
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
  grade: string;
  section: string;
  status: FormData['status'];
  aestheticsSubject?: string;
  setGrade: (v: string) => void;
  setSection: (v: string) => void;
  setStatus: (v: FormData['status']) => void;
  setAestheticsSubject: (v: string) => void;
}) {
  const classOptions = grade ? getClassOptionsForGrade(grade) : [];
  const classLabel = grade ? getClassFieldLabel(grade) : L.section;

  return (
    <StepCard accent="blue">
      <Grid>
        <Field label={L.grade} required error={fieldError('grade')}>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger>
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={classLabel}
          hint={grade ? getClassFieldHint(grade) : undefined}
        >
          {grade && classOptions.length > 0 ? (
            <Select value={section || undefined} onValueChange={setSection}>
              <SelectTrigger>
                <SelectValue placeholder={classLabel} />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} textValue={opt.label}>
                    <div className="flex flex-col py-0.5">
                      <span>{opt.label}</span>
                      {opt.hint ? (
                        <span className="text-[10px] font-normal leading-tight text-slate-500">
                          {opt.hint}
                        </span>
                      ) : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input {...register('section')} placeholder="A" disabled={!grade} />
          )}
        </Field>
        <Field label={L.admissionDate} required error={fieldError('admissionDate')}>
          <IconInput icon={CalendarDays}>
            <Input type="date" {...register('admissionDate')} className="pl-9" />
          </IconInput>
        </Field>
        <Field label="Status" required>
          <ChipGroup
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'graduated', label: 'Graduated' },
              { value: 'transferred', label: 'Transferred' },
            ]}
            value={status}
            onChange={(v) => setStatus(v as FormData['status'])}
            accent="blue"
          />
        </Field>
        <Field label={L.previousSchools} span={2}>
          <Textarea {...register('previousSchools')} rows={2} />
        </Field>
        <Field label={L.mediumOfStudy} hint="Sinhala / Tamil / English">
          <Input {...register('mediumOfStudy')} />
        </Field>
        {isGrade6to9(grade) ? (
          <Field label={AESTHETIC_STUDIES_LABEL} hint="Select one option" span={2}>
            <Select
              value={aestheticsSubject || undefined}
              onValueChange={setAestheticsSubject}
            >
              <SelectTrigger>
                <SelectValue placeholder={AESTHETIC_STUDIES_LABEL} />
              </SelectTrigger>
              <SelectContent>
                {AESTHETIC_STUDIES_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : isAdvancedLevelGrade(grade) ? (
          <Field label={L.alSubjects} hint="Three A/L subjects from the form" span={2}>
            <Input {...register('aestheticsSubject')} placeholder="e.g. Physics, Chemistry, Biology" />
          </Field>
        ) : (
          <Field label={L.aestheticsSubject} hint="If applicable">
            <Input {...register('aestheticsSubject')} placeholder="Optional" />
          </Field>
        )}
      </Grid>
    </StepCard>
  );
}

function ParentStep({
  register,
  fieldError,
}: {
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
}) {
  return (
    <StepCard accent="indigo">
      <Grid>
        <Field label={L.parentName} required error={fieldError('parentName')}>
          <Input {...register('parentName')} placeholder="Full name of parent/guardian" />
        </Field>
        <Field label={L.parentPhone} required error={fieldError('parentPhone')}>
          <IconInput icon={Phone}>
            <Input {...register('parentPhone')} type="tel" className="pl-9" />
          </IconInput>
        </Field>
        <Field label={L.parentNic}>
          <Input {...register('parentNic')} />
        </Field>
        <Field label={L.parentOccupation}>
          <Input {...register('parentOccupation')} />
        </Field>
        <Field label="Parent email (optional)" error={fieldError('parentEmail')} span={2}>
          <IconInput icon={Mail}>
            <Input {...register('parentEmail')} type="email" className="pl-9" />
          </IconInput>
        </Field>
      </Grid>
    </StepCard>
  );
}

function FamilyStep({ register }: { register: Register }) {
  return (
    <StepCard accent="amber">
      <Grid>
        <Field label={L.siblings} span={2}>
          <Input {...register('siblings')} placeholder="Names of siblings (if any)" />
        </Field>
        <Field label={L.siblingGrades} span={2}>
          <Input {...register('siblingGrades')} placeholder="Grades they are studying" />
        </Field>
        <Field label={L.specialDisabilities} span={2}>
          <Textarea
            {...register('specialDisabilities')}
            rows={3}
            placeholder="Any special disabilities or medical notes"
          />
        </Field>
      </Grid>
    </StepCard>
  );
}

function ReviewStep({
  register,
  values,
  errorCount,
  jumpToStep,
}: {
  register: Register;
  values: FormData;
  errorCount: number;
  jumpToStep: (id: StepId) => void;
}) {
  const display = (v?: string | null) => {
    if (v === undefined || v === null) return '—';
    const t = String(v).trim();
    return t === '' ? '—' : t;
  };

  const age = values.dateOfBirth ? calculateAge(values.dateOfBirth) : null;

  return (
    <div className="space-y-4">
      {errorCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {errorCount} field{errorCount !== 1 ? 's' : ''} need attention before saving
            </p>
            <p className="text-xs">Use the step buttons above to fix them.</p>
          </div>
        </div>
      )}

      <ReviewCard
        title="Identity"
        icon={IdCard}
        accent="blue"
        onEdit={() => jumpToStep('identity')}
        rows={[
          { label: L.admissionNumber, value: display(values.admissionNumber) },
          { label: L.name, value: display(values.name) },
          { label: L.nameWithInitials, value: display(values.nameWithInitials) },
          { label: L.nic, value: display(values.nic) },
        ]}
      />

      <ReviewCard
        title="Personal"
        icon={UserIcon}
        accent="indigo"
        onEdit={() => jumpToStep('personal')}
        rows={[
          {
            label: L.dateOfBirth,
            value: values.dateOfBirth
              ? `${formatDate(values.dateOfBirth)}${age !== null ? ` · ${age}y` : ''}`
              : '—',
          },
          { label: L.gender, value: display(values.gender) },
          { label: L.religion, value: display(values.religion) },
          { label: 'Nationality', value: display(values.nationality) },
          { label: 'Blood group', value: display(values.bloodGroup) },
          { label: L.address, value: display(values.address), span: 2 },
        ]}
      />

      <ReviewCard
        title="Contact"
        icon={Phone}
        accent="violet"
        onEdit={() => jumpToStep('contact')}
        rows={[
          { label: L.phone, value: display(values.phone) },
          { label: L.whatsapp, value: display(values.whatsapp) },
          { label: L.email, value: display(values.email) },
        ]}
      />

      <ReviewCard
        title="Academic"
        icon={GraduationCap}
        accent="blue"
        onEdit={() => jumpToStep('academic')}
        rows={[
          {
            label: L.grade,
            value: values.grade
              ? `${values.grade}${
                  values.section ? ` · ${formatClassSection(values.grade, values.section)}` : ''
                }`
              : '—',
          },
          {
            label: L.admissionDate,
            value: values.admissionDate ? formatDate(values.admissionDate) : '—',
          },
          { label: 'Status', value: display(values.status) },
          { label: L.previousSchools, value: display(values.previousSchools), span: 2 },
          { label: L.mediumOfStudy, value: display(values.mediumOfStudy) },
          { label: L.aestheticsSubject, value: display(values.aestheticsSubject) },
        ]}
      />

      <ReviewCard
        title="Parent / guardian"
        icon={Users}
        accent="indigo"
        onEdit={() => jumpToStep('parent')}
        rows={[
          { label: L.parentName, value: display(values.parentName) },
          { label: L.parentPhone, value: display(values.parentPhone) },
          { label: L.parentNic, value: display(values.parentNic) },
          { label: L.parentOccupation, value: display(values.parentOccupation) },
          { label: 'Parent email', value: display(values.parentEmail), span: 2 },
        ]}
      />

      <ReviewCard
        title="Family & additional"
        icon={Heart}
        accent="amber"
        onEdit={() => jumpToStep('family')}
        rows={[
          { label: L.siblings, value: display(values.siblings), span: 2 },
          { label: L.siblingGrades, value: display(values.siblingGrades), span: 2 },
          { label: L.specialDisabilities, value: display(values.specialDisabilities), span: 2 },
        ]}
      />

      <StepCard accent="amber">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">Internal notes</h3>
        </div>
        <p className="mb-3 mt-0.5 text-[11.5px] text-slate-500">
          Staff-only notes (not on the Google Form export)
        </p>
        <Textarea
          {...register('notes')}
          rows={3}
          placeholder="Any additional internal notes..."
        />
      </StepCard>
    </div>
  );
}

function ReviewCard({
  title,
  icon: Icon,
  accent,
  rows,
  onEdit,
}: {
  title: string;
  icon: React.ElementType;
  accent: Accent;
  rows: { label: string; value: string; span?: 1 | 2 }[];
  onEdit: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatIconBadge icon={Icon} accent={ACCENT_GRADIENT[accent]} size="xs" />
          <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11.5px] font-semibold text-blue-700 underline-offset-2 hover:underline"
        >
          Edit
        </button>
      </header>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-2 sm:px-5">
        {rows.map((r) => {
          const empty = r.value === '—';
          return (
            <div
              key={r.label}
              className={cn('flex flex-col gap-0.5', r.span === 2 && 'sm:col-span-2')}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {r.label}
              </p>
              <p
                className={cn(
                  'break-words text-[12.5px] font-medium leading-snug',
                  empty ? 'italic text-slate-400' : 'text-slate-900',
                )}
              >
                {r.value}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StepCard({ children, accent }: { children: React.ReactNode; accent: Accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className={cn('h-1 w-full accent-bar-blue')} />
      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">{children}</div>;
}

function Field({
  label,
  children,
  required,
  hint,
  error,
  span = 1,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  span?: 1 | 2;
}) {
  return (
    <div className={cn('space-y-1.5', span === 2 && 'sm:col-span-2')}>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-[11.5px] font-bold uppercase tracking-wide text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </Label>
        {hint && !error && (
          <span className="truncate text-[10.5px] text-slate-400">{hint}</span>
        )}
      </div>
      {children}
      {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}

function IconInput({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  accent,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent: Accent;
}) {
  const activeClasses: Record<Accent, string> = {
    blue: 'border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-900/15',
    indigo: 'border-indigo-700 bg-indigo-700 text-white shadow-sm shadow-indigo-900/15',
    violet: 'border-violet-700 bg-violet-700 text-white shadow-sm shadow-violet-900/15',
    amber: 'border-amber-500 bg-amber-500 text-amber-950 shadow-sm shadow-amber-900/15',
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all',
              active
                ? activeClasses[accent]
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
