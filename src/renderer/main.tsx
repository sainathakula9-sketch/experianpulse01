import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Unable to start Experian Pulse because the #root element is missing from index.html.')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
