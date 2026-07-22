import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface",
        interactive &&
          "transition-[border-color,box-shadow,transform] duration-150 hover:border-border-strong hover:shadow-[var(--shadow-md)] cursor-pointer",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between px-4 pt-3.5 pb-2", className)}>
      <h3 className="text-[13px] font-semibold tracking-tight text-text-secondary uppercase">
        {title}
      </h3>
      {action}
    </div>
  );
}
