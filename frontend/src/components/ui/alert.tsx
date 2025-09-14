/**
 * Alert Component
 * Displays important messages and notifications
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border-2 px-4 py-3 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border shadow-shadow",
        destructive:
          "border-red-200 text-red-800 dark:border-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950",
        warning:
          "border-yellow-200 text-yellow-800 dark:border-yellow-800 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950",
        info: "border-blue-200 text-blue-800 dark:border-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-950",
        success:
          "border-green-200 text-green-800 dark:border-green-800 dark:text-green-400 bg-green-50 dark:bg-green-950",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export { Alert, AlertDescription, AlertTitle };
