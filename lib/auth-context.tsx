'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { AccountType, Staff, UserProfile } from '@/types';
import { requestPinLogin } from './pin-auth-client';
import { auth } from './firebase';
import { fetchUserProfileByUid } from './user-profiles';
import { syncTeacherGradesClient } from './sync-teacher-grades-client';
import { getStaffByStaffId } from './firestore';
import { getLinkedStaffId } from './linked-records';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  /** Linked employment record for staff logins (loaded once per session). */
  linkedStaff: Staff | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPin: (linkedId: string, pin: string, accountType: AccountType) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  linkedStaff: null,
  loading: true,
  signIn: async () => {},
  signInWithPin: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

async function loadSessionForUser(
  uid: string,
): Promise<{ profile: UserProfile | null; linkedStaff: Staff | null }> {
  let profile = await fetchUserProfileByUid(uid);
  let linkedStaff: Staff | null = null;

  if (profile?.accountType === 'staff') {
    const staffId = getLinkedStaffId(profile);
    if (staffId) {
      linkedStaff = await getStaffByStaffId(staffId);
    }
  }

  if (profile?.accountType === 'staff' && profile.staffRole === 'teacher') {
    const needsSync = !profile.allowedStudentGrades?.length;
    if (needsSync) {
      const grades = await syncTeacherGradesClient();
      if (grades?.length) {
        profile = { ...profile, allowedStudentGrades: grades };
      }
    }
  }

  return { profile, linkedStaff };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [linkedStaff, setLinkedStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        if (!cancelled) {
          setUserProfile(null);
          setLinkedStaff(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { profile, linkedStaff: staff } = await loadSessionForUser(firebaseUser.uid);
        if (cancelled) return;

        if (!profile || profile.isActive === false) {
          await signOut(auth);
          if (!cancelled) {
            setUser(null);
            setUserProfile(null);
            setLinkedStaff(null);
          }
          return;
        }

        setUserProfile(profile);
        setLinkedStaff(staff);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithPin = async (linkedId: string, pin: string, accountType: AccountType) => {
    const customToken = await requestPinLogin({ linkedId, pin, accountType });
    await signInWithCustomToken(auth, customToken);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setLinkedStaff(null);
  };

  const refreshProfile = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    const { profile, linkedStaff: staff } = await loadSessionForUser(firebaseUser.uid);
    if (!profile || profile.isActive === false) {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setLinkedStaff(null);
      return;
    }
    setUserProfile(profile);
    setLinkedStaff(staff);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        linkedStaff,
        loading,
        signIn,
        signInWithPin,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
