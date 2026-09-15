import * as React from "react";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { Card } from "@/components/ui";

export default function CostGuidesRoute() {
  return (
    <ParityScreen titleKey="costGuides">
      <Card>
        <StatRow label="Cleaning" value="$35 - $60 / hour" />
        <StatRow label="Removals" value="$60 - $140 / task" />
        <StatRow label="Gardening" value="$40 - $80 / hour" />
        <StatRow label="Handyman" value="$50 - $120 / task" />
      </Card>
    </ParityScreen>
  );
}
