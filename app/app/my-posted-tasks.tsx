import * as React from "react";

import { ParityScreen } from "@/components/ParityScreen";
import { StatusBanner, TaskCard } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function MyPostedTasksRoute() {
  const store = useAppStore();
  const tasks = store.myPostedTasks;

  return (
    <ParityScreen titleKey="myPostedTasks">
      {tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} href={`/task/${task.id}`} />) : <StatusBanner message={store.translate("noTasks")} />}
    </ParityScreen>
  );
}
