import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

let toastIdCount = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    // Avoid duplicate notifications for the same message
    setToasts((currentToasts) => {
      if (currentToasts.some((t) => t.message === message)) {
        return currentToasts;
      }
      
      const id = ++toastIdCount;
      const newToast = { id, type, message, duration };
      return [...currentToasts, newToast];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  const isAlert = toast.type === 'error';

  return (
    <div 
      className={`toast toast--${toast.type}`} 
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
    >
      <div className="toast-icon">
        {toast.type === 'success' && '✓'}
        {toast.type === 'error' && '✕'}
        {toast.type === 'warning' && '!'}
        {toast.type === 'info' && 'i'}
      </div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={onDismiss} aria-label="Close notification">
        &times;
      </button>
    </div>
  );
};
