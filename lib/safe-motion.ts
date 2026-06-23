'use client';

import { useSyncExternalStore } from 'react';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getCoarsePointerSnapshot() {
  return window.matchMedia('(pointer: coarse)').matches;
}

function getCoarsePointerServerSnapshot() {
  return false;
}

/** True on phones/tablets — skip opacity-0 entrance animations (iOS 15 Safari). */
export function useCoarsePointer() {
  return useSyncExternalStore(subscribe, getCoarsePointerSnapshot, getCoarsePointerServerSnapshot);
}

/** Use `false` instead of hidden state on touch devices or when motion is reduced. */
export function useMotionEnter<T>(hidden: T): T | false {
  const coarse = useCoarsePointer();
  const reducedMotion = useReducedMotion();
  return coarse || reducedMotion ? false : hidden;
}
