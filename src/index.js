import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { loadDecorativeFonts } from './lib/loadDecorativeFonts'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<React.StrictMode><App /></React.StrictMode>)

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadDecorativeFonts)
} else {
  window.addEventListener('load', loadDecorativeFonts, { once: true })
}
