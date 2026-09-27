"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Power } from "lucide-react";
import { updateBreaker } from "@/app/dashboard/actions";

type Props = {
  armed: boolean;
  sensitivity: number;
  stats: { checks24h: number; tripped24h: number; medianLatencyMs: number | null; wallets: number };
};

function thresholds(s: number) {
  const tripAt = 0.9 - (0.6 * s) / 100;
  return { tripAt, challengeAt: Math.max(0.1, tripAt - 0.2) };
}

export function BreakerCard({ armed: initialArmed, sensitivity: initialSensitivity, stats }: Props) {
  const [armed, setArmed] = useState(initialArmed);
  const [sensitivity, setSensitivity] = useState(initialSensitivity);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function toggle() {
    const next = !armed;
    setArmed(next);
    startTransition(async () => {
      const r = await updateBreaker({ armed: next });
      if (!r.ok) {
        setArmed(!next);
        setError(r.error);
      }
    });
  }

  function changeSensitivity(v: number) {
    setSensitivity(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await updateBreaker({ sensitivity: v });
      if (!r.ok) setError(r.error);
    }, 400);
  }

  const { tripAt, challengeAt } = thresholds(sensitivity);
  const dark = armed;

  return (
    <section className={`bento flex flex-col gap-6 p-6 md:col-span-2 lg:row-span-2 ${dark ? "bg-ink text-white" : "bg-white"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${dark ? "text-white/60" : "text-muted"}`}>Circuit Breaker</p>
          <h2 className="mt-1 text-2xl font-semibold">{armed ? "Armed & monitoring" : "Disarmed: checks are logged only"}</h2>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={armed}
          aria-label="Toggle circuit breaker"
          disabled={pending}
          onClick={toggle}
          className={`relative grid size-14 shrink-0 place-items-center rounded-2xl transition ${
            armed ? "bg-gradient-to-br from-peach-400 to-peach-600 text-white shadow-float" : "bg-peach-100 text-peach-600"
          }`}
        >
          {armed && <span className="absolute inset-0 rounded-2xl bg-peach-500/40 animate-pulse-ring" />}
          <Power className="relative size-6" />
        </button>
      </div>

      <div className="flex flex-row items-center gap-4">
        <div className="grid flex-1 grid-cols-2 gap-3">
          <Metric dark={dark} label="Checks (24h)" value={String(stats.checks24h)} />
          <Metric dark={dark} label="Tripped (24h)" value={String(stats.tripped24h)} />
          <Metric dark={dark} label="Median decision" value={stats.medianLatencyMs == null ? "—" : `${stats.medianLatencyMs} ms`} />
          <Metric dark={dark} label="Wallets watched" value={String(stats.wallets)} />
        </div>
        <Image
          src="/ai-nodes.png"
          alt="Risk engine node network"
          width={1024}
          height={1024}
          className={`w-2/5 shrink-0 rounded-2xl ${armed ? "opacity-90" : "mix-blend-multiply grayscale"}`}
        />
      </div>

      <label className="flex flex-col gap-2">
        <span className="flex justify-between text-sm">
          <span className={dark ? "text-white/70" : "text-muted"}>Trip sensitivity</span>
          <span className="font-semibold">
            {sensitivity < 40 ? "Relaxed" : sensitivity < 75 ? "Balanced" : "Strict"} · {sensitivity}
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={sensitivity}
          onChange={(e) => changeSensitivity(Number(e.target.value))}
          className="accent-peach-500"
        />
        <span className={`text-xs ${dark ? "text-white/50" : "text-muted"}`}>
          Trips at risk ≥ {tripAt.toFixed(2)} · asks for confirmation at ≥ {challengeAt.toFixed(2)}
        </span>
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </section>
  );
}

function Metric({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? "bg-white/5" : "bg-canvas"}`}>
      <p className={`text-xs ${dark ? "text-white/55" : "text-muted"}`}>{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
