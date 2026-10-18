import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { seedIfEmpty } from './services/seed'

// Données de référence (muscles + exercices) insérées au premier lancement.
seedIfEmpty().catch(() => {
  // La base locale est indisponible (mode privé strict…) : l'interface
  // affichera des états vides plutôt que de planter.
})

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
