import {
  Briefcase,
  Car,
  Dumbbell,
  FileText,
  GraduationCap,
  Home,
  Landmark,
  Scissors,
  ShoppingCart,
  Smile,
  Sparkles,
  Stethoscope,
  Tag,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

// Catégories prédéfinies : le slug est stocké tel quel dans le champ
// `category` (texte libre côté API), le libellé vient de l'i18n
// (`categories.<slug>`). Une valeur inconnue (texte libre historique ou
// saisi via « Autre… ») s'affiche brute avec l'icône générique.
export interface CategoryDef {
  slug: string
  icon: LucideIcon
  color: string
}

export const APPOINTMENT_CATEGORIES: CategoryDef[] = [
  { slug: 'medecin', icon: Stethoscope, color: '#e11d48' },
  { slug: 'dentiste', icon: Smile, color: '#06b6d4' },
  { slug: 'coiffeur', icon: Scissors, color: '#d946ef' },
  { slug: 'garage', icon: Car, color: '#f59e0b' },
  { slug: 'examen', icon: GraduationCap, color: '#8b5cf6' },
  { slug: 'administratif', icon: Landmark, color: '#64748b' },
  { slug: 'sport', icon: Dumbbell, color: '#22c55e' },
  { slug: 'travail', icon: Briefcase, color: '#3b82f6' },
]

export const TASK_CATEGORIES: CategoryDef[] = [
  { slug: 'poubelles', icon: Trash2, color: '#78716c' },
  { slug: 'courses', icon: ShoppingCart, color: '#10b981' },
  { slug: 'menage', icon: Sparkles, color: '#0ea5e9' },
  { slug: 'papiers', icon: FileText, color: '#a855f7' },
  { slug: 'maison', icon: Home, color: '#f97316' },
  { slug: 'travail', icon: Briefcase, color: '#3b82f6' },
]

export const FALLBACK_ICON = Tag
export const FALLBACK_COLOR = '#94a3b8'

const BY_SLUG = new Map(
  [...APPOINTMENT_CATEGORIES, ...TASK_CATEGORIES].map((category) => [category.slug, category]),
)

export function categoryOf(value: string | null | undefined): CategoryDef | undefined {
  return value ? BY_SLUG.get(value) : undefined
}
