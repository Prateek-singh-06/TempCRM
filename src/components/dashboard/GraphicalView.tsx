"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, BarChart3, Target, AlertCircle, Loader2 } from "lucide-react";
import FunnelChartComponent from "@/components/dashboard/charts/FunnelChart";
import SalesByRegionChart from "@/components/dashboard/charts/SalesByRegionChart";
import DealSizeChart from "@/components/dashboard/charts/DealSizeChart";
import TeamActivityChart from "@/components/dashboard/charts/TeamActivityChart";
import { useMemo, useEffect, useState } from "react";

// Dynamically import to avoid SSR issues with window
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false } as any) as any;

type GraphicalViewProps = {
  metrics: any | null;
};

export default function GraphicalView({ metrics }: GraphicalViewProps) {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all required data in parallel
        const [fuRes, oppRes, analyticsRes] = await Promise.all([
          fetch('/api/daily-followups'),
          fetch('/api/opportunities'),
          fetch('/api/analytics')
        ]);
        
        const [fu, opp, analytics] = await Promise.all([
          fuRes.ok ? fuRes.json() : Promise.resolve({ dailyFollowUps: [] }),
          oppRes.ok ? oppRes.json() : Promise.resolve({ opportunities: [] }),
          analyticsRes.ok ? analyticsRes.json() : Promise.resolve(null)
        ]);
        
        setFollowUps(Array.isArray(fu.dailyFollowUps) ? fu.dailyFollowUps : []);
        setOpportunities(Array.isArray(opp.opportunities) ? opp.opportunities : []);
        setAnalyticsData(analytics);
      } catch (err) {
        console.error('Error loading GraphicalView data:', err);
        setError('Failed to load dashboard data');
        setFollowUps([]);
        setOpportunities([]);
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  // Use analytics data if available, fallback to metrics prop
  const dataSource = analyticsData || metrics;
  const leadSources = dataSource?.leadSources ?? [];
  const pipeline = dataSource?.pipeline ?? [];
  const revenueByMonth: Array<{ period: string; revenue: number }> = dataSource?.revenue?.byMonth ?? [];

  const donutData = useMemo(() => {
    if (!Array.isArray(leadSources) || leadSources.length === 0) {
      return { series: [], labels: [] };
    }
    const series = leadSources.map((s: any) => s.count || 0);
    const labels = leadSources.map((s: any) => s.source || 'Unknown');
    return { series, labels };
  }, [leadSources]);

  const pipelineData = useMemo(() => {
    if (!Array.isArray(pipeline) || pipeline.length === 0) {
      return { categories: [], series: [{ name: "Deals", data: [] }] };
    }
    const categories = pipeline.map((p: any) => p.stage || 'Unknown');
    const series = [{ name: "Deals", data: pipeline.map((p: any) => p.count || 0) }];
    return { categories, series };
  }, [pipeline]);

  const revenueSeries = useMemo(() => {
    const data = (revenueByMonth || []).map((r) => ({ x: r.period, y: r.revenue || 0 }));
    return [{ name: "Revenue", data }];
  }, [revenueByMonth]);

  const kpi = {
    conversionRate: Math.round((dataSource?.conversionRate ?? dataSource?.performance?.conversionRate ?? 0) * (dataSource?.conversionRate ? 1 : 100)),
    forecastConfidence: Math.round((dataSource?.aiInsights?.revenueAnalysis?.confidence ?? 0) * 100),
    leadQuality: Math.round(dataSource?.kpiMetrics?.leadQualityScore ?? 0),
    predictiveAccuracy: Math.round(dataSource?.kpiMetrics?.predictiveAccuracy ?? 0),
  };

  // Heatmap: Follow-ups by day/hour
  const heatmapSeries = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const hours = Array.from({ length: 24 }, (_, h) => `${h}:00`);
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const f of followUps) {
      try {
        const d = new Date(f.followUpDate);
        if (!Number.isNaN(d.getTime())) {
          const di = d.getDay();
          const hi = d.getHours();
          if (!Number.isNaN(di) && !Number.isNaN(hi)) grid[di][hi] += 1;
        }
      } catch (error) {
        console.warn('Invalid followUpDate in follow-up data:', f.followUpDate);
      }
    }
    return days.map((name, i) => ({ name, data: hours.map((h, j) => ({ x: h, y: grid[i][j] })) }));
  }, [followUps]);

  // Treemap: Revenue mix by company type (industry proxy)
  const treemapSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of opportunities) {
      if (o.stage === 'CLOSED_WON') {
        const key = o.classification || o.companies?.type || 'Unknown';
        const val = (o.closedValue ?? o.dealSize ?? 0) as number;
        map.set(key, (map.get(key) || 0) + (val || 0));
      }
    }
    return [{ data: Array.from(map, ([x, y]) => ({ x, y })) }];
  }, [opportunities]);

  // Radial: Pipeline health by owner (weighted stage x probability)
  const ownerHealth = useMemo(() => {
    const stageScore: Record<string, number> = {
      PROSPECTING: 20,
      QUALIFICATION: 40,
      PROPOSAL: 60,
      NEGOTIATION: 80,
      CLOSED_WON: 100,
      CLOSED_LOST: 0,
    };
    const agg = new Map<string, { sum: number; w: number }>();
    for (const o of opportunities) {
      if (o.stage === 'CLOSED_WON' || o.stage === 'CLOSED_LOST') continue;
      const name = o.users?.name || `User ${o.ownerId}`;
      const s = stageScore[o.stage] ?? 0;
      const w = (o.probability ?? 0) / 100 || 0.5;
      const curr = agg.get(name) || { sum: 0, w: 0 };
      curr.sum += s * w;
      curr.w += w;
      agg.set(name, curr);
    }
    const labels: string[] = [];
    const values: number[] = [];
    agg.forEach((v, k) => {
      labels.push(k);
      values.push(v.w > 0 ? Math.min(100, Math.round(v.sum / v.w)) : 0);
    });
    return { labels, values };
  }, [opportunities]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-slate-600 dark:text-slate-400">Loading dashboard charts...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
              <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
              <p className="text-sm text-slate-500">Please refresh the page or contact support if the issue persists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Radials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-900/40 dark:to-indigo-900/30 border-blue-200/50 dark:border-indigo-800/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <TrendingUp className="h-5 w-5 text-sky-600" /> Conversion
            </CardTitle>
            <CardDescription>Current conversion performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactApexChart
              type="radialBar"
              height={210}
              options={{
                chart: { sparkline: { enabled: true } },
                plotOptions: {
                  radialBar: {
                    hollow: { size: "58%" },
                    dataLabels: {
                      value: { formatter: (val: number) => `${Math.round(val)}%` },
                    },
                  },
                },
                colors: ["#0ea5e9"],
                labels: ["Rate"],
              }}
              series={[Math.max(0, Math.min(100, kpi.conversionRate))]}
            />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/30 border-emerald-200/50 dark:border-emerald-800/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Sparkles className="h-5 w-5 text-emerald-600" /> Forecast Confidence
            </CardTitle>
            <CardDescription>AI forecast confidence</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactApexChart
              type="radialBar"
              height={210}
              options={{
                chart: { sparkline: { enabled: true } },
                plotOptions: {
                  radialBar: {
                    hollow: { size: "58%" },
                    dataLabels: {
                      value: { formatter: (val: number) => `${Math.round(val)}%` },
                    },
                  },
                },
                colors: ["#10b981"],
                labels: ["Confidence"],
              }}
              series={[Math.max(0, Math.min(100, kpi.forecastConfidence))]}
            />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-fuchsia-100 dark:from-violet-900/40 dark:to-fuchsia-900/30 border-violet-200/50 dark:border-fuchsia-800/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <BarChart3 className="h-5 w-5 text-violet-600" /> Lead Quality
            </CardTitle>
            <CardDescription>Composite lead quality score</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactApexChart
              type="radialBar"
              height={210}
              options={{
                chart: { sparkline: { enabled: true } },
                plotOptions: {
                  radialBar: {
                    hollow: { size: "58%" },
                    dataLabels: {
                      value: { formatter: (val: number) => `${Math.round(val)}%` },
                    },
                  },
                },
                colors: ["#8b5cf6"],
                labels: ["Quality"],
              }}
              series={[Math.max(0, Math.min(100, kpi.leadQuality))]}
            />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30 border-amber-200/50 dark:border-orange-800/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Target className="h-5 w-5 text-amber-600" /> Predictive Accuracy
            </CardTitle>
            <CardDescription>Model backtest accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactApexChart
              type="radialBar"
              height={210}
              options={{
                chart: { sparkline: { enabled: true } },
                plotOptions: {
                  radialBar: {
                    hollow: { size: "58%" },
                    dataLabels: {
                      value: { formatter: (val: number) => `${Math.round(val)}%` },
                    },
                  },
                },
                colors: ["#f59e0b"],
                labels: ["Accuracy"],
              }}
              series={[Math.max(0, Math.min(100, kpi.predictiveAccuracy))]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Revenue Trend</CardTitle>
            <CardDescription>Historical performance by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactApexChart
              type="area"
              height={300}
              options={{
                chart: { toolbar: { show: false } },
                dataLabels: { enabled: false },
                stroke: { curve: "smooth", width: 3 },
                fill: { type: "gradient", gradient: { opacityFrom: 0.6, opacityTo: 0.05 } },
                xaxis: { type: "category" },
                colors: ["#2563eb"],
                grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
                tooltip: { y: { formatter: (v: number) => `$${(v || 0).toLocaleString()}` } },
              }}
              series={revenueSeries}
            />
          </CardContent>
        </Card>

        <FunnelChartComponent data={pipeline} />
      </div>

      {/* Additional Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SalesByRegionChart />
        <DealSizeChart />
        <TeamActivityChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Source contribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <ReactApexChart
                type="donut"
                height={300}
                options={{
                  labels: donutData.labels,
                  legend: { position: "bottom" },
                  colors: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
                  dataLabels: { formatter: (val: number) => `${Math.round(val)}%` },
                }}
                series={donutData.series}
              />
              <div>
                {(leadSources || []).slice(0, 6).map((s: any) => (
                  <div key={s.source} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{s.source}</span>
                    <Badge variant="secondary" className="rounded-full">{s.percentage || 0}%</Badge>
                  </div>
                ))}
                {(!leadSources || leadSources.length === 0) && (
                  <div className="text-sm text-slate-500">No lead source data</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">AI Insights</CardTitle>
            <CardDescription className="text-white/80">Data-backed recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(dataSource?.aiInsights?.recommendations || []).slice(0, 5).map((r: any, idx: number) => (
                <li key={idx} className="text-sm leading-6 flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span className="text-white/90">{typeof r === 'string' ? r : (r?.description || r?.insight || 'AI recommendation')}</span>
                </li>
              ))}
              {(!dataSource?.aiInsights?.recommendations || dataSource.aiInsights.recommendations.length === 0) && (
                <li className="text-white/80">Loading AI insights...</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap + Treemap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Follow-ups Heatmap</CardTitle>
            <CardDescription>Volume by day and hour</CardDescription>
          </CardHeader>
          <CardContent>
            {followUps.length > 0 ? (
              <ReactApexChart
                type="heatmap"
                height={320}
                options={{
                  chart: { toolbar: { show: false } },
                  dataLabels: { enabled: false },
                  plotOptions: { heatmap: { shadeIntensity: 0.35, colorScale: { ranges: [
                    { from: 0, to: 0, name: 'None', color: '#eef2ff' },
                    { from: 1, to: 3, name: 'Low', color: '#bfdbfe' },
                    { from: 4, to: 8, name: 'Medium', color: '#60a5fa' },
                    { from: 9, to: 1000, name: 'High', color: '#2563eb' },
                  ]}}},
                  grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
                  xaxis: { type: 'category', tickAmount: 12 },
                  legend: { position: 'bottom' }
                }}
                series={heatmapSeries}
              />
            ) : (
              <div className="text-sm text-slate-500">No follow-up data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Revenue Mix</CardTitle>
            <CardDescription>By industry (company type)</CardDescription>
          </CardHeader>
          <CardContent>
            {opportunities.length > 0 ? (
              <ReactApexChart
                type="treemap"
                height={320}
                options={{
                  chart: { toolbar: { show: false } },
                  legend: { show: false },
                  tooltip: { y: { formatter: (v: number) => `$${(v||0).toLocaleString()}` } },
                  plotOptions: { treemap: { enableShades: true, shadeIntensity: 0.4 } },
                  colors: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"],
                }}
                series={treemapSeries}
              />
            ) : (
              <div className="text-sm text-slate-500">No revenue mix data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Health by Owner */}
      <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Pipeline Health by Owner</CardTitle>
          <CardDescription>Weighted by stage and probability</CardDescription>
        </CardHeader>
        <CardContent>
          {ownerHealth.values.length > 0 ? (
            <ReactApexChart
              type="radialBar"
              height={360}
              options={{
                chart: { toolbar: { show: false } },
                labels: ownerHealth.labels,
                colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#22c55e"],
                plotOptions: { radialBar: { hollow: { size: '28%' }, dataLabels: { value: { formatter: (v: number) => `${Math.round(v)}%` } } } },
                legend: { show: true, position: 'bottom' }
              }}
              series={ownerHealth.values}
            />
          ) : (
            <div className="text-sm text-slate-500">No active pipeline data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
