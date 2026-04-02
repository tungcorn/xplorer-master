import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App';
import './index.css';

(window as unknown as Record<string, unknown>).React = React;
(window as unknown as Record<string, unknown>).ReactDOM = ReactDOM;

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

createRoot(document.getElementById('root')!).render(<App />);
