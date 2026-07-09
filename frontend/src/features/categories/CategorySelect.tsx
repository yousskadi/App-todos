import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categoryOf, type CategoryDef } from '@/features/categories/categories'

const NONE = 'none'
const CUSTOM = 'custom'

interface CategorySelectProps {
  categories: CategoryDef[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}

// Sélecteur de catégorie prédéfinie, avec « Autre… » qui bascule sur un champ
// texte libre (et préserve les valeurs libres existantes à l'édition).
export function CategorySelect({ categories, value, onChange, ariaLabel }: CategorySelectProps) {
  const { t } = useTranslation()
  const [customPicked, setCustomPicked] = useState(false)
  const isCustom = customPicked || (value !== '' && !categoryOf(value))
  const selectValue = isCustom ? CUSTOM : value === '' ? NONE : value

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={(picked) => {
          setCustomPicked(picked === CUSTOM)
          if (picked === CUSTOM) {
            if (categoryOf(value)) onChange('')
          } else {
            onChange(picked === NONE ? '' : picked)
          }
        }}
      >
        <SelectTrigger className="w-full" aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t('categories.none')}</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.slug} value={category.slug}>
              <category.icon style={{ color: category.color }} />
              {t(`categories.${category.slug}`)}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM}>{t('categories.custom')}</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          aria-label={t('categories.customLabel')}
          placeholder={t('categories.customLabel')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}
