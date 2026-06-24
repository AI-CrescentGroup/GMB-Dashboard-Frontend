import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link" | "default" | "outline"
type Size = "sm" | "md" | "lg" | "icon"

const variantClasses: Record<Variant, string> = {
  primary:   "bg-indigo-600 text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-100",
  default:   "bg-indigo-600 text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-100",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-100",
  outline:   "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-100",
  ghost:     "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-100",
  danger:    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-100",
  link:      "text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline px-0 focus-visible:ring-indigo-100",
}

const sizeClasses: Record<Size, string> = {
  sm:   "h-8 px-3 text-[12px]",
  md:   "h-9 px-3.5 text-[13px]",
  lg:   "h-10 px-4 text-[14px]",
  icon: "h-9 w-9 p-0",
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const base =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium " +
      "transition-all duration-150 outline-none focus-visible:ring-4 " +
      "disabled:opacity-50 disabled:pointer-events-none tabular-nums"
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button as default }
