"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, TrendingUp, BarChart3, Target, Users, Activity, 
  DollarSign, Calendar, Clock, Building2, UserCheck, AlertCircle,
  Zap, Brain, Eye, Layers, PieChart as PieChartIcon, TrendingDown, ArrowUpRight,
  ArrowDownRight, Briefcase, Mail, Phone, MapPin, Globe, Filter,
  FileText, CheckCircle, XCircle, AlertTriangle, Info, Database,
  Cpu, Gauge, Award, Star, Heart, Shield, Lock, Unlock
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Dynamically import chart libraries to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false }) as any;
const Chart = dynamic(() => import("react-chartjs-2").then(mod => mod.Chart), { ssr: false }) as any;
const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false }) as any;
const Bar = dynamic(() => import("react-chartjs-2").then(mod => mod.Bar), { ssr: false }) as any;
const Doughnut = dynamic(() => import("react-chartjs-2").then(mod => mod.Doughnut), { ssr: false }) as any;
const Radar = dynamic(() => import("react-chartjs-2").then(mod => mod.Radar), { ssr: false }) as any;
const PolarArea = dynamic(() => import("react-chartjs-2").then(mod => mod.PolarArea), { ssr: false }) as any;
const Bubble = dynamic(() => import("react-chartjs-2").then(mod => mod.Bubble), { ssr: false }) as any;
const Scatter = dynamic(() => import("react-chartjs-2").then(mod => mod.Scatter), { ssr: false }) as any;

// Wrapper to bypass TypeScript strict checking for Recharts components
const loadChart = (loader: () => Promise<any>) => dynamic(loader, { ssr: false }) as any;

// Individual Recharts components with proper dynamic imports
const LineChart = loadChart(() => import("recharts").then(mod => mod.LineChart as any));
const BarChart = loadChart(() => import("recharts").then(mod => mod.BarChart as any));
const AreaChart = loadChart(() => import("recharts").then(mod => mod.AreaChart as any));
const PieChart = loadChart(() => import("recharts").then(mod => mod.PieChart as any));
const RadarChart = loadChart(() => import("recharts").then(mod => mod.RadarChart as any));
const ComposedChart = loadChart(() => import("recharts").then(mod => mod.ComposedChart as any));
const Treemap = loadChart(() => import("recharts").then(mod => mod.Treemap as any));
const RadialBarChart = loadChart(() => import("recharts").then(mod => mod.RadialBarChart as any));
const ResponsiveContainer = loadChart(() => import("recharts").then(mod => mod.ResponsiveContainer as any));

// Recharts sub-components (with R prefix to avoid conflicts)
const RLine = loadChart(() => import("recharts").then(mod => mod.Line as any));
const RBar = loadChart(() => import("recharts").then(mod => mod.Bar as any));
const RArea = loadChart(() => import("recharts").then(mod => mod.Area as any));
const RPie = loadChart(() => import("recharts").then(mod => mod.Pie as any));
const XAxis = loadChart(() => import("recharts").then(mod => mod.XAxis as any));
const YAxis = loadChart(() => import("recharts").then(mod => mod.YAxis as any));
const CartesianGrid = loadChart(() => import("recharts").then(mod => mod.CartesianGrid as any));
const Tooltip = loadChart(() => import("recharts").then(mod => mod.Tooltip as any));
const Legend = loadChart(() => import("recharts").then(mod => mod.Legend as any));
const Cell = loadChart(() => import("recharts").then(mod => mod.Cell as any));
const RadialBar = loadChart(() => import("recharts").then(mod => mod.RadialBar as any));
const PolarGrid = loadChart(() => import("recharts").then(mod => mod.PolarGrid as any));
const PolarAngleAxis = loadChart(() => import("recharts").then(mod => mod.PolarAngleAxis as any));
const PolarRadiusAxis = loadChart(() => import("recharts").then(mod => mod.PolarRadiusAxis as any));
const RRadar = loadChart(() => import("recharts").then(mod => mod.Radar as any));
const Brush = loadChart(() => import("recharts").then(mod => mod.Brush as any));
const ReferenceLine = loadChart(() => import("recharts").then(mod => mod.ReferenceLine as any));

type EnhancedGraphicalViewProps = {
  metrics: any | null;
};

