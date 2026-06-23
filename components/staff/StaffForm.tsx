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
  X,
  Search,
  Camera,
  RefreshCcw,
  UserIcon,
  IdCard,
  Phone,
  Mail,
  MapPin,
  Heart,
  Briefcase,
  BookOpen,
  StickyNote,
  CalendarDays,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { addStaff, updateStaff } from '@/lib/firestore';
import { Staff, SUBJECTS } from '@/types';
import { STAFF_FIELD_LABELS as L } from '@/lib/staff-form-fields';
import { describeStaffIdFormat, generateStaffId } from '@/lib/staff-id';
import { generateId, cn, formatDate, calculateAge } from '@/lib/utils';
import { StatIconBadge } from '@/components/ui/StatIconBadge';
import { ProfileImageUrlField } from '@/components/ProfileImageUrlField';
import { ProfileImagePreview } from '@/components/ProfileImagePreview';

/* ─── Schema (unchanged from previous design) ───────────────────────────── */

const schema = z.object({
  staffId: z.string().min(1, 'Required'),
  nameWithInitials: z.string().optional(),
  name: z.string().min(2, 'Full name required'),
  profileImageUrl: z.string().optional(),
  nic: z.string().min(9, 'Valid NIC required'),
  registrationNumber: z.string().optional(),
  classAndGrade: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Required'),
  gender: z.enum(['male', 'female', 'other']),
  maritalStatus: z.string().optional(),
  spouseName: z.string().optional(),
  spouseAddress: z.string().optional(),
  spousePhone: z.string().optional(),
  firstAppointmentDate: z.string().optional(),
  joinedDate: z.string().min(1, 'Required'),
  previousSchools: z.string().optional(),
  educationalQualifications: z.string().optional(),
  professionalQualifications: z.string().optional(),
  appointedSubject: z.string().optional(),
  subjectsTaught: z.string().optional(),
  gradesTaught: z.string().optional(),
  teacherNumber: z.string().optional(),
  address: z.string().min(5, 'Address required'),
  phone: z.string().min(9, 'Phone required'),
  whatsapp: z.string().optional(),
  email: z.string().email('Valid email required'),
  staffClassification: z.string().optional(),
  staffType: z.enum(['academic', 'non-academic']),
  designation: z.string().min(2, 'Designation required'),
  department: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  qualification: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'retired']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function formToPayload(data: FormData): Omit<Staff, 'id' | 'createdAt' | 'updatedAt'> {
  const entries = Object.entries(data).map(([k, v]) => {
    if (k === 'subjects') return [k, v];
    return [k, v === '' ? undefined : v];
  });
  const base = Object.fromEntries(entries) as Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>;
  const edu = data.educationalQualifications?.trim();
  const prof = data.professionalQualifications?.trim();
  const combined = [edu, prof].filter(Boolean).join(' · ');
  if (combined) base.qualification = combined;
  else if (data.qualification) base.qualification = data.qualification;
  base.subjects =
    data.staffType === 'academic' && data.subjects?.length ? data.subjects : undefined;
  return base;
}

function staffToDefaults(staff: Staff): FormData {
  return {
    staffId: staff.staffId,
    nameWithInitials: staff.nameWithInitials || '',
    name: staff.name,
    profileImageUrl: staff.profileImageUrl || '',
    nic: staff.nic,
    registrationNumber: staff.registrationNumber || '',
    classAndGrade: staff.classAndGrade || '',
    dateOfBirth: staff.dateOfBirth,
    gender: staff.gender,
    maritalStatus: staff.maritalStatus || '',
    spouseName: staff.spouseName || '',
    spouseAddress: staff.spouseAddress || '',
    spousePhone: staff.spousePhone || '',
    firstAppointmentDate: staff.firstAppointmentDate || '',
    joinedDate: staff.joinedDate,
    previousSchools: staff.previousSchools || '',
    educationalQualifications: staff.educationalQualifications || '',
    professionalQualifications: staff.professionalQualifications || '',
    appointedSubject: staff.appointedSubject || '',
    subjectsTaught: staff.subjectsTaught || '',
    gradesTaught: staff.gradesTaught || '',
    teacherNumber: staff.teacherNumber || '',
    address: staff.address,
    phone: staff.phone,
    whatsapp: staff.whatsapp || '',
    email: staff.email,
    staffClassification: staff.staffClassification || '',
    staffType: staff.staffType,
    designation: staff.designation,
    department: staff.department || '',
    subjects: staff.subjects || [],
    qualification: staff.qualification || '',
    emergencyContactName: staff.emergencyContactName || '',
    emergencyContactPhone: staff.emergencyContactPhone || '',
    status: staff.status,
    notes: staff.notes || '',
  };
}

/* ─── Step config ───────────────────────────────────────────────────────── */

type Accent = 'emerald' | 'blue' | 'violet' | 'amber';
type StepId =
  | 'identity'
  | 'personal'
  | 'contact'
  | 'spouse'
  | 'employment'
  | 'teaching'
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
    description: 'Names, IDs and profile picture',
    icon: IdCard,
    accent: 'emerald',
    validate: ['name', 'nic'],
  },
  {
    id: 'personal',
    label: 'Personal Details',
    shortLabel: 'Personal',
    description: 'Date of birth, gender, address and family',
    icon: UserIcon,
    accent: 'blue',
    validate: ['dateOfBirth', 'gender', 'address'],
  },
  {
    id: 'contact',
    label: 'Contact Information',
    shortLabel: 'Contact',
    description: 'Phone numbers and email addresses',
    icon: Phone,
    accent: 'violet',
    validate: ['phone', 'email'],
  },
  {
    id: 'spouse',
    label: 'Spouse Information',
    shortLabel: 'Spouse',
    description: 'Spouse name, contact and address',
    icon: Heart,
    accent: 'amber',
    validate: [],
  },
  {
    id: 'employment',
    label: 'Employment Details',
    shortLabel: 'Employment',
    description: 'Role, dates and current status',
    icon: Briefcase,
    accent: 'emerald',
    validate: ['staffType', 'designation', 'joinedDate', 'status'],
  },
  {
    id: 'teaching',
    label: 'Teaching & Qualifications',
    shortLabel: 'Teaching',
    description: 'Subjects, grades and academic credentials',
    icon: BookOpen,
    accent: 'violet',
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

const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

const ACCENT_GRADIENT: Record<Accent, string> = {
  emerald: 'from-emerald-600 to-emerald-800',
  blue: 'from-blue-600 to-blue-800',
  violet: 'from-violet-500 to-violet-700',
  amber: 'from-amber-500 to-amber-600',
};

/* ─── Component ─────────────────────────────────────────────────────────── */

interface StaffFormProps {
  staff?: Staff;
  isEdit?: boolean;
}

export function StaffForm({ staff, isEdit }: StaffFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stepIdx, setStepIdx] = useState(0);
  const [profileFilePreview, setProfileFilePreview] = useState<string | null>(null);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(staff?.subjects || []);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: staff
      ? staffToDefaults(staff)
      : {
          staffId: '',
          joinedDate: new Date().toISOString().split('T')[0],
          status: 'active',
          gender: 'male',
          staffType: 'academic',
          subjects: [],
        },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    trigger,
    control,
    formState: { errors },
  } = form;

  useEffect(() => {
    return () => {
      if (profileFilePreview) URL.revokeObjectURL(profileFilePreview);
    };
  }, [profileFilePreview]);

  const syncStaffIdFromFields = (force = false) => {
    const values = getValues();
    const generated = generateStaffId({
      classAndGrade: values.classAndGrade,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      phone: values.phone,
    });
    if (!generated) return;
    if (!isEdit || force) {
      setValue('staffId', generated, { shouldValidate: true, shouldDirty: true });
    }
  };

  // Watch only what we need for reactive UI; avoid `watch()` no-arg (re-renders on every key)
  const staffType = watch('staffType');
  const maritalStatus = watch('maritalStatus');
  const gender = watch('gender');
  const classAndGrade = watch('classAndGrade');
  const dateOfBirth = watch('dateOfBirth');
  const phone = watch('phone');
  const status = watch('status');
  const nameLive = watch('name');
  const initialsLive = watch('nameWithInitials');
  const staffIdLive = watch('staffId');
  const designationLive = watch('designation');
  const departmentLive = watch('department');
  const profileImageLive = watch('profileImageUrl');
  const profileImagePreviewSrc = profileFilePreview ?? profileImageLive;

  const isMarried = (maritalStatus || '').toLowerCase().includes('married');
  const isAcademic = staffType === 'academic';

  /* ─── Visible steps (auto-skip Spouse/Teaching when not relevant) ──── */

  const visibleSteps = useMemo(
    () =>
      STEPS.filter((s) => {
        if (s.id === 'spouse' && !isMarried) return false;
        if (s.id === 'teaching' && !isAcademic) return false;
        return true;
      }),
    [isMarried, isAcademic],
  );

  // Clamp current step if list shrinks (e.g., user uncheck married)
  useEffect(() => {
    if (stepIdx > visibleSteps.length - 1) {
      setStepIdx(Math.max(0, visibleSteps.length - 1));
    }
  }, [visibleSteps.length, stepIdx]);

  useEffect(() => {
    if (!isEdit) syncStaffIdFromFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when ID parts change
  }, [isEdit, classAndGrade, dateOfBirth, gender, phone]);

  const currentStep = visibleSteps[Math.min(stepIdx, visibleSteps.length - 1)];
  const isLastStep = stepIdx === visibleSteps.length - 1;

  /* ─── Subject picker ─────────────────────────────────────────────── */

  const toggleSubject = (sub: string) => {
    const updated = selectedSubjects.includes(sub)
      ? selectedSubjects.filter((s) => s !== sub)
      : [...selectedSubjects, sub];
    setSelectedSubjects(updated);
    setValue('subjects', updated);
  };

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    if (!q) return SUBJECTS;
    return SUBJECTS.filter((s) => s.toLowerCase().includes(q));
  }, [subjectQuery]);

  /* ─── Step navigation ────────────────────────────────────────────── */

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

  /* ─── Submit ─────────────────────────────────────────────────────── */

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');
    try {
      const autoStaffId = generateStaffId({
        classAndGrade: data.classAndGrade,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        phone: data.phone,
      });
      const staffId = autoStaffId || data.staffId?.trim();
      if (!staffId) {
        setError(
          'Staff ID could not be generated. Enter class/grade, date of birth, gender, and phone.',
        );
        setSaving(false);
        return;
      }
      const payload = formToPayload({
        ...data,
        staffId,
        subjects: selectedSubjects,
      });
      if (isEdit && staff) {
        await updateStaff(staff.id, payload);
      } else {
        await addStaff(payload);
      }
      router.push('/dashboard/staff');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        setError(
          'Permission denied. Sign in as principal or technical officer and publish firestore.rules.',
        );
      } else {
        setError(msg ? `Could not save: ${msg}` : 'Failed to save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = () => {
    // Jump to the first step with an error
    for (let i = 0; i < visibleSteps.length; i++) {
      const step = visibleSteps[i];
      const hasError = step.validate.some((f) => errors[f]);
      if (hasError) {
        setStepIdx(i);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      }
    }
  };

  const fieldError = (name: keyof FormData) =>
    errors[name]?.message as string | undefined;

  /* ─── Derived: initials + completion ─────────────────────────────── */

  const initials = (initialsLive || nameLive || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const errorCount = Object.keys(errors).length;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-5"
    >
      {/* ─── Slim identity strip (always visible, never sticky) ─────── */}
      <IdentityStrip
        initials={initials}
        name={nameLive || 'Untitled staff'}
        staffId={staffIdLive || '—'}
        designation={designationLive}
        department={departmentLive}
        staffType={staffType}
        profileImageUrl={profileImagePreviewSrc}
        isEdit={!!isEdit}
      />

      {/* ─── Stepper (in normal flow, no sticky) ─────────────────────── */}
      <Stepper
        steps={visibleSteps}
        currentIdx={stepIdx}
        onJump={goToStep}
      />

      {/* ─── Step header ──────────────────────────────────────────── */}
      <StepHeader step={currentStep} currentIdx={stepIdx} total={visibleSteps.length} />

      {/* ─── Error banner ─────────────────────────────────────────── */}
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

      {/* ─── Step body ────────────────────────────────────────────── */}
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
              regenerateStaffId={() => {
                const generated = generateStaffId({
                  classAndGrade: getValues('classAndGrade'),
                  dateOfBirth: getValues('dateOfBirth'),
                  gender: getValues('gender'),
                  phone: getValues('phone'),
                });
                setValue('staffId', generated || generateId('STF'), {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
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
              maritalStatus={maritalStatus}
              setGender={(v) => setValue('gender', v)}
              setMaritalStatus={(v) =>
                setValue('maritalStatus', v, { shouldDirty: true })
              }
            />
          )}
          {currentStep.id === 'contact' && (
            <ContactStep register={register} fieldError={fieldError} />
          )}
          {currentStep.id === 'spouse' && (
            <SpouseStep register={register} fieldError={fieldError} />
          )}
          {currentStep.id === 'employment' && (
            <EmploymentStep
              register={register}
              fieldError={fieldError}
              staffType={staffType}
              status={status}
              setStaffType={(v) => setValue('staffType', v)}
              setStatus={(v) => setValue('status', v)}
            />
          )}
          {currentStep.id === 'teaching' && (
            <TeachingStep
              register={register}
              fieldError={fieldError}
              subjectQuery={subjectQuery}
              setSubjectQuery={setSubjectQuery}
              filteredSubjects={filteredSubjects}
              selectedSubjects={selectedSubjects}
              toggleSubject={toggleSubject}
              clearSubjects={() => {
                setSelectedSubjects([]);
                setValue('subjects', []);
              }}
            />
          )}
          {currentStep.id === 'review' && (
            <ReviewStep
              register={register}
              values={form.getValues()}
              selectedSubjects={selectedSubjects}
              errorCount={errorCount}
              isAcademic={isAcademic}
              isMarried={isMarried}
              jumpToStep={(id) => {
                const idx = visibleSteps.findIndex((s) => s.id === id);
                if (idx !== -1) setStepIdx(idx);
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── Footer nav (in flow, NOT fixed) ──────────────────────── */}
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

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          {!isLastStep ? (
            <Button
              type="button"
              onClick={() => void goNext()}
              className="h-11 w-full justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 sm:h-10 sm:w-auto sm:min-w-36"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 sm:h-10 sm:w-auto sm:min-w-44"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEdit ? 'Update staff' : 'Save staff'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <p className="pb-2 text-center text-[11px] text-slate-400 sm:text-left">
        Step {stepIdx + 1} of {visibleSteps.length} ·{' '}
        {visibleSteps.length === STEPS.length
          ? 'All sections included'
          : `${STEPS.length - visibleSteps.length} section${
              STEPS.length - visibleSteps.length !== 1 ? 's' : ''
            } skipped (not applicable)`}
      </p>
    </form>
  );
}

/* ─── Identity strip ────────────────────────────────────────────────────── */

function IdentityStrip({
  initials,
  name,
  staffId,
  designation,
  department,
  staffType,
  profileImageUrl,
  isEdit,
}: {
  initials: string;
  name: string;
  staffId: string;
  designation?: string;
  department?: string;
  staffType: 'academic' | 'non-academic';
  profileImageUrl?: string;
  isEdit: boolean;
}) {
  return (
    <motion.section
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="surface-emerald relative overflow-hidden rounded-2xl border border-slate-200/80 px-3 py-3 shadow-lg shadow-emerald-900/15 sm:px-5 sm:py-4"
    >
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div className="relative shrink-0">
          <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/10 ring-2 ring-white/30 sm:h-16 sm:w-16">
            <ProfileImagePreview
              src={profileImageUrl}
              alt={name}
              initials={initials}
              imageClassName="h-full w-full object-cover"
              fallbackClassName="flex h-full w-full items-center justify-center bg-emerald-100 text-base font-extrabold text-emerald-900 sm:text-lg"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-amber-950 shadow-md">
            {isEdit ? 'Edit' : 'New'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-emerald-200">
            {isEdit ? 'Editing staff member' : 'Adding a new staff member'}
          </p>
          <h2 className="mt-0.5 truncate text-base font-extrabold leading-tight sm:text-lg">
            {name}
          </h2>
          <p className="truncate font-mono text-[11px] font-semibold text-emerald-200 sm:text-xs">
            {staffId}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {designation && (
              <Badge
                variant="default"
                className="border-white/20 bg-white/15 text-[9.5px] capitalize text-white"
              >
                {designation}
              </Badge>
            )}
            <Badge
              variant={staffType === 'academic' ? 'default' : 'secondary'}
              className="text-[9.5px] capitalize"
            >
              {staffType === 'academic' ? 'Academic' : 'Non-academic'}
            </Badge>
            {department && (
              <Badge variant="secondary" className="text-[9.5px]">
                {department}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Stepper ──────────────────────────────────────────────────────────── */

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
      {/* Progress bar */}
      <div className="mb-3 flex items-center gap-3">
        <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Progress
        </p>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="h-full rounded-full accent-bar-emerald"
          />
        </div>
        <p className="shrink-0 text-[11px] font-bold tabular-nums text-emerald-700">
          {currentIdx + 1}/{steps.length}
        </p>
      </div>

      {/* Step pills */}
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
                'group flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-2 text-[11.5px] font-semibold transition-all',
                'min-h-[40px] sm:min-h-[34px]',
                isActive &&
                  'border-emerald-700 bg-emerald-700 text-white shadow-sm shadow-emerald-900/20',
                !isActive &&
                  isDone &&
                  'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400',
                !isActive &&
                  !isDone &&
                  'border-slate-200 bg-white text-slate-500',
                !clickable && 'cursor-not-allowed opacity-80',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold',
                  isActive && 'bg-white/20 text-white',
                  !isActive && isDone && 'bg-emerald-600 text-white',
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

/* ─── Step header ──────────────────────────────────────────────────────── */

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
        <p className="truncate text-[11.5px] text-slate-500 sm:text-xs">
          {step.description}
        </p>
      </div>
    </div>
  );
}

/* ─── Step bodies ──────────────────────────────────────────────────────── */

type Register = ReturnType<typeof useForm<FormData>>['register'];
type Control = ReturnType<typeof useForm<FormData>>['control'];

function IdentityStep({
  control,
  register,
  fieldError,
  regenerateStaffId,
  profileImageUrl,
  initials,
  name,
  onImageFile,
  onClearFilePreview,
}: {
  control: Control;
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
  regenerateStaffId: () => void;
  profileImageUrl?: string;
  initials: string;
  name?: string;
  onImageFile: (dataUrl: string, previewUrl: string) => void;
  onClearFilePreview: () => void;
}) {
  return (
    <StepCard accent="emerald">
      {/* Photo preview row */}
      <div className="mb-5 flex flex-col items-stretch gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="flex shrink-0 justify-center sm:justify-start">
          <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ProfileImagePreview
              src={profileImageUrl}
              alt={name || 'Staff'}
              initials={initials}
              imageClassName="h-full w-full object-cover"
              fallbackClassName="flex h-full w-full items-center justify-center bg-emerald-100 text-2xl font-extrabold text-emerald-900"
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
                placeholder="https://drive.google.com/..."
              />
            )}
          />
        </div>
      </div>

      <Grid>
        <Field
          label={L.staffId}
          required
          error={fieldError('staffId')}
          hint={`Auto: ${describeStaffIdFormat()} (e.g. SLP1967M325)`}
        >
          <div className="relative">
            <Input
              {...register('staffId')}
              placeholder="SLP1967M325"
              className="pr-10 font-mono uppercase"
            />
            <button
              type="button"
              onClick={regenerateStaffId}
              title="Regenerate staff ID from class, DOB, gender and phone"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </Field>
        <Field label={L.registrationNumber} hint="School registration number">
          <Input {...register('registrationNumber')} placeholder="e.g. 4220" />
        </Field>
        <Field label={L.nameWithInitials} hint="As on official records">
          <Input
            {...register('nameWithInitials')}
            placeholder="K.P.R.S NIRANJANI"
          />
        </Field>
        <Field label={L.name} required error={fieldError('name')}>
          <Input {...register('name')} placeholder="Full legal name" />
        </Field>
        <Field label={L.nic} required error={fieldError('nic')}>
          <Input {...register('nic')} placeholder="e.g. 855423260V" />
        </Field>
        <Field label={L.teacherNumber} hint="This school's internal number">
          <Input {...register('teacherNumber')} placeholder="e.g. 43" />
        </Field>
      </Grid>
    </StepCard>
  );
}

function PersonalStep({
  register,
  fieldError,
  gender,
  maritalStatus,
  setGender,
  setMaritalStatus,
}: {
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
  gender: FormData['gender'];
  maritalStatus?: string;
  setGender: (v: FormData['gender']) => void;
  setMaritalStatus: (v: string) => void;
}) {
  return (
    <StepCard accent="blue">
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
            accent="blue"
          />
        </Field>

        <Field label={L.maritalStatus} span={2}>
          <ChipGroup
            options={MARITAL_OPTIONS.map((m) => ({ value: m, label: m }))}
            value={maritalStatus || ''}
            onChange={setMaritalStatus}
            accent="blue"
            allowClear
          />
        </Field>

        <Field label={L.classAndGrade} hint="e.g. SLTS 2 II, SLTS-3I(B)">
          <Input {...register('classAndGrade')} placeholder="SLTS 2 II" />
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
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Primary contact
      </h4>
      <Grid>
        <Field label={L.phone} required error={fieldError('phone')}>
          <IconInput icon={Phone}>
            <Input
              {...register('phone')}
              type="tel"
              placeholder="0771234567"
              className="pl-9"
            />
          </IconInput>
        </Field>
        <Field label={L.whatsapp}>
          <IconInput icon={Phone}>
            <Input {...register('whatsapp')} type="tel" className="pl-9" />
          </IconInput>
        </Field>
        <Field label={L.email} required error={fieldError('email')} span={2}>
          <IconInput icon={Mail}>
            <Input
              {...register('email')}
              type="email"
              placeholder="staff@deltagemunupura.lk"
              className="pl-9"
            />
          </IconInput>
        </Field>
      </Grid>

      <div className="my-5 h-px bg-slate-200" />
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Emergency contact
      </h4>
      <Grid>
        <Field label={L.emergencyContactName}>
          <Input {...register('emergencyContactName')} />
        </Field>
        <Field label={L.emergencyContactPhone}>
          <IconInput icon={Phone}>
            <Input {...register('emergencyContactPhone')} type="tel" className="pl-9" />
          </IconInput>
        </Field>
      </Grid>
    </StepCard>
  );
}

function SpouseStep({
  register,
  fieldError,
}: {
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
}) {
  return (
    <StepCard accent="amber">
      <Grid>
        <Field label={L.spouseName} error={fieldError('spouseName')}>
          <Input {...register('spouseName')} placeholder="Full name of spouse" />
        </Field>
        <Field label={L.spousePhone} error={fieldError('spousePhone')}>
          <IconInput icon={Phone}>
            <Input {...register('spousePhone')} type="tel" className="pl-9" />
          </IconInput>
        </Field>
        <Field label={L.spouseAddress} span={2} error={fieldError('spouseAddress')}>
          <Textarea {...register('spouseAddress')} rows={3} />
        </Field>
      </Grid>
    </StepCard>
  );
}

function EmploymentStep({
  register,
  fieldError,
  staffType,
  status,
  setStaffType,
  setStatus,
}: {
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
  staffType: FormData['staffType'];
  status: FormData['status'];
  setStaffType: (v: FormData['staffType']) => void;
  setStatus: (v: FormData['status']) => void;
}) {
  return (
    <StepCard accent="emerald">
      <Field label={L.staffType} required>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <TypeCard
            active={staffType === 'academic'}
            onClick={() => setStaffType('academic')}
            icon={GraduationCap}
            title="Academic"
            desc="Teachers, instructors, lecturers"
          />
          <TypeCard
            active={staffType === 'non-academic'}
            onClick={() => setStaffType('non-academic')}
            icon={Briefcase}
            title="Non-academic"
            desc="Clerks, support, security, drivers"
          />
        </div>
      </Field>

      <div className="my-5 h-px bg-slate-200" />

      <Grid>
        <Field label={L.staffClassification} hint="From form (e.g. Teacher)">
          <Input {...register('staffClassification')} placeholder="Teacher" />
        </Field>
        <Field label={L.designation} required error={fieldError('designation')}>
          <Input {...register('designation')} placeholder="e.g. Teacher, Principal" />
        </Field>
        <Field label={L.department}>
          <IconInput icon={Building2}>
            <Input
              {...register('department')}
              placeholder="e.g. Mathematics"
              className="pl-9"
            />
          </IconInput>
        </Field>
        <Field label={L.status} required>
          <ChipGroup
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'retired', label: 'Retired' },
            ]}
            value={status}
            onChange={(v) => setStatus(v as FormData['status'])}
            accent="emerald"
          />
        </Field>
        <Field label={L.firstAppointmentDate}>
          <IconInput icon={CalendarDays}>
            <Input
              type="date"
              {...register('firstAppointmentDate')}
              className="pl-9"
            />
          </IconInput>
        </Field>
        <Field label={L.joinedDate} required error={fieldError('joinedDate')}>
          <IconInput icon={CalendarDays}>
            <Input type="date" {...register('joinedDate')} className="pl-9" />
          </IconInput>
        </Field>
        <Field label={L.previousSchools} span={2}>
          <Textarea
            {...register('previousSchools')}
            rows={2}
            placeholder="Comma-separated list of previous schools"
          />
        </Field>
      </Grid>
    </StepCard>
  );
}

function TeachingStep({
  register,
  fieldError,
  subjectQuery,
  setSubjectQuery,
  filteredSubjects,
  selectedSubjects,
  toggleSubject,
  clearSubjects,
}: {
  register: Register;
  fieldError: (n: keyof FormData) => string | undefined;
  subjectQuery: string;
  setSubjectQuery: (s: string) => void;
  filteredSubjects: string[];
  selectedSubjects: string[];
  toggleSubject: (s: string) => void;
  clearSubjects: () => void;
}) {
  return (
    <StepCard accent="violet">
      <Grid>
        <Field
          label={L.educationalQualifications}
          hint="e.g. A/L, B.Ed."
          error={fieldError('educationalQualifications')}
        >
          <Input {...register('educationalQualifications')} placeholder="A/L" />
        </Field>
        <Field
          label={L.professionalQualifications}
          hint="e.g. NCOE, B.Ed."
          error={fieldError('professionalQualifications')}
        >
          <Input
            {...register('professionalQualifications')}
            placeholder="National College of Education"
          />
        </Field>
        <Field label={L.appointedSubject}>
          <Input {...register('appointedSubject')} placeholder="e.g. Physical Education" />
        </Field>
        <Field label={L.subjectsTaught} hint="Free text from form">
          <Input
            {...register('subjectsTaught')}
            placeholder="Health and physical education"
          />
        </Field>
        <Field label={L.gradesTaught} span={2}>
          <Input {...register('gradesTaught')} placeholder="6, 7, 8, 9, 10, 11" />
        </Field>
      </Grid>

      <div className="mt-5 rounded-xl border border-violet-200/70 bg-violet-50/30 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">
              Subjects directory
            </p>
            <p className="text-[11px] text-slate-500">
              Selected subjects appear on the staff profile, exports and reports
            </p>
          </div>
          {selectedSubjects.length > 0 && (
            <button
              type="button"
              onClick={clearSubjects}
              className="text-[11px] font-semibold text-violet-700 underline-offset-2 hover:underline"
            >
              Clear all ({selectedSubjects.length})
            </button>
          )}
        </div>

        <div className="relative mt-2.5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search subjects..."
            value={subjectQuery}
            onChange={(e) => setSubjectQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedSubjects.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {selectedSubjects.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => toggleSubject(s)}
                className="group inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-900 transition-colors hover:bg-violet-200"
              >
                {s}
                <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 grid max-h-60 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-3 lg:grid-cols-4">
          {filteredSubjects.length === 0 ? (
            <p className="col-span-full px-2 py-6 text-center text-xs text-slate-400">
              No subjects match &ldquo;{subjectQuery}&rdquo;
            </p>
          ) : (
            filteredSubjects.map((sub) => {
              const picked = selectedSubjects.includes(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggleSubject(sub)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11.5px] font-medium transition-colors',
                    picked
                      ? 'bg-violet-100 text-violet-900 ring-1 ring-violet-300'
                      : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                      picked
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-slate-300 bg-white',
                    )}
                  >
                    {picked && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="truncate">{sub}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </StepCard>
  );
}

function ReviewStep({
  register,
  values,
  selectedSubjects,
  errorCount,
  isAcademic,
  isMarried,
  jumpToStep,
}: {
  register: Register;
  values: FormData;
  selectedSubjects: string[];
  errorCount: number;
  isAcademic: boolean;
  isMarried: boolean;
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
        accent="emerald"
        onEdit={() => jumpToStep('identity')}
        rows={[
          { label: L.staffId, value: display(values.staffId) },
          { label: L.registrationNumber, value: display(values.registrationNumber) },
          { label: L.name, value: display(values.name) },
          { label: L.nameWithInitials, value: display(values.nameWithInitials) },
          { label: L.nic, value: display(values.nic) },
          { label: L.teacherNumber, value: display(values.teacherNumber) },
        ]}
      />

      <ReviewCard
        title="Personal"
        icon={UserIcon}
        accent="blue"
        onEdit={() => jumpToStep('personal')}
        rows={[
          {
            label: L.dateOfBirth,
            value: values.dateOfBirth
              ? `${formatDate(values.dateOfBirth)}${age !== null ? ` · ${age}y` : ''}`
              : '—',
          },
          { label: L.gender, value: display(values.gender) },
          { label: L.maritalStatus, value: display(values.maritalStatus) },
          { label: L.classAndGrade, value: display(values.classAndGrade) },
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
          { label: L.emergencyContactName, value: display(values.emergencyContactName) },
          { label: L.emergencyContactPhone, value: display(values.emergencyContactPhone) },
        ]}
      />

      {isMarried && (
        <ReviewCard
          title="Spouse"
          icon={Heart}
          accent="amber"
          onEdit={() => jumpToStep('spouse')}
          rows={[
            { label: L.spouseName, value: display(values.spouseName) },
            { label: L.spousePhone, value: display(values.spousePhone) },
            { label: L.spouseAddress, value: display(values.spouseAddress), span: 2 },
          ]}
        />
      )}

      <ReviewCard
        title="Employment"
        icon={Briefcase}
        accent="emerald"
        onEdit={() => jumpToStep('employment')}
        rows={[
          { label: L.staffType, value: display(values.staffType) },
          { label: L.staffClassification, value: display(values.staffClassification) },
          { label: L.designation, value: display(values.designation) },
          { label: L.department, value: display(values.department) },
          {
            label: L.firstAppointmentDate,
            value: values.firstAppointmentDate
              ? formatDate(values.firstAppointmentDate)
              : '—',
          },
          {
            label: L.joinedDate,
            value: values.joinedDate ? formatDate(values.joinedDate) : '—',
          },
          { label: L.status, value: display(values.status) },
          { label: L.previousSchools, value: display(values.previousSchools), span: 2 },
        ]}
      />

      {isAcademic && (
        <ReviewCard
          title="Teaching"
          icon={BookOpen}
          accent="violet"
          onEdit={() => jumpToStep('teaching')}
          rows={[
            {
              label: L.educationalQualifications,
              value: display(values.educationalQualifications),
            },
            {
              label: L.professionalQualifications,
              value: display(values.professionalQualifications),
            },
            { label: L.appointedSubject, value: display(values.appointedSubject) },
            { label: L.subjectsTaught, value: display(values.subjectsTaught) },
            { label: L.gradesTaught, value: display(values.gradesTaught) },
          ]}
          footer={
            selectedSubjects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedSubjects.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="bg-violet-100 text-[10.5px] text-violet-900"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            ) : null
          }
        />
      )}

      {/* Notes are entered on the review step */}
      <StepCard accent="amber">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">Internal notes</h3>
        </div>
        <p className="mb-3 mt-0.5 text-[11.5px] text-slate-500">
          Staff-only notes that won&apos;t be visible to other roles
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

/* ─── Review card ──────────────────────────────────────────────────────── */

function ReviewCard({
  title,
  icon: Icon,
  accent,
  rows,
  onEdit,
  footer,
}: {
  title: string;
  icon: React.ElementType;
  accent: Accent;
  rows: { label: string; value: string; span?: 1 | 2 }[];
  onEdit: () => void;
  footer?: React.ReactNode;
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
          className="text-[11.5px] font-semibold text-emerald-700 underline-offset-2 hover:underline"
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
              className={cn(
                'flex flex-col gap-0.5',
                r.span === 2 && 'sm:col-span-2',
              )}
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
      {footer && <div className="border-t border-slate-100 px-4 pb-3 sm:px-5">{footer}</div>}
    </section>
  );
}

/* ─── Layout primitives ────────────────────────────────────────────────── */

function StepCard({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: Accent;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div
        className={cn(
          'h-1 w-full accent-bar-emerald',
        )}
      />
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
  allowClear,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent: Accent;
  allowClear?: boolean;
}) {
  const activeClasses: Record<Accent, string> = {
    emerald: 'border-emerald-700 bg-emerald-700 text-white shadow-sm shadow-emerald-900/15',
    blue: 'border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-900/15',
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
            onClick={() => (allowClear && active ? onChange('') : onChange(opt.value))}
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

function TypeCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
        active
          ? 'border-emerald-700 bg-emerald-50/70 ring-2 ring-emerald-700/20'
          : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
          active
            ? 'bg-emerald-700 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-bold', active ? 'text-emerald-900' : 'text-slate-900')}>
          {title}
        </p>
        <p className="mt-0.5 text-[11.5px] text-slate-500">{desc}</p>
      </div>
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all',
          active
            ? 'border-emerald-700 bg-emerald-700 text-white'
            : 'border-slate-300 bg-white opacity-0 group-hover:opacity-100',
        )}
      >
        <Check className="h-3 w-3" />
      </span>
    </button>
  );
}
