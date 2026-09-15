import * as React from "react";

import { ParityScreen } from "@/components/ParityScreen";
import { StatusBanner, TaskCard } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function TasksAppliedRoute() {
  const store = useAppStore();
  const tasks = store.myAppliedTasks;

  return (
    <ParityScreen titleKey="tasksApplied">
      {tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} href={`/task/${task.id}`} />) : <StatusBanner message={store.translate("noTasks")} />}
    </ParityScreen>
  );
}
