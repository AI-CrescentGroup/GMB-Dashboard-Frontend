import { Button } from "@/components/ui/button"
import { Inbox } from "lucide-react"

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick?: () => void; href?: string }
  variant?: "card" | "inline"
}

export function EmptyState({
  icon, title, description, action, variant = "card",
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Button asChild size="sm">
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button size="sm" onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  )

  if (variant === "inline") {
    return <div className="flex items-center justify-center px-6 py-12">{content}</div>
  }
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-white px-6 py-16"
      style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}
    >
      {content}
    </div>
  )
}
