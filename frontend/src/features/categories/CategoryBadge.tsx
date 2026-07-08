import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import {
  categoryOf,
  FALLBACK_COLOR,
  FALLBACK_ICON,
} from '@/features/categories/categories'

export function CategoryBadge({ value }: { value: string }) {
  const { t } = useTranslation()
  const category = categoryOf(value)
  const Icon = category?.icon ?? FALLBACK_ICON
  const color = category?.color ?? FALLBACK_COLOR

  return (
    <Badge
      variant="outline"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      <Icon />
      {category ? t(`categories.${category.slug}`) : value}
    </Badge>
  )
}
