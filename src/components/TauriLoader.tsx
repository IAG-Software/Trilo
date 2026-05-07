'use client';

import { useEffect } from 'react';
import { initTauri } from '@/lib/tauri-init';

export function TauriLoader() {
  useEffect(() => {
    initTauri();
  }, []);

  return null;
}
