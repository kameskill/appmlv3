import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position='top-right'
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '10px', fontWeight: '600' },
          success: { iconTheme: { primary: '#a855f7', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />
    </AuthProvider>
  </React.StrictMode>,
)
