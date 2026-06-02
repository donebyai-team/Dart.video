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
    <div className='mb-2 grid grid-cols-4 gap-2'>
      {categories.map(category => {
        const Icon = category.icon
        const isSelected = selectedCategory?.value === category.value

        return (
          <button
            key={category.value}
            type='button'
            onClick={() => onSelectCategory(category)}
            className={cn(
              'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/40',
              isSelected
                ? 'border-primary bg-primary/6 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]'
                : 'border-border bg-muted/10 hover:border-primary/50 hover:bg-muted/20'
            )}
          >
            <span className='inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 text-foreground shadow-sm'>
              <Icon className='h-4 w-4' />
            </span>
            <div className='text-[11px] font-medium leading-none text-foreground'>{category.label}</div>
          </button>
        )
      })}

      <button
        type='button'
        onClick={onGenerateNew}
        className='flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/5 px-1.5 py-1.5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 hover:border-primary/50 hover:bg-muted/15'
      >
        <span className='inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm'>
          <MessageSquarePlus className='h-4 w-4' />
        </span>
        <div className='text-[11px] font-medium leading-none text-foreground'>Generate New</div>
      </button>
    </div>
  )
}
