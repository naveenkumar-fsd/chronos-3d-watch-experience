import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onError: (error: Error) => void
}

interface State {
  failed: boolean
}

/** Catches loading/rendering failures inside the 3D canvas so the page still works. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
