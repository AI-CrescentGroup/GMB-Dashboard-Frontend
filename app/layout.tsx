import type { Metadata } from 'next'
import SessionRestorer from '@/components/SessionRestorer'
import './globals.css'

export const metadata: Metadata = {
  title: 'GMB Dashboard | Jaquar',
  description: 'Modern Marketing Analytics Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <SessionRestorer />
        {children}
      </body>
    </html>
  )
}
