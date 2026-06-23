'use client';

import { AccessGate } from '@/components/auth/AccessGate';
import { ExaminationInformationView } from '@/components/examinations/ExaminationInformationView';
import { canViewExaminationInformation } from '@/lib/access-control';

export default function ExaminationInformationPage() {
  return (
    <AccessGate allow={canViewExaminationInformation}>
      <ExaminationInformationView />
    </AccessGate>
  );
}
