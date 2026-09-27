import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Code2,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Logo } from "@/components/logo";

const feed = [
  { label: "setApprovalForAll → 0x9f3…c21e", verdict: "Tripped", tone: "block" },
  { label: "Netflix · 14.99 USDC / mo", verdict: "Allowed", tone: "ok" },
  { label: "Permit2 unlimited → 0x44a…07bd", verdict: "Tripped", tone: "block" },
  { label: "Spotify · 10.99 USDC / mo", verdict: "Allowed", tone: "ok" },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-16 pt-8 md:pt-12">
        {/* Hero — text left, image right, direct children of one row */}
        <section className="bento peach-glow flex flex-row items-center gap-4 p-6 md:gap-10 md:p-12">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-5">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-peach-600">
              <Sparkles className="size-3.5" /> AI circuit breaker for Web3 payments
            </span>
            <h1 className="text-3xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Subscribe freely.
              <br />
              <span className="bg-gradient-to-r from-peach-500 to-peach-600 bg-clip-text text-transparent">
                Drainers get cut off.
              </span>
            </h1>
            <p className="max-w-md text-sm text-muted md:text-lg">
              Antabuse sits between your wallet and every recurring charge. Approved
              subscriptions flow through. Anything that looks like a drainer trips the
              breaker in under 40&nbsp;ms.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-float hover:bg-ink/85"
              >
                Protect my wallet <ArrowRight className="size-4" />
              </Link>
              <a
                href="#api"
                className="glass inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold hover:bg-white"
              >
                <Code2 className="size-4" /> Read the API
              </a>
            </div>
          </div>
          <Image
            src="/shield.png"
            alt="Glass shield with a glowing circuit breaker guarding a crypto wallet"
            width={1024}
            height={1024}
            priority
            className="w-2/5 shrink-0 rounded-[1.5rem] mix-blend-multiply md:w-[44%]"
          />
        </section>

        {/* Bento stats grid */}
        <section id="platform" className="grid auto-rows-[minmax(170px,auto)] grid-cols-2 gap-4 md:grid-cols-4">
          <article className="bento col-span-2 flex flex-col justify-between bg-ink p-7 text-white md:row-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Drainer losses prevented</span>
              <ShieldCheck className="size-5 text-peach-300" />
            </div>
            <div>
              <p className="text-6xl font-bold tracking-tight md:text-7xl">$184M</p>
              <p className="mt-2 max-w-xs text-sm text-white/60">
                in malicious approvals, permits and transfers intercepted before they
                reached the chain.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {feed.map((e) => (
                <div
                  key={e.label}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 font-mono text-xs"
                >
                  <span className="truncate text-white/80">{e.label}</span>
                  <span
                    className={
                      e.tone === "block"
                        ? "ml-3 rounded-full bg-peach-500/20 px-2 py-0.5 text-peach-300"
                        : "ml-3 rounded-full bg-mint-400/15 px-2 py-0.5 text-mint-400"
                    }
                  >
                    {e.verdict}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="bento flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Wallet className="size-5 text-peach-500" />
            <p className="text-4xl font-bold tracking-tight">2.1M</p>
            <p className="text-sm text-muted">wallets protected</p>
          </article>

          <article className="bento flex flex-col items-center justify-center gap-2 p-6">
            <Gauge value={99.97} />
            <p className="text-sm text-muted">legit charges approved</p>
          </article>

          <article className="bento col-span-2 flex flex-col justify-between bg-[#f6ebe3] p-6">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted">
                <span className="font-semibold text-ink">AI</span> Circuit Breaker
              </p>
              <p className="mt-2 max-w-[14rem] text-2xl font-semibold leading-tight">
                38&nbsp;ms median decision latency
              </p>
            </div>
            <span className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-mint-600">
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-mint-400 animate-pulse-ring" />
                <span className="relative size-2 rounded-full bg-mint-400" />
              </span>
              Armed on 14 chains
            </span>
            <Image
              src="/ai-nodes.png"
              alt=""
              width={1024}
              height={1024}
              className="absolute -right-6 top-1/2 w-56 -translate-y-1/2 mix-blend-multiply md:w-64"
            />
          </article>


          <article className="bento col-span-2 flex flex-col justify-between gap-4 p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                <span className="font-semibold text-ink">Subscription</span> Guard
              </p>
              <CalendarClock className="size-5 text-mint-600" />
            </div>
            <p className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              We&rsquo;ve cleared <span className="font-bold">41M</span> recurring
              charges without a single false trip.
            </p>
          </article>

          <article className="bento flex flex-col justify-between gap-4 bg-gradient-to-br from-peach-400 to-peach-600 p-6 text-white">
            <Radio className="size-5" />
            <div>
              <p className="text-4xl font-bold tracking-tight">12K+</p>
              <p className="mt-1 text-sm text-white/85">
                merchants on an API built by telecom fraud engineers
              </p>
            </div>
          </article>

          <article className="bento flex flex-col justify-end bg-[#f6ebe3] p-5">
            <Image
              src="/drainer-blocked.png"
              alt="A hooded drainer figure deflected by a glowing shield"
              width={1024}
              height={1024}
              className="absolute inset-0 size-full object-cover"
            />
            <span className="glass relative z-10 w-fit rounded-xl px-3 py-1.5 text-xs font-semibold">
              Drainers, deflected.
            </span>
          </article>
        </section>

        {/* How it works */}
        <section id="how" className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Wallet,
              title: "Connect a wallet",
              body: "Link any EVM or Solana wallet. Antabuse never holds keys — it only co-signs policy.",
            },
            {
              icon: BadgeCheck,
              title: "Approve subscriptions",
              body: "Set a cap, cadence and merchant for each recurring charge. Everything else is off by default.",
            },
            {
              icon: ShieldAlert,
              title: "Let the breaker watch",
              body: "Our model scores every request. Unlimited approvals, spoofed permits and odd bursts trip instantly.",
            },
          ].map(({ icon: Icon, title, body }, i) => (
            <article key={title} className="bento flex flex-col gap-4 p-7">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-peach-100 text-peach-600">
                  <Icon className="size-5" />
                </span>
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted">{body}</p>
            </article>
          ))}
        </section>

        {/* API feature — text left, image right */}
        <section id="api" className="bento flex flex-row items-center gap-4 bg-[#f6ebe3] p-6 md:gap-10 md:p-12">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-5">
            <span className="text-xs font-semibold uppercase tracking-widest text-peach-600">
              B2B2C API
            </span>
            <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-4xl">
              One call to make every checkout drainer-proof.
            </h2>
            <p className="max-w-md text-sm text-muted md:text-base">
              Wallets, exchanges and merchants embed Antabuse so their users get
              circuit-breaker protection without changing how they pay.
            </p>
            <pre className="w-full max-w-md overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-[11px] leading-relaxed text-white/85 md:text-xs">
{`POST /v1/authorize
{
  "wallet": "0x71C…9A3f",
  "merchant": "spotify",
  "amount": "10.99", "asset": "USDC",
  "cadence": "monthly"
}
→ { "verdict": "allow", "risk": 0.02 }`}
            </pre>
          </div>
          <Image
            src="/wallet.png"
            alt="Glass crypto wallet card with stacked coins and a padlock"
            width={1024}
            height={1024}
            className="w-2/5 shrink-0 mix-blend-multiply md:w-[40%]"
          />
        </section>

        {/* CTA */}
        <section className="bento flex flex-col items-center gap-5 bg-ink px-6 py-14 text-center text-white">
          <h2 className="max-w-xl text-3xl font-bold tracking-tight md:text-5xl">
            Put a breaker on your wallet today.
          </h2>
          <p className="max-w-md text-sm text-white/60">
            Free for individuals. Usage-based API pricing for platforms.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-peach-400 to-peach-600 px-6 py-3 text-sm font-semibold shadow-float"
          >
            Open dashboard <ArrowUpRight className="size-4" />
          </Link>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pb-10 text-sm text-muted">
        <Logo />
        <p>© {new Date().getFullYear()} Antabuse · antabuse.run</p>
      </footer>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-28 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-peach-100)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-peach-500)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="text-xl font-bold tracking-tight">{value}%</span>
    </div>
  );
}
