import React, { useState, useCallback } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { MessagingProvider } from '@/contexts/MessagingContext'
import AppRouter from '@/router/AppRouter'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import SplashScreen from '@/pages/splash/SplashScreen'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true)
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <MessagingProvider>
              {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
              {splashDone && <AppRouter />}
            </MessagingProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
