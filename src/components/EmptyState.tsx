import { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-10 px-4 ${className}`}>
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground max-w-sm mb-3">{description}</div>
      )}
      {action}
    </div>
  );
}
