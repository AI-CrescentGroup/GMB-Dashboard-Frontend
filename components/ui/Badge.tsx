import * as React from "react"

type BadgeVariant = "neutral" | "brand" | "success" | "warn" | "danger" | "outline"
type BadgeSize = "sm" | "md" | "lg"

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  brand:   "bg-indigo-50 text-indigo-700",
  success: "bg-emerald-50 text-emerald-700",
  warn:    "bg-amber-50 text-amber-700",
  danger:  "bg-rose-50 text-rose-700",
  outline: "border border-slate-200 text-slate-600 bg-white",
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-[11px]",
  lg: "px-2.5 py-1 text-[12px]",
}

const dotColors: Record<BadgeVariant, string> = {
  neutral: "bg-slate-400",
  brand:   "bg-indigo-500",
  success: "bg-emerald-500",
  warn:    "bg-amber-500",
  danger:  "bg-rose-500",
  outline: "bg-slate-400",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

export function Badge({ className = "", variant = "neutral", size = "md", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium tabular-nums whitespace-nowrap ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${dot ? "pl-1.5" : ""} ${className}`}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
