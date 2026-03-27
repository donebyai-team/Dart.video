'use client'

import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BrandIdentity } from '@coasterai/pb/coasterai/core/v1/brandkit_pb'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'

const NO_BRAND_VALUE = 'none'
const ADD_BRAND_VALUE = '__add_brand__'

interface BrandLibrarySelectorProps {
  selectedBrandLibraryId?: string
  onChange: (value: string | undefined) => void
  onAddBrand: () => void
  disabled?: boolean
}

const BrandLibrarySelector = ({
  selectedBrandLibraryId,
  onChange,
  onAddBrand,
  disabled = false
}: BrandLibrarySelectorProps) => {
  const [identities, setIdentities] = useState<BrandIdentity[]>([])
  const { portalClient } = useClientsContext()

  useEffect(() => {
    if (!portalClient) return
    void fetchBrandIdentities()
  }, [portalClient])

  useEffect(() => {
    if (identities.length === 0) return
    if (selectedBrandLibraryId) return

    onChange(identities[0].id)
  }, [identities, onChange, selectedBrandLibraryId])

  const fetchBrandIdentities = async () => {
    try {
      const res = await portalClient.getBrandIdentities({})
      setIdentities(res.identities)
    } catch (err) {
      console.error('Failed to fetch brand identities', err)
      toast.error(getConnectError(err))
    }
  }
  return (
    <span className='flex items-center gap-1 flex-shrink-0'>
      <Palette className='w-4 h-4 opacity-70' />
      <Select
        value={selectedBrandLibraryId ?? ADD_BRAND_VALUE}
        onValueChange={v => {
          if (v === ADD_BRAND_VALUE) {
            onAddBrand()
            return
          }
          onChange(v === NO_BRAND_VALUE ? '' : v)
        }}
        disabled={disabled}
      >
        <SelectTrigger className='h-7 text-xs bg-transparent border-none shadow-none ring-0 focus:ring-0 px-1 gap-1 w-auto min-w-0'>
          <SelectValue placeholder='Brand' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            value={ADD_BRAND_VALUE}
            onPointerDown={e => {
              e.preventDefault()
              onAddBrand()
            }}
          >
            Add brand
          </SelectItem>
          {identities.map(b => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}

export default BrandLibrarySelector
