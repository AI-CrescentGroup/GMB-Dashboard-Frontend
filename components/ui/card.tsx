import * as React from "react"

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-2xl bg-white p-6 transition-shadow duration-200 ${
        interactive ? "hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] cursor-pointer" : ""
      } ${className}`}
      style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`flex items-start justify-between gap-4 mb-5 ${className}`} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", ...props }, ref) => (
    <h3
      ref={ref as any}
      className={`text-[15px] font-semibold tracking-tight text-slate-900 ${className}`}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", ...props }, ref) => (
    <p ref={ref} className={`text-[12px] text-slate-500 mt-0.5 ${className}`} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`text-slate-900 ${className}`} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`flex items-center pt-4 mt-4 border-t border-slate-100 ${className}`} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