// Color palettes inspired by Apple and modern design
const COLORS = {
  primary: ['#007AFF', '#5AC8FA', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF6482', '#FFD60A'],
  gradient: [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
  ],
  chart: {
    blue: '#007AFF',
    green: '#34C759',
    orange: '#FF9500',
    red: '#FF3B30',
    purple: '#AF52DE',
    teal: '#5AC8FA',
    pink: '#FF6482',
    yellow: '#FFD60A',
    indigo: '#5856D6',
    gray: '#8E8E93'
  }
};

const formatCurrency = (value: number, compact = false) => {
  if (!Number.isFinite(value)) {
    return '$0';
  }

  const baseOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
  };

  const options = compact
    ? { ...baseOptions, notation: 'compact' as const, maximumFractionDigits: 1 }
    : { ...baseOptions, minimumFractionDigits: Math.abs(value) < 100 ? 2 : 0, maximumFractionDigits: Math.abs(value) < 100 ? 2 : 0 };

  return new Intl.NumberFormat('en-US', options).format(value);
};

const formatCompactCurrency = (value: number) => formatCurrency(value, true);

export default function EnhancedGraphicalView({ metrics }: EnhancedGraphicalViewProps) {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [selectedView, setSelectedView] = useState('overview');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        console.log('Loading enhanced graphical view data...');
        
        const [fuRes, oppRes, leadRes, actRes, compRes, memRes, attRes, interRes, actSumRes] = await Promise.all([
          fetch('/api/daily-followups').catch(err => { console.error('Failed to fetch follow-ups:', err); return { ok: false }; }),
          fetch('/api/opportunities').catch(err => { console.error('Failed to fetch opportunities:', err); return { ok: false }; }),
          fetch('/api/leads').catch(err => { console.error('Failed to fetch leads:', err); return { ok: false }; }),
          fetch('/api/activities?days=30&limit=1000').catch(err => { console.error('Failed to fetch activities:', err); return { ok: false }; }),
          fetch('/api/companies').catch(err => { console.error('Failed to fetch companies:', err); return { ok: false }; }),
          fetch('/api/members').catch(err => { console.error('Failed to fetch members:', err); return { ok: false }; }),
          fetch('/api/attendance').catch(err => { console.error('Failed to fetch attendance:', err); return { ok: false }; }),
          fetch('/api/analytics').catch(err => { console.error('Failed to fetch analytics:', err); return { ok: false }; }),
          fetch('/api/activities/summary?days=30').catch(err => { console.error('Failed to fetch activity summary:', err); return { ok: false }; })
        ]);
        
        const [fu, opp, lead, act, comp, mem, att, inter, actSum] = await Promise.all([
          fuRes.ok && fuRes instanceof Response ? fuRes.json().catch(() => ({ dailyFollowUps: [] })) : Promise.resolve({ dailyFollowUps: [] }),
          oppRes.ok && oppRes instanceof Response ? oppRes.json().catch(() => ({ opportunities: [] })) : Promise.resolve({ opportunities: [] }),
          leadRes.ok && leadRes instanceof Response ? leadRes.json().catch(() => ({ leads: [] })) : Promise.resolve({ leads: [] }),
          actRes.ok && actRes instanceof Response ? actRes.json().catch(() => ({ activities: [] })) : Promise.resolve({ activities: [] }),
          compRes.ok && compRes instanceof Response ? compRes.json().catch(() => ({ companies: [] })) : Promise.resolve({ companies: [] }),
          memRes.ok && memRes instanceof Response ? memRes.json().catch(() => ({ members: [] })) : Promise.resolve({ members: [] }),
          attRes.ok && attRes instanceof Response ? attRes.json().catch(() => ({ attendance: [] })) : Promise.resolve({ attendance: [] }),
          interRes.ok && interRes instanceof Response ? interRes.json().catch(() => ({})) : Promise.resolve({}),
          actSumRes.ok && actSumRes instanceof Response ? actSumRes.json().catch(() => ({ summary: [] })) : Promise.resolve({ summary: [] })
        ]);

        console.log('Data loaded:', { 
          followUps: fu.dailyFollowUps?.length || 0, 
          opportunities: opp.opportunities?.length || 0,
          leads: lead.leads?.length || 0,
          activities: act.activities?.length || 0,
          companies: comp.companies?.length || 0,
          members: mem.members?.length || 0,
          attendance: att.attendance?.length || 0,
          teamActivity: actSum.summary?.length || 0
        });

        setFollowUps(Array.isArray(fu.dailyFollowUps) ? fu.dailyFollowUps : []);
        setOpportunities(Array.isArray(opp.opportunities) ? opp.opportunities : []);
        setLeads(Array.isArray(lead.leads) ? lead.leads : []);
        setActivities(Array.isArray(act.activities) ? act.activities : []);
        setCompanies(Array.isArray(comp.companies) ? comp.companies : []);
        setMembers(Array.isArray(mem.members) ? mem.members : []);
        setAttendance(Array.isArray(att.attendance) ? att.attendance : []);
        setAnalyticsData(inter);
        setTeamActivity(Array.isArray(actSum.summary) ? actSum.summary : []);
      } catch (error) {
        console.error('Error loading enhanced graphical view data:', error);
        // Set empty defaults to prevent crashes
        setFollowUps([]);
        setOpportunities([]);
        setLeads([]);
        setActivities([]);
        setCompanies([]);
        setMembers([]);
        setAttendance([]);
        setAnalyticsData({});
        setTeamActivity([]);
      }
    };
    loadAllData();
  }, []);

  // Process data for various visualizations
  const processedData = useMemo(() => {
    // Lead funnel data (use qualificationStage where available)
    const stageKeys = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'] as const;
    const leadFunnel = {
      stages: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'],
      values: stageKeys.map(k => leads.filter(l => ((l.qualificationStage || l.status || '').toUpperCase()) === k).length)
    };

    // Pipeline velocity
    const pipelineVelocity = opportunities.reduce((acc, opp) => {
      const stage = opp.stage || 'Unknown';
      if (!acc[stage]) acc[stage] = { count: 0, value: 0, avgDays: 0 };
      acc[stage].count++;
      acc[stage].value += opp.dealSize || 0;
      const days = opp.createdDate ? 
        Math.floor((Date.now() - new Date(opp.createdDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      acc[stage].avgDays = (acc[stage].avgDays * (acc[stage].count - 1) + days) / acc[stage].count;
      return acc;
    }, {} as Record<string, any>);

    // Activity effectiveness matrix
    const activityMatrix = activities.reduce((acc, act) => {
      const type = act.type || 'Other';
      const effectiveness = act.effectiveness || 'MEDIUM';
      if (!acc[type]) acc[type] = { LOW: 0, MEDIUM: 0, HIGH: 0, EXCELLENT: 0 };
      acc[type][effectiveness]++;
      return acc;
    }, {} as Record<string, any>);

    // Company distribution by region and type
    const companyDistribution = companies.reduce((acc, comp) => {
      const key = `${comp.region || 'Unknown'}_${comp.type || 'Unknown'}`;
      if (!acc[key]) acc[key] = { count: 0, value: 0, region: comp.region, type: comp.type };
      acc[key].count++;
      acc[key].value += comp.totalValue || 0;
      return acc;
    }, {} as Record<string, any>);

    // Member performance metrics
    const memberPerformance = members.map(member => {
      const memberOpps = opportunities.filter(o => o.ownerId === member.id);
      const wonDeals = memberOpps.filter(o => o.stage === 'CLOSED_WON');
      const totalValue = wonDeals.reduce((sum, o) => sum + (o.dealSize || 0), 0);
      const winRate = memberOpps.length > 0 ? (wonDeals.length / memberOpps.length) * 100 : 0;
      
      return {
        name: member.name,
        deals: memberOpps.length,
        won: wonDeals.length,
        value: totalValue,
        winRate: winRate,
        avgDealSize: wonDeals.length > 0 ? totalValue / wonDeals.length : 0
      };
    });

    // Attendance patterns
    const attendancePatterns = attendance.reduce((acc, att) => {
      const dateRef = att.date || att.submittedAt || att.submittedAtUTC;
      const dateObj = new Date(dateRef || Date.now());
      const dayOfWeek = dateObj.getDay();
      const hour = dateObj.getHours();
      const key = `${dayOfWeek}_${hour}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Deal size distribution from opportunities
    const dealDistribution = { small: 0, medium: 0, large: 0, enterprise: 0 };
    opportunities.forEach(o => {
      const v = o.dealSize || 0;
      if (v < 50000) dealDistribution.small++;
      else if (v < 200000) dealDistribution.medium++;
      else if (v < 1000000) dealDistribution.large++;
      else dealDistribution.enterprise++;
    });

    // Opportunity health by probability/winProbability
    const opportunityHealth = { critical: 0, atRisk: 0, fair: 0, good: 0, excellent: 0 };
    opportunities.forEach(o => {
      const p = (o.winProbability ?? o.probability ?? 0);
      if (p < 20) opportunityHealth.critical++;
      else if (p < 40) opportunityHealth.atRisk++;
      else if (p < 60) opportunityHealth.fair++;
      else if (p < 80) opportunityHealth.good++;
      else opportunityHealth.excellent++;
    });

    // Channel effectiveness
    const channelAgg = activities.reduce((acc, a) => {
      const ch = (a.channel || 'OTHER').toString();
      if (!acc[ch]) acc[ch] = { total: 0, responded: 0 };
      acc[ch].total++;
      if (a.responseReceived) acc[ch].responded++;
      return acc;
    }, {} as Record<string, { total: number; responded: number }>);

    // Follow-up effectiveness by time-of-day slot
    const slots = ['Morning', 'Noon', 'Afternoon', 'Evening', 'Night'] as const;
    const followUpSlots = Object.fromEntries(slots.map(s => [s, { total: 0, success: 0 }])) as Record<(typeof slots)[number], { total: number; success: number }>;
    (followUps || []).forEach((f: any) => {
      const dt = new Date(f.followUpDate);
      const h = dt.getHours();
      const slot = h >= 5 && h < 11 ? 'Morning' : h >= 11 && h < 14 ? 'Noon' : h >= 14 && h < 18 ? 'Afternoon' : h >= 18 && h < 22 ? 'Evening' : 'Night';
      followUpSlots[slot].total++;
      if (f.responseReceived || (f.status && f.status !== 'SCHEDULED')) followUpSlots[slot].success++;
    });

    return {
      leadFunnel,
      pipelineVelocity,
      activityMatrix,
      companyDistribution,
      memberPerformance,
      attendancePatterns,
      dealDistribution,
      opportunityHealth,
      channelAgg,
      followUpSlots
    };
  }, [leads, opportunities, activities, companies, members, attendance]);

  // Animation variants for cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    hover: { scale: 1.02, transition: { duration: 0.2 } }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Cpu className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading advanced visualizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-screen">
      {/* Header with Apple-style design */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Brain className="h-10 w-10" />
                CRM Intelligence Dashboard
              </h1>
              <p className="text-white/90 text-lg">
                Comprehensive data visualization across all CRM modules
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => setAnimationEnabled(!animationEnabled)}
              >
                {animationEnabled ? <Eye className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {animationEnabled ? 'Animations On' : 'Animations Off'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Navigation Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* KPI Cards with Gradient Backgrounds */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover">
              <Card className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600"></div>
                <CardContent className="relative z-10 p-6 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <Badge className="bg-white/20 text-white border-0">+12.5%</Badge>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">
                    {metrics?.totals?.leads || 0}
                  </h3>
                  <p className="text-white/80 text-sm">Total Leads</p>
                  <Progress value={75} className="mt-3 h-1 bg-white/20" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover">
              <Card className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600"></div>
                <CardContent className="relative z-10 p-6 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <Badge className="bg-white/20 text-white border-0">+24.3%</Badge>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">
                    {formatCompactCurrency(metrics?.totals?.revenue || 0)}
                  </h3>
                  <p className="text-white/80 text-sm">Total Revenue</p>
                  <Progress value={85} className="mt-3 h-1 bg-white/20" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover">
              <Card className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600"></div>
                <CardContent className="relative z-10 p-6 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Target className="h-6 w-6" />
                    </div>
                    <Badge className="bg-white/20 text-white border-0">Active</Badge>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">
                    {metrics?.totals?.opportunities || 0}
                  </h3>
                  <p className="text-white/80 text-sm">Opportunities</p>
                  <Progress value={65} className="mt-3 h-1 bg-white/20" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover="hover">
              <Card className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600"></div>
                <CardContent className="relative z-10 p-6 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Users className="h-6 w-6" />
                    </div>
                    <Badge className="bg-white/20 text-white border-0">
                      {metrics?.attendance?.submitted || 0}/{metrics?.attendance?.total || 0}
                    </Badge>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">
                    {Math.round(((metrics?.attendance?.submitted || 0) / (metrics?.attendance?.total || 1)) * 100)}%
                  </h3>
                  <p className="text-white/80 text-sm">Attendance Today</p>
                  <Progress 
                    value={((metrics?.attendance?.submitted || 0) / (metrics?.attendance?.total || 1)) * 100} 
                    className="mt-3 h-1 bg-white/20" 
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Lead Funnel Visualization using Recharts */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Lead Conversion Funnel
              </CardTitle>
              <CardDescription>Track lead progression through stages.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={processedData.leadFunnel.stages.map((stage, idx) => ({
                  stage,
                  value: processedData.leadFunnel.values[idx],
                  percentage: idx > 0 && processedData.leadFunnel.values[0] > 0 ?
                    Math.round((processedData.leadFunnel.values[idx] / processedData.leadFunnel.values[0]) * 100) : 100
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="stage" tick={{ fill: '#64748b' }} />
                  <YAxis tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <RBar dataKey="value" fill={COLORS.chart.blue} radius={[8, 8, 0, 0]}>
                    {processedData.leadFunnel.values.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                    ))}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Activity Effectiveness Matrix
                </CardTitle>
                <CardDescription>Performance by activity type and effectiveness.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={Object.entries(processedData.activityMatrix).map(([type, data]: [string, any]) => ({
                      type,
                      ...data
                    }))}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fill: '#64748b' }} />
                    <YAxis dataKey="type" type="category" tick={{ fill: '#64748b' }} />
                    <Tooltip />
                    <Legend />
                    <RBar dataKey="EXCELLENT" stackId="a" fill={COLORS.chart.green} />
                    <RBar dataKey="HIGH" stackId="a" fill={COLORS.chart.blue} />
                    <RBar dataKey="MEDIUM" stackId="a" fill={COLORS.chart.orange} />
                    <RBar dataKey="LOW" stackId="a" fill={COLORS.chart.red} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  Regional Distribution
                </CardTitle>
                <CardDescription>Company presence across regions.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <Treemap
                    data={Object.values(processedData.companyDistribution).map((item: any) => ({
                      name: `${item.region} - ${item.type}`,
                      size: item.value || item.count,
                      region: item.region,
                      type: item.type
                    }))}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill={COLORS.chart.purple}
                  >
                    <Tooltip />
                  </Treemap>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6 mt-6">
          {/* Revenue Trends (actuals + forecast) */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Revenue Trends & Forecasting
              </CardTitle>
              <CardDescription>Historical performance and AI predictions.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={(() => {
                  const byMonth = analyticsData?.revenue?.byMonth || [];
                  const forecast = analyticsData?.revenue?.forecast || [];
                  const fmt = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short' });
                  const actualPoints = byMonth.slice(-12).map((d: any) => ({ month: fmt(d.period), actual: d.revenue }));
                  const forecastPoints = forecast.slice(0, 12).map((f: any, i: number) => ({ month: fmt(f.period), forecast: f.predicted }));
                  // Merge by month label
                  const map: Record<string, any> = {};
                  actualPoints.forEach((p: any) => { map[p.month] = { ...(map[p.month] || {}), month: p.month, actual: p.actual }; });
                  forecastPoints.forEach((p: any) => { map[p.month] = { ...(map[p.month] || {}), month: p.month, forecast: p.forecast }; });
                  return Object.values(map);
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b' }} />
                  <YAxis tick={{ fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <RArea type="monotone" dataKey="forecast" fill="#8884d8" stroke="#8884d8" fillOpacity={0.2} />
                  <RBar dataKey="actual" barSize={40} fill={COLORS.chart.green} />
                  <Brush dataKey="month" height={30} stroke="#8884d8" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Deal Size Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-blue-500" />
                  Deal Size Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <RPie
                      data={[
                        { name: 'Small (<$50k)', value: processedData.dealDistribution.small },
                        { name: 'Medium ($50k-$200k)', value: processedData.dealDistribution.medium },
                        { name: 'Large ($200k-$1M)', value: processedData.dealDistribution.large },
                        { name: 'Enterprise (>$1M)', value: processedData.dealDistribution.enterprise }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2, 3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                      ))}
                    </RPie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performing Sales Reps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={processedData.memberPerformance.slice(0, 6).map(member => ({
                    name: member.name.split(' ')[0],
                    deals: member.deals,
                    winRate: member.winRate,
                    avgDealSize: member.avgDealSize / 1000,
                    value: member.value / 1000
                  }))}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                    <RRadar name="Win Rate" dataKey="winRate" stroke={COLORS.chart.blue} fill={COLORS.chart.blue} fillOpacity={0.6} />
                    <RRadar name="Avg Deal Size (k USD)" dataKey="avgDealSize" stroke={COLORS.chart.green} fill={COLORS.chart.green} fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-6 mt-6">
          {/* Pipeline Velocity Analysis */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-indigo-500" />
                Pipeline Velocity Analysis
              </CardTitle>
              <CardDescription>Average time and value by stage.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={Object.entries(processedData.pipelineVelocity).map(([stage, data]: [string, any]) => ({
                  stage,
                  count: data.count,
                  value: data.value / 1000,
                  avgDays: Math.round(data.avgDays)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="stage" tick={{ fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <RBar yAxisId="left" dataKey="count" name="Count" fill={COLORS.chart.blue} />
                  <RBar yAxisId="left" dataKey="value" name="Value (k USD)" fill={COLORS.chart.green} />
                  <RLine yAxisId="right" type="monotone" dataKey="avgDays" stroke={COLORS.chart.orange} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Opportunity Health Score */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Opportunity Health Scores
                </CardTitle>
                <CardDescription>Risk assessment by probability and stage.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="10%" 
                    outerRadius="90%" 
                    data={[
                      { name: 'Critical', value: processedData.opportunityHealth.critical, fill: COLORS.chart.red },
                      { name: 'At Risk', value: processedData.opportunityHealth.atRisk, fill: COLORS.chart.orange },
                      { name: 'Fair', value: processedData.opportunityHealth.fair, fill: COLORS.chart.yellow },
                      { name: 'Good', value: processedData.opportunityHealth.good, fill: COLORS.chart.blue },
                      { name: 'Excellent', value: processedData.opportunityHealth.excellent, fill: COLORS.chart.green }
                    ]}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} fill={COLORS.chart.blue} />
                    <Legend />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Pipeline Bottlenecks
                </CardTitle>
                <CardDescription>Stages requiring attention.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(processedData.pipelineVelocity)
                  .map(([stage, s]: [string, any]) => ({ stage, risk: Math.round(s.avgDays) }))
                  .sort((a, b) => b.risk - a.risk)
                  .slice(0, 4)
                  .map(({ stage, risk }) => (
                    <div key={stage} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{stage}</span>
                        <span className="text-sm text-slate-500">{risk} days</span>
                      </div>
                      <Progress value={Math.min(100, risk)} className="h-2" />
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <AlertCircle className="h-3 w-3" />
                        {risk > 60 ? 'Immediate action required' : risk > 30 ? 'Monitor closely' : 'Healthy'}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6 mt-6">
          {/* Team Performance Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Team Performance Leaderboard
                </CardTitle>
                <CardDescription>Individual performance metrics.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processedData.memberPerformance.slice(0, 5).map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                          idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                          idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                          'bg-gradient-to-br from-blue-400 to-blue-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-slate-500">Win Rate: {member.winRate.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCompactCurrency(member.value)}</p>
                        <p className="text-sm text-slate-500">{member.won} deals won</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Attendance Overview
                </CardTitle>
                <CardDescription>Today's attendance status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Present</span>
                    <Badge className="bg-green-100 text-green-700">
                      {metrics?.attendance?.submitted || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Absent</span>
                    <Badge className="bg-red-100 text-red-700">
                      {(metrics?.attendance?.total || 0) - (metrics?.attendance?.submitted || 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Team</span>
                    <Badge className="bg-blue-100 text-blue-700">
                      {metrics?.attendance?.total || 0}
                    </Badge>
                  </div>
                  <div className="pt-4">
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <RPie
                          data={[
                            { name: 'Present', value: metrics?.attendance?.submitted || 0 },
                            { name: 'Absent', value: (metrics?.attendance?.total || 0) - (metrics?.attendance?.submitted || 0) }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill={COLORS.chart.green} />
                          <Cell fill={COLORS.chart.red} />
                        </RPie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Distribution by Team Member */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Team Activity Distribution
              </CardTitle>
              <CardDescription>Activities by type and team member.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={(teamActivity || []).map((u: any) => ({
                  name: (u.name || `User ${u.userId}`).split(' ')[0],
                  calls: u.calls || 0,
                  emails: u.emails || 0,
                  meetings: u.meetings || 0,
                  demos: u.demos || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                  <YAxis tick={{ fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <RArea type="monotone" dataKey="calls" stackId="1" stroke={COLORS.chart.blue} fill={COLORS.chart.blue} />
                  <RArea type="monotone" dataKey="emails" stackId="1" stroke={COLORS.chart.green} fill={COLORS.chart.green} />
                  <RArea type="monotone" dataKey="meetings" stackId="1" stroke={COLORS.chart.purple} fill={COLORS.chart.purple} />
                  <RArea type="monotone" dataKey="demos" stackId="1" stroke={COLORS.chart.orange} fill={COLORS.chart.orange} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6 mt-6">
          {/* Activity Timeline */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Activity Timeline & Patterns
              </CardTitle>
              <CardDescription>Communication patterns and effectiveness over time.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={(() => {
                  const days = 30;
                  const today = new Date();
                  const series: any[] = [];
                  for (let i = days - 1; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    const dayStr = `${d.getMonth() + 1}/${d.getDate()}`;
                    const dayActs = activities.filter(a => {
                      try {
                        const dateValue = a.timestamp || a.occurredAt || a.occurredAtUTC || a.createdAt;
                        if (!dateValue) return false;
                        const t = new Date(dateValue).getTime();
                        if (Number.isNaN(t)) return false;
                        const ds = new Date(d);
                        const de = new Date(d);
                        ds.setHours(0,0,0,0); de.setHours(23,59,59,999);
                        return t >= ds.getTime() && t <= de.getTime();
                      } catch (error) {
                        return false;
                      }
                    });
                    const calls = dayActs.filter(a => (a.type || '').toString().toLowerCase() === 'call').length;
                    const emails = dayActs.filter(a => (a.type || '').toString().toLowerCase() === 'email').length;
                    const meetings = dayActs.filter(a => (a.type || '').toString().toLowerCase() === 'meeting').length;
                    const effVals = dayActs.map(a => ({ LOW: 25, MEDIUM: 50, HIGH: 75, EXCELLENT: 90 } as any)[(a.effectiveness || 'MEDIUM')]);
                    const effectiveness = effVals.length ? Math.round(effVals.reduce((s, v) => s + v, 0) / effVals.length) : 0;
                    series.push({ day: dayStr, calls, emails, meetings, effectiveness });
                  }
                  return series;
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <RLine yAxisId="left" type="monotone" dataKey="calls" stroke={COLORS.chart.blue} strokeWidth={2} />
                  <RLine yAxisId="left" type="monotone" dataKey="emails" stroke={COLORS.chart.green} strokeWidth={2} />
                  <RLine yAxisId="left" type="monotone" dataKey="meetings" stroke={COLORS.chart.purple} strokeWidth={2} />
                  <RLine yAxisId="right" type="monotone" dataKey="effectiveness" stroke={COLORS.chart.orange} strokeWidth={2} strokeDasharray="5 5" />
                  <ReferenceLine yAxisId="right" y={85} stroke={COLORS.chart.red} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Communication Channels Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-500" />
                  Channel Effectiveness
                </CardTitle>
                <CardDescription>Response rates by communication channel.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(processedData.channelAgg).map(([ch, v]: [string, any]) => ({
                    channel: ch.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
                    responseRate: v.total > 0 ? Math.round((v.responded / v.total) * 100) : 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="channel" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip />
                    <Legend />
                    <RBar dataKey="responseRate" fill={COLORS.chart.green} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-500" />
                  Follow-up Effectiveness
                </CardTitle>
                <CardDescription>Success rate by follow-up timing.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={Object.entries(processedData.followUpSlots).map(([time, v]: [string, any]) => ({
                    time,
                    success: v.total > 0 ? Math.round((v.success / v.total) * 100) : 0
                  }))}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="time" tick={{ fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                    <RRadar name="Success Rate" dataKey="success" stroke={COLORS.chart.blue} fill={COLORS.chart.blue} fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6 mt-6">
          {/* AI Predictions and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Brain className="h-6 w-6" />
                  AI-Powered Predictions
                </CardTitle>
                <CardDescription className="text-white/90">
                  Machine learning insights and forecasts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-semibold">Revenue Forecast</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCompactCurrency(analyticsData?.predictions?.nextMonthRevenue || 0)}</p>
                    <p className="text-sm text-white/80 mt-1">Next month prediction</p>
                    <Badge className="mt-2 bg-white/20 text-white border-0">
                      {Math.round(((analyticsData?.revenue?.forecast?.[0]?.confidence || analyticsData?.aiInsights?.revenueAnalysis?.confidence || 0.5) * 100))}% confidence
                    </Badge>
                  </div>

                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5" />
                      <span className="font-semibold">Win Probability</span>
                    </div>
                    <p className="text-2xl font-bold">{Math.round((analyticsData?.performance?.conversionRate || 0) * 100)}%</p>
                    <p className="text-sm text-white/80 mt-1">Current pipeline</p>
                    <Badge className="mt-2 bg-white/20 text-white border-0">{analyticsData?.insights?.conversionTrend || '—'}</Badge>
                  </div>

                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">Risk Score</span>
                    </div>
                    <p className="text-2xl font-bold">{Math.round((analyticsData?.predictions?.churnRisk || 0) * 100)}</p>
                    <p className="text-sm text-white/80 mt-1">Avg churn risk</p>
                    <Badge className="mt-2 bg-white/20 text-white border-0">{(analyticsData?.predictions?.anomalyCount || 0)} anomalies</Badge>
                  </div>

                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-semibold">Lead Quality</span>
                    </div>
                    <p className="text-2xl font-bold">{analyticsData?.kpiMetrics?.leadQualityScore?.toFixed?.(1) || 0}</p>
                    <p className="text-sm text-white/80 mt-1">Lead quality score</p>
                    <Badge className="mt-2 bg-white/20 text-white border-0">Segments: {analyticsData?.kpiMetrics?.customerSegments || 0}</Badge>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Immediate Actions Required
                  </h4>
                  <ul className="space-y-2">
                    {(analyticsData?.aiInsights?.recommendations || []).slice(0, 5).map((action: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm">{typeof action === 'string' ? action : (action?.description || action?.insight || 'Recommendation')}</p>
                          <p className="text-xs text-white/70 mt-1">AI recommendation</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Strategic Insights
                </CardTitle>
                <CardDescription>Data-driven recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(analyticsData?.aiInsights?.recommendations || []).slice(0, 4).map((rec: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Insight</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round((analyticsData?.revenue?.forecast?.[0]?.confidence || analyticsData?.kpiMetrics?.predictiveAccuracy || 0.7) * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{typeof rec === 'string' ? rec : (rec?.insight || JSON.stringify(rec))}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Predictive Analytics Dashboard */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                Predictive Analytics Dashboard
              </CardTitle>
              <CardDescription>ML-powered forecasts and anomaly detection</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={(() => {
                  const byMonth = analyticsData?.revenue?.byMonth || [];
                  const forecast = analyticsData?.revenue?.forecast || [];
                  const anomalies = (analyticsData?.aiInsights?.anomalies?.anomalies || []) as Array<{ period: string }>;
                  const fmt = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short' });
                  const anomalyMonths = new Set(anomalies.map(a => fmt(a.period)));
                  const actualPoints = byMonth.slice(-12).map((d: any) => ({ month: fmt(d.period), actual: d.revenue }));
                  const forecastPoints = forecast.slice(0, 12).map((f: any) => ({ month: fmt(f.period), predicted: f.predicted, confidence: Math.round((f.confidence || 0) * 100) }));
                  const map: Record<string, any> = {};
                  actualPoints.forEach((p: { month: string; actual: number }) => { map[p.month] = { ...(map[p.month] || {}), month: p.month, actual: p.actual }; });
                  forecastPoints.forEach((p: { month: string; predicted: number; confidence: number }) => { map[p.month] = { ...(map[p.month] || {}), month: p.month, predicted: p.predicted, confidence: p.confidence }; });
                  // Mark anomalies on months we have actuals
                  Object.keys(map).forEach(m => {
                    if (anomalyMonths.has(m)) {
                      map[m].anomaly = map[m].actual || map[m].predicted || 0;
                    }
                  });
                  return Object.values(map);
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <RArea yAxisId="left" type="monotone" dataKey="predicted" fill={COLORS.chart.blue} fillOpacity={0.3} stroke={COLORS.chart.blue} />
                  <RBar yAxisId="left" dataKey="actual" fill={COLORS.chart.green} />
                  <RLine yAxisId="right" type="monotone" dataKey="confidence" stroke={COLORS.chart.purple} strokeWidth={2} />
                  <RBar yAxisId="left" dataKey="anomaly" fill={COLORS.chart.red} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl"
      >
        {[
          { icon: Users, label: 'Total Leads', value: leads.length },
          { icon: Target, label: 'Opportunities', value: opportunities.length },
          { icon: DollarSign, label: 'Pipeline Value', value: formatCompactCurrency(opportunities.reduce((sum, o) => sum + (o.dealSize || 0), 0)) },
          { icon: Activity, label: 'Activities', value: activities.length },
          { icon: Building2, label: 'Companies', value: companies.length },
          { icon: UserCheck, label: 'Team Members', value: members.length },
          { icon: Calendar, label: 'Follow-ups', value: followUps.length },
          { icon: Award, label: 'Win Rate', value: `${metrics?.conversionRate || 0}%` }
        ].map((stat, idx) => (
          <div key={idx} className="text-center">
            <stat.icon className="h-5 w-5 mx-auto mb-2 text-slate-500" />
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
