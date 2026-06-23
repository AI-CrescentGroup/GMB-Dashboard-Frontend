import { Card as CardBase, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

interface CardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}

export default function Card({ children, title, subtitle, className = '' }: CardProps) {
  return (
    <CardBase className={className}>
      {(title || subtitle) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </CardBase>
  )
}
