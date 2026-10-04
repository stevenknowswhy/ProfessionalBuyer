import { cn } from "@/lib/utils";

export function Zone({
  title,
  aside,
  children,
  className,
  bodyClassName,
  labelledBy,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  labelledBy: string;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cn("flex min-h-0 flex-col", className)}>
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 px-6 pt-5 pb-3">
        <h2 id={labelledBy} className="type-heading text-[1.25rem] text-ink">
          {title}
        </h2>
        {aside}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SubSection({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-small font-semibold text-ink">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
