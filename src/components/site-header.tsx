import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-3 z-30 mx-auto w-full max-w-6xl px-4">
      <nav className="glass flex items-center justify-between rounded-2xl px-4 py-2.5 shadow-soft">
        <Logo />
        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a href="#platform" className="hover:text-ink">Platform</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#api" className="hover:text-ink">API</a>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Show when="signed-out">
            <SignInButton>
              <button className="rounded-xl px-3 py-2 hover:bg-white/70">Sign in</button>
            </SignInButton>
            <SignUpButton>
              <button className="rounded-xl bg-ink px-4 py-2 text-white hover:bg-ink/85">
                Get started
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="rounded-xl bg-ink px-4 py-2 text-white hover:bg-ink/85">
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </nav>
    </header>
  );
}
