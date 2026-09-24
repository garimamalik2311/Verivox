'use client'

import { createContext, useContext, useState } from 'react'

const SecurityContext = createContext()

export function SecurityProvider({ children }) {
  const [escalatedIncident, setEscalatedIncident] = useState(null)

  return (
    <SecurityContext.Provider value={{ escalatedIncident, setEscalatedIncident }}>
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  const context = useContext(SecurityContext)
  
  // This check ensures you get a clear error message instead of a blank screen 
  // if you forget to wrap your app or component with <SecurityProvider>
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider')
  }
  
  return context
}