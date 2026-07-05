import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import fr from './fr.json'

// Français seul pour l'instant ; ajouter une langue = un fichier JSON
// + une entrée dans resources
i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
  },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

export default i18n
