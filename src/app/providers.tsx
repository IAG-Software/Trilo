'use client'

import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider as NextThemesProvider } from "next-themes";
import SmoothScroll from '@/components/SmoothScroll';

export function Providers({children}: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </NextThemesProvider>
    </NextUIProvider>
  )
}
