import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-sm p-6">
            <h1 className="text-lg font-bold text-red-600">Erreur d&apos;affichage</h1>
            <p className="text-sm text-gray-600 mt-2">{this.state.error.message}</p>
            <button
              type="button"
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
              onClick={() => this.setState({ error: null })}
            >
              Réessayer
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
