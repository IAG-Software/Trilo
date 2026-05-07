'use client';

import { useEffect } from 'react';
import { initNeutralino } from '@/lib/neutralino-init';

export function NeutralinoLoader() {
  useEffect(() => {
    initNeutralino();
  }, []);

  return null;
}
