import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border border-border bg-card text-card-foreground", className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />
);
const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-base font-semibold leading-tight", className)} {...props} />
);
const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
const CardContent = ({ className, ...props }) => <div className={cn("p-5 pt-2", className)} {...props} />;

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
