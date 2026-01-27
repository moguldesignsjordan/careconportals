import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Ensure this matches your CSS filename
import { AuthProvider } from './context/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    {/* The AuthProvider must wrap the App so useAuth works inside it */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);