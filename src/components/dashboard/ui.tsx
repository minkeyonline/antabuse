import type { ComponentType, ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`bento flex flex-col gap-4 p-6 ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  icon: Icon,
  action,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {Icon && <Icon className="size-4 text-peach-500" />}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-peach-300 focus:ring-2 focus:ring-peach-100";

export const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink/85 disabled:opacity-50";

export const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:bg-canvas disabled:opacity-50";

export function VerdictPill({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    allowed: "bg-mint-100 text-mint-600",
    challenged: "bg-peach-100 text-peach-600",
    tripped: "bg-peach-500 text-white",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[verdict] ?? "bg-line"}`}>
      {verdict}
    </span>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-xs font-medium text-red-600">{children}</p>;
}
