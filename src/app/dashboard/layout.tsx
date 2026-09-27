import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="peach-glow flex flex-1 flex-col">
      <header className="sticky top-3 z-30 mx-auto w-full max-w-7xl px-4">
        <nav className="glass flex items-center justify-between rounded-2xl px-4 py-2.5 shadow-soft">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted hover:text-ink">Home</Link>
            <UserButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8">{children}</main>
    </div>
  );
}
