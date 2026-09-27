import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getDb, schema } from "@/db";
import { getPortfolio } from "@/lib/portfolio";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const rows = await db.select().from(schema.wallets).where(eq(schema.wallets.userId, userId));
  const portfolios = await Promise.all(rows.map((w) => getPortfolio(w.address as Address)));
  const priced = portfolios.every((p) => p.totalUsd != null);

  return NextResponse.json({
    wallets: portfolios,
    totalUsd: priced ? portfolios.reduce((s, p) => s + (p.totalUsd ?? 0), 0) : null,
    fetchedAt: new Date().toISOString(),
  });
}
