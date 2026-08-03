import React, { Component, ErrorInfo, ReactNode } from 'react';
import logger from '../../lib/logger';

import './ErrorBoundary.scss';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Sin esto, cualquier excepción durante el render desmonta el árbol entero y deja la
 * pantalla en blanco, sin rastro ni forma de que el usuario reporte qué pasó.
 * Tiene que ser un class component: React no expone equivalente en hooks.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Error de render capturado por el ErrorBoundary', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="ha-error-boundary">
        <div className="ha-card ha-error-boundary-card">
          <h1 className="ha-error-boundary-title">Algo salió mal</h1>
          <p className="ha-error-boundary-text">
            Ocurrió un error inesperado y la pantalla no se pudo mostrar. Tus datos no se
            vieron afectados.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Recargar la página
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
