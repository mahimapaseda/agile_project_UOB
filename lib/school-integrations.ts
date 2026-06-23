import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { SchoolIntegrations } from '@/types';

export const SCHOOL_SETTINGS_COLLECTION = 'school_settings';
export const SCHOOL_INTEGRATIONS_DOC_ID = 'integrations';

const integrationsRef = () => doc(db, SCHOOL_SETTINGS_COLLECTION, SCHOOL_INTEGRATIONS_DOC_ID);

export async function getSchoolIntegrations(): Promise<SchoolIntegrations | null> {
  const snap = await getDoc(integrationsRef());
  if (!snap.exists()) return null;
  return snap.data() as SchoolIntegrations;
}

export async function getSchoolWhatsAppPhone(): Promise<string | null> {
  const settings = await getSchoolIntegrations();
  const phone = settings?.whatsappPhone?.trim();
  return phone || null;
}

export interface ConnectSchoolWhatsAppInput {
  phone: string;
  updatedByUid: string;
  updatedByName: string;
}

export async function connectSchoolWhatsApp(input: ConnectSchoolWhatsAppInput): Promise<void> {
  await setDoc(
    integrationsRef(),
    {
      whatsappPhone: input.phone,
      whatsappConnectedAt: serverTimestamp(),
      whatsappUpdatedByUid: input.updatedByUid,
      whatsappUpdatedByName: input.updatedByName.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function disconnectSchoolWhatsApp(
  updatedByUid: string,
  updatedByName: string,
): Promise<void> {
  await setDoc(
    integrationsRef(),
    {
      whatsappPhone: null,
      whatsappConnectedAt: null,
      whatsappUpdatedByUid: updatedByUid,
      whatsappUpdatedByName: updatedByName.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
