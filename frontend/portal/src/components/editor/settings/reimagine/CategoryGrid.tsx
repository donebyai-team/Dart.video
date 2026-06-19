import { MessageSquarePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryItem } from './types'

interface CategoryGridProps {
  categories: CategoryItem[]
  selectedCategory: CategoryItem | null
  onSelectCategory: (category: CategoryItem) => void
  onGenerateNew: () => void
}

export default function CategoryGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  onGenerateNew,
}: CategoryGridProps) {
  return (
    <div className='mb-2 grid grid-cols-5 gap-1.5'>
      {categories.map(category => {
        const Icon = category.icon
        const isSelected = selectedCategory?.value === category.value

        return (
          <button
            key={category.value}
            type='button'
            onClick={() => onSelectCategory(category)}
            className={cn(
              'flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/30',
              isSelected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/40 hover:bg-muted/20'
            )}
          >
            <span
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-md',
                isSelected ? 'bg-primary/10' : 'bg-muted/40'
              )}
            >
              <Icon className='h-3.5 w-3.5' />
            </span>

            <div className='text-[10px] font-medium leading-none tracking-tight'>
              {category.label}
            </div>
          </button>
        )
      })}

      <button
        type='button'
        onClick={onGenerateNew}
        className='flex h-14 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-primary/40 hover:bg-muted/15'
      >
        <span className='inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary'>
          <MessageSquarePlus className='h-3.5 w-3.5' />
        </span>

        <div className='text-[9px] font-medium leading-none tracking-tight'>
          Generate
        </div>
      </button>
    </div>
  )
}
