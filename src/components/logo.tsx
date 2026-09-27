import Link from "next/link";
import { Zap } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-peach-400 to-peach-600 text-white shadow-float">
        <Zap className="size-4" fill="currentColor" />
      </span>
      Antabuse
    </Link>
  );
}
