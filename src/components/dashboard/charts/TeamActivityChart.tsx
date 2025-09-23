"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Activity } from "lucide-react";

type TeamActivityData = {
  date: string;
  displayDate: string;
  calls: number;
  emails: number;
  meetings: number;
  total: number;
}[];

export default function TeamActivityChart() {
  const [data, setData] = useState<TeamActivityData>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalActivities, setTotalActivities] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch activities for the last 30 days
        const res = await fetch('/api/activities?days=30&limit=1000');
        if (!res.ok) {
          throw new Error('Failed to fetch activities data');
        }
        
        const payload = await res.json();
        const items = Array.isArray(payload.activities) ? payload.activities : [];
        
        if (items.length === 0) {
          setData([]);
          setTotalActivities(0);
          return;
        }
        
        // Group activities by date
        const activityByDate = items.reduce((acc: any, activity: any) => {
          const actDate = new Date(activity.timestamp || activity.occurredAt);
          const dateKey = actDate.toISOString().split('T')[0];
          
          if (!acc[dateKey]) {
            acc[dateKey] = { 
              date: dateKey,
              displayDate: actDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              calls: 0, 
              emails: 0, 
              meetings: 0,
              total: 0
            };
          }
          
          const t = (activity.type || '').toString().toLowerCase();
          if (t === 'call') acc[dateKey].calls++;
          else if (t === 'email') acc[dateKey].emails++;
          else if (t === 'meeting') acc[dateKey].meetings++;
          
          acc[dateKey].total++;
          return acc;
        }, {} as Record<string, any>);
        
        // Sort by date and take last 14 days for better visualization
        const sortedData = Object.values(activityByDate)
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-14); // Last 14 days
        
        const total = items.length;
        setData(sortedData as TeamActivityData);
        setTotalActivities(total);
      } catch (err) {
        console.error('Error fetching team activity data:', err);
        setError('Failed to load activity data');
        setData([]);
        setTotalActivities(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Team Activity
        </CardTitle>
        <CardDescription>
          {loading ? 'Loading...' : error ? 'Unable to load data' : 
           `${totalActivities} activities in the last 30 days`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-center">
            <p className="text-sm text-slate-500">No activity data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="calls" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Calls"
              />
              <Line 
                type="monotone" 
                dataKey="emails" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Emails"
              />
              <Line 
                type="monotone" 
                dataKey="meetings" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Meetings"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
