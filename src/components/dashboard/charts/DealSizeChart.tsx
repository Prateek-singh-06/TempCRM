"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, DollarSign } from "lucide-react";

type DealSizeData = {
  name: string;
  value: number;
  percentage?: number;
  color: string;
}[];

const COLORS = {
  'Small': '#10B981',    // Green
  'Medium': '#F59E0B',   // Amber
  'Large': '#3B82F6',    // Blue
  'Enterprise': '#8B5CF6' // Purple
};

export default function DealSizeChart() {
  const [data, setData] = useState<DealSizeData>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDeals, setTotalDeals] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch('/api/opportunities');
        if (!res.ok) {
          throw new Error('Failed to fetch opportunities data');
        }
        
        const data = await res.json();
        const opportunities = data.opportunities || [];
        
        if (opportunities.length === 0) {
          setData([]);
          setTotalDeals(0);
          return;
        }
        
        const dealSizeDistribution = opportunities.reduce((acc: any, opp: any) => {
          const size = opp.dealSize || 0;
          let category = 'Small';
          if (size >= 1000000) {
            category = 'Enterprise';
          } else if (size >= 100000) {
            category = 'Large';
          } else if (size >= 50000) {
            category = 'Medium';
          }
          
          if (!acc[category]) {
            acc[category] = { 
              name: category, 
              value: 0,
              color: COLORS[category as keyof typeof COLORS] || '#6B7280'
            };
          }
          acc[category].value++;
          return acc;
        }, {});
        
        const total = opportunities.length;
        const chartData = Object.values(dealSizeDistribution).map((item: any) => ({
          ...item,
          percentage: Math.round((item.value / total) * 100)
        }));
        
        // Sort by category order
        const categoryOrder = ['Small', 'Medium', 'Large', 'Enterprise'];
        chartData.sort((a: any, b: any) => 
          categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name)
        );
        
        setData(chartData);
        setTotalDeals(total);
      } catch (err) {
        console.error('Error fetching deal size data:', err);
        setError('Failed to load deal size data');
        setData([]);
        setTotalDeals(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">Deals: {data.value}</p>
          <p className="text-sm">{data.payload.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Deal Size Distribution
        </CardTitle>
        <CardDescription>
          {loading ? 'Loading...' : error ? 'Unable to load data' : `${totalDeals} total deals across all categories`}
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
            <p className="text-sm text-slate-500">No deal data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                dataKey="value" 
                data={data} 
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => {
                  const sizeRange = value === 'Small' ? '<$50k' : 
                    value === 'Medium' ? '$50k-$100k' : 
                    value === 'Large' ? '$100k-$1M' : 
                    value === 'Enterprise' ? '>$1M' : '';
                  return `${value} (${sizeRange})`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
