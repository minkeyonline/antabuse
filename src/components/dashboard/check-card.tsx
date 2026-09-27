"use client";

import { useState, useTransition } from "react";
import { encodeFunctionData, erc20Abi, isAddress, maxUint256, parseAbi, parseUnits } from "viem";
import { ScanSearch } from "lucide-react";
import { checkTransaction } from "@/app/dashboard/actions";
import type { CheckInput, CheckResult } from "@/lib/risk-engine";
import type { ChainOption, SubscriptionView, WalletView } from "./types";
import { Card, CardHeader, Empty, ErrorText, ghostBtn, inputCls, primaryBtn, VerdictPill } from "./ui";

// Uniswap's Permit2 contract (same address on every supported chain) as a default counterparty.
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const nftAbi = parseAbi(["function setApprovalForAll(address operator, bool approved)"]);

type Mode = "transaction" | "signature";

export function CheckCard({
  wallets,
  chains,
  subscriptions,
}: {
  wallets: WalletView[];
  chains: ChainOption[];
  subscriptions: SubscriptionView[];
}) {
  const [mode, setMode] = useState<Mode>("transaction");
  const [walletChoice, setWallet] = useState("");
  const wallet = wallets.some((w) => w.address === walletChoice) ? walletChoice : (wallets[0]?.address ?? "");
  const [chainId, setChainId] = useState(chains[0]?.id ?? 1);
  const [counterparty, setCounterparty] = useState(PERMIT2);
  const [to, setTo] = useState("");
  const [data, setData] = useState("");
  const [value, setValue] = useState("");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const chain = chains.find((c) => c.id === chainId);
  const activeSubs = subscriptions.filter((s) => s.status !== "revoked" && wallets.find((w) => w.id === s.walletId)?.address === wallet);
  const cp = isAddress(counterparty) ? counterparty : PERMIT2;

  function fill(next: { to: string; data?: string; value?: string }) {
    setMode("transaction");
    setTo(next.to);
    setData(next.data ?? "");
    setValue(next.value ?? "");
    setResult(null);
  }

  const presets = [
    {
      label: "Unlimited USDC approval",
      run: () =>
        chain &&
        fill({
          to: chain.tokens.USDC,
          data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [cp, maxUint256] }),
        }),
    },
    {
      label: "NFT setApprovalForAll",
      run: () => fill({ to: cp, data: encodeFunctionData({ abi: nftAbi, functionName: "setApprovalForAll", args: [cp, true] }) }),
    },
    {
      label: "Send 1 USDC",
      run: () =>
        chain &&
        fill({
          to: chain.tokens.USDC,
          data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [cp, parseUnits("1", 6)] }),
        }),
    },
    {
      label: "Permit2 unlimited signature",
      run: () => {
        setMode("signature");
        setResult(null);
        setTyped(
          JSON.stringify(
            {
              domain: { name: "Permit2", chainId, verifyingContract: PERMIT2 },
              primaryType: "PermitSingle",
              message: {
                details: { token: chain?.tokens.USDC, amount: (2n ** 160n - 1n).toString(), expiration: "0", nonce: "0" },
                spender: cp,
                sigDeadline: String(Math.floor(Date.now() / 1000) + 3 * 365 * 86400),
              },
            },
            null,
            2,
          ),
        );
      },
    },
  ];

  function chargePreset(s: SubscriptionView) {
    setChainId(s.chainId);
    const c = chains.find((x) => x.id === s.chainId);
    if (s.token === "NATIVE") fill({ to: s.payee, value: parseUnits(s.amount, 18).toString() });
    else if (c)
      fill({
        to: c.tokens[s.token as "USDC" | "USDT"],
        data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [s.payee as `0x${string}`, parseUnits(s.amount, 6)] }),
      });
  }

  function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let typedData: CheckInput["typedData"];
    if (mode === "signature") {
      try {
        typedData = JSON.parse(typed);
      } catch {
        setError("Typed data must be valid JSON");
        return;
      }
    }
    startTransition(async () => {
      const r = await checkTransaction({
        wallet,
        chainId,
        ...(mode === "transaction" ? { transaction: { to, data: data || undefined, value: value || undefined } } : { typedData }),
      });
      if (!r.ok) {
        setError(r.error);
        setResult(null);
      } else setResult(r.data);
    });
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader title="Transaction checker" icon={ScanSearch} />
      {wallets.length === 0 ? (
        <Empty>Add a wallet to run a transaction or signature through the breaker.</Empty>
      ) : (
        <form onSubmit={run} className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputCls} value={wallet} onChange={(e) => setWallet(e.target.value)}>
              {wallets.map((w) => (
                <option key={w.id} value={w.address}>
                  {w.label}
                </option>
              ))}
            </select>
            <select className={inputCls} value={chainId} onChange={(e) => setChainId(Number(e.target.value))}>
              {chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-canvas/70 p-3">
            <label className="text-xs text-muted">
              Counterparty for templates
              <input className={`${inputCls} mt-1 font-mono`} value={counterparty} onChange={(e) => setCounterparty(e.target.value.trim())} />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button key={p.label} type="button" onClick={p.run} className={ghostBtn}>
                  {p.label}
                </button>
              ))}
              {activeSubs.map((s) => (
                <button key={s.id} type="button" onClick={() => chargePreset(s)} className={ghostBtn}>
                  Charge: {s.merchant}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 rounded-xl bg-canvas p-1 text-xs font-semibold">
            {(["transaction", "signature"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-1.5 capitalize ${mode === m ? "bg-white shadow-soft" : "text-muted"}`}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === "transaction" ? (
            <>
              <input className={`${inputCls} font-mono`} placeholder="to 0x…" value={to} onChange={(e) => setTo(e.target.value.trim())} required />
              <textarea className={`${inputCls} font-mono`} rows={2} placeholder="data 0x… (optional)" value={data} onChange={(e) => setData(e.target.value.trim())} />
              <input className={`${inputCls} font-mono`} placeholder="value in wei (optional)" value={value} onChange={(e) => setValue(e.target.value.trim())} />
            </>
          ) : (
            <textarea
              className={`${inputCls} font-mono text-xs`}
              rows={8}
              placeholder='EIP-712 JSON: { "domain": …, "primaryType": "Permit", "message": … }'
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              required
            />
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={pending} className={primaryBtn}>
              {pending ? "Checking…" : "Run check"}
            </button>
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      )}

      {result && (
        <div className="flex flex-col gap-2 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{result.action}</p>
            <VerdictPill verdict={result.verdict} />
          </div>
          <p className="text-xs text-muted">
            Risk {result.risk.toFixed(2)} · trips at {result.breaker.tripAt.toFixed(2)} · {result.latencyMs} ms
          </p>
          <ul className="flex flex-col gap-1 text-xs">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{r.message}</span>
                <span className="font-mono text-muted">{r.weight > 0 ? `+${r.weight.toFixed(2)}` : "ok"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
