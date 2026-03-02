import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PowerProvider from './PowerProvider'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PowerProvider>
      <App />
    </PowerProvider>
  </StrictMode>,
)
