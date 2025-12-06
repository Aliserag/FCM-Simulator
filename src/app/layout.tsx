import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FCM Simulator - Flow Credit Market Demo',
  description: 'Interactive simulation comparing FCM lending vs traditional DeFi lending. See how automatic rebalancing protects your position.',
  keywords: ['FCM', 'Flow', 'DeFi', 'lending', 'borrowing', 'simulation', 'Peak Money'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0b0d]">
        {children}
      </body>
    </html>
  )
}
