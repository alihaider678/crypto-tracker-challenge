import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <h1 className="text-xl font-semibold tracking-[-0.02em] md:text-2xl md:font-bold">
        {title}
      </h1>
      {description && (
        <p className="max-w-2xl text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
