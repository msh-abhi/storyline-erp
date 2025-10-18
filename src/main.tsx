import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './components/AuthProvider';
import { AppProvider } from './context/AppContext';
import { initializeSupabaseSession } from './lib/supabase';
import './utils/debugAuth'; // Import debug utility

// Initialize Supabase session before rendering the app
const initializeApp = async () => {
  try {
    console.log('main.tsx: Initializing Supabase session...');
    await initializeSupabaseSession();
    console.log('main.tsx: Supabase session initialized.');
  } catch (error) {
    console.error('main.tsx: Failed to initialize Supabase session:', error);
  }
  
  // Render the app regardless of session initialization result
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AuthProvider> {/* AuthProvider should be the outermost */}
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </React.StrictMode>,
  );
};

// Initialize and render
initializeApp();
