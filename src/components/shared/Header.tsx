'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Github, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  showBack?: boolean
}

export function Header({ showBack = false }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {showBack && (
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden font-medium sm:inline">Back</span>
            </Link>
          )}

          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600">
              <span className="text-lg font-bold text-white">F</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              FCM <span className="hidden text-gray-400 sm:inline">Simulator</span>
            </span>
          </Link>
        </div>

        {/* Center - Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/" active={pathname === '/'}>
            Home
          </NavLink>
          <NavLink href="/simulator" active={pathname === '/simulator'}>
            Simulator
          </NavLink>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href="https://deepwiki.com/onflow/FlowCreditMarket"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:flex"
          >
            Docs
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://github.com/onflow/FlowCreditMarket"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  )
}

interface NavLinkProps {
  href: string
  active: boolean
  children: React.ReactNode
}

function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'relative rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        active ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
      )}
    >
      {children}
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute inset-0 rounded-lg bg-gray-100"
          style={{ zIndex: -1 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
    </Link>
  )
}
