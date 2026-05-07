'use client'

import { useEffect, ReactNode } from 'react'
import Lenis from 'lenis'

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    const wrapper = document.getElementById('main-content')
    
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 2,
      wrapper: wrapper || window,
      content: wrapper || document.documentElement,
    })

    // Update Lenis on every frame
    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    // Handle content size changes
    const resizeObserver = new ResizeObserver(() => {
      lenis.resize()
    })
    
    if (wrapper) {
      resizeObserver.observe(wrapper)
    } else {
      resizeObserver.observe(document.body)
    }

    return () => {
      lenis.destroy()
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
    }
  }, [])

  return <>{children}</>
}
