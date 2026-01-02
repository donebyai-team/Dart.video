'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { routes } from '@coasterai/ui-core/routing'

const Home = () => {
  const { push } = useRouter()

  useEffect(() => {
    push(routes.app.home)
  }, [push])

  return <p></p>
}

export default Home
