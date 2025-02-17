import { forwardRef } from "react"
import type { CardContentProps } from "./types"

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
))

CardContent.displayName = "CardContent"
