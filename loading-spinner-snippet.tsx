/**
 * Loading Spinner Snippet
 *
 * This is the Braille-based loading animation used in the Evolve Dashboard.
 * The spinner uses Unicode Braille characters that rotate to create a
 * smooth spinning effect.
 *
 * Source: swarm_dashboard/components/LoadingScreen.tsx
 */

'use client'

import { useState, useEffect } from 'react'

export default function LoadingSpinner() {
  const [spinnerIndex, setSpinnerIndex] = useState(0)

  // Braille spinner characters - rotates in a circle
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

  useEffect(() => {
    const interval = setInterval(() => {
      setSpinnerIndex(prev => (prev + 1) % spinnerChars.length)
    }, 50) // Rotation speed in milliseconds

    return () => clearInterval(interval)
  }, [spinnerChars.length])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="text-foreground text-4xl">
        {spinnerChars[spinnerIndex]}
      </span>
    </div>
  )
}

/**
 * Inline usage example (for buttons, etc.):
 *
 * const [loading, setLoading] = useState(false)
 * const [dotIndex, setDotIndex] = useState(0)
 * const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
 *
 * useEffect(() => {
 *   if (loading) {
 *     const interval = setInterval(() => {
 *       setDotIndex(prev => (prev + 1) % dots.length)
 *     }, 50)
 *     return () => clearInterval(interval)
 *   }
 * }, [loading])
 *
 * // In JSX:
 * <button disabled={loading}>
 *   {loading ? dots[dotIndex] : 'Submit'}
 * </button>
 */
