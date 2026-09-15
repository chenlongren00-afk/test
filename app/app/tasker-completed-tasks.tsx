import * as React from "react";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function TaskerCompletedTasksRoute() {
  const store = useAppStore();
  const completed = store.taskerCompletedTasks;
  const total = completed.reduce((sum, task) => sum + Number(task.budget || 0), 0);
  return (
    <ParityScreen titleKey="taskerCompletedTasks">
      <Card>
        <StatRow label={store.translate("completedAsTasker")} value={completed.length} />
        <StatRow label={store.translate("totalPaidValue")} value={`$${total}`} />
      </Card>
    </ParityScreen>
  );
}
