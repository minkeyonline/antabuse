import { currentUser } from "@clerk/nextjs/server";
import { Dashboard } from "@/components/dashboard/dashboard";
import { firewallEvents, subscriptions, wallets } from "@/lib/mock-data";

export default async function DashboardPage() {
  const user = await currentUser();
  const name = user?.firstName ?? user?.username ?? "there";

  return (
    <Dashboard
      greeting={`Hi ${name}`}
      initialWallets={wallets}
      initialSubscriptions={subscriptions}
      events={firewallEvents}
    />
  );
}
