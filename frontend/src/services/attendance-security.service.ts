import { startRegistration } from '@simplewebauthn/browser'
import { api } from '@/services/api'

export function getAttendanceErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response
    const message = response?.data?.message
    if (typeof message === 'string') return message
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join(', ')
    }
  }
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue'
}

export async function registerWindowsHelloForCurrentEmployee() {
  const { data: challenge } = await api.post('/hr/attendance/webauthn/register/options')
  const response = await startRegistration({ optionsJSON: challenge.options })
  await api.post('/hr/attendance/webauthn/register/verify', {
    challengeId: challenge.challengeId,
    response,
  })
}
