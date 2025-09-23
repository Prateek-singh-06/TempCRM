"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";

type FunnelChartProps = {
  data: {
    stage: string;
    count: number;
    color: string;
  }[];
};

export default function FunnelChartComponent({ data }: FunnelChartProps) {
  return (
    <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Opportunity Pipeline</CardTitle>
        <CardDescription>Active deals distribution in the sales funnel.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey="count" data={data} isAnimationActive>
              <LabelList position="right" fill="#000" stroke="none" dataKey="stage" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
