import * as React from "react";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function AccountSyncRoute() {
  const store = useAppStore();
  return (
    <ParityScreen titleKey="accountSync">
      <Card>
        <StatRow label={store.translate("backend")} value="api.australianhelper.com" />
        <StatRow label={store.translate("signedIn")} value={store.isAuthenticated ? store.translate("completed") : store.translate("setupRequired")} />
        <StatRow label={store.translate("profile")} value={store.currentUser?.email || "-"} />
      </Card>
    </ParityScreen>
  );
}
