"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { createApiKey, revokeApiKey } from "@/app/dashboard/actions";
import { timeAgo } from "@/lib/format";
import type { ApiKeyView } from "./types";
import { Card, CardHeader, ErrorText, ghostBtn, inputCls, primaryBtn } from "./ui";

export function ApiKeysCard({ keys, origin }: { keys: ApiKeyView[]; origin: string }) {
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const r = await createApiKey(name);
      if (!r.ok) setError(r.error);
      else {
        setFresh(r.data.key);
        setName("");
      }
    });
  }

  function revoke(id: string) {
    if (!confirm("Revoke this key? Requests using it will be rejected immediately.")) return;
    startTransition(async () => {
      const r = await revokeApiKey(id);
      if (!r.ok) setError(r.error);
    });
  }

  async function copy() {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const curl = `curl -X POST ${origin}/api/v1/authorize \\
  -H "Authorization: Bearer ${fresh ?? "ak_live_…"}" \\
  -H "Content-Type: application/json" \\
  -d '{"wallet":"0x…","chainId":1,
       "transaction":{"to":"0x…","data":"0x…"}}'`;

  return (
    <Card className="md:col-span-2">
      <CardHeader title="API keys" icon={KeyRound} />
      <div className="flex gap-2">
        <input className={inputCls} placeholder="Key name (e.g. Production)" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" disabled={pending} onClick={create} className={primaryBtn}>
          Create
        </button>
      </div>
      <ErrorText>{error}</ErrorText>

      {fresh && (
        <div className="flex flex-col gap-2 rounded-2xl bg-mint-100/60 p-3">
          <p className="text-xs font-semibold text-mint-600">Copy this key now. It won&rsquo;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1.5 font-mono text-xs">{fresh}</code>
            <button type="button" onClick={copy} className={ghostBtn} aria-label="Copy key">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
      )}

      {keys.length > 0 && (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-semibold">{k.name}</p>
                <p className="font-mono text-xs text-muted">
                  {k.prefix}… · created {timeAgo(k.createdAt)} · {k.lastUsedAt ? `used ${timeAgo(k.lastUsedAt)}` : "never used"}
                </p>
              </div>
              <button type="button" disabled={pending} onClick={() => revoke(k.id)} className={`${ghostBtn} hover:text-red-600`}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      <pre className="overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-[11px] leading-relaxed text-white/85">{curl}</pre>
    </Card>
  );
}
