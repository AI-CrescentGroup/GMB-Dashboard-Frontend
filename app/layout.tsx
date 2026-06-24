import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import SessionRestorer from '@/components/SessionRestorer'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'GMB Dashboard | Jaquar',
  description: 'Modern Marketing Analytics Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <SessionRestorer />
        {children}
      </body>
    </html>
  )
}
