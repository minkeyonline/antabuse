import { Activity, CircleCheck, CircleHelp, Zap } from "lucide-react";
import type { EventRow } from "@/db/schema";
import { chainName } from "@/lib/chains";
import { shortAddress, timeAgo } from "@/lib/format";
import { Card, CardHeader, Empty } from "./ui";

export function ActivityCard({ events, now }: { events: EventRow[]; now: number }) {
  return (
    <Card className="md:col-span-2">
      <CardHeader title="Firewall activity" action={<Activity className="size-4 text-muted" />} />
      {events.length === 0 ? (
        <Empty>
          No checks yet. Run one from the transaction checker below, or send requests to the API with a key.
        </Empty>
      ) : (
        <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 rounded-2xl bg-canvas/70 px-3 py-2.5">
              <VerdictIcon verdict={e.verdict} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {e.action} <span className="font-mono text-xs text-muted">→ {shortAddress(e.target)}</span>
                </p>
                <p className="truncate text-xs text-muted">
                  {e.reasons.find((r) => r.weight > 0)?.message ?? e.reasons[0]?.message ?? "No risk signals"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold capitalize">{e.verdict}</p>
                <p className="text-xs text-muted">
                  {timeAgo(e.createdAt, now)} · {chainName(e.chainId)} · {e.risk.toFixed(2)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted">{e.source}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function VerdictIcon({ verdict }: { verdict: string }) {
  if (verdict === "allowed")
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-mint-100 text-mint-600">
        <CircleCheck className="size-4" />
      </span>
    );
  if (verdict === "tripped")
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-peach-500 text-white">
        <Zap className="size-4" fill="currentColor" />
      </span>
    );
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-peach-100 text-peach-600">
      <CircleHelp className="size-4" />
    </span>
  );
}
