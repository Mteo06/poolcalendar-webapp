import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ color: '#ff4d4d' }}>⚠️ Qualcosa è andato storto</h1>
          <details style={{ 
            whiteSpace: 'pre-wrap',
            background: '#f5f5f5',
            padding: '20px',
            borderRadius: '8px',
            marginTop: '20px'
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Dettagli errore (clicca per espandere)
            </summary>
            <p style={{ color: '#e53e3e', marginTop: '10px' }}>
              {this.state.error && this.state.error.toString()}
            </p>
            <p style={{ color: '#666', fontSize: '12px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </p>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🔄 Ricarica Pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
