"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

type SalesByRegionData = {
  region: string;
  total: number;
}[];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function SalesByRegionChart() {
  const [data, setData] = useState<SalesByRegionData>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch('/api/companies');
        if (!res.ok) {
          throw new Error('Failed to fetch company data');
        }
        
        const data = await res.json();
        const companies = data.companies || [];
        
        if (companies.length === 0) {
          setData([]);
          return;
        }
        
        const salesByRegion = companies.reduce((acc: any, company: any) => {
          const region = company.region || 'Unknown';
          if (!acc[region]) {
            acc[region] = { region, total: 0 };
          }
          acc[region].total += company.totalValue || 0;
          return acc;
        }, {});
        
        const sortedData = Object.values(salesByRegion)
          .sort((a: any, b: any) => b.total - a.total)
          .slice(0, 10); // Top 10 regions
        
        setData(sortedData as SalesByRegionData);
      } catch (err) {
        console.error('Error fetching sales by region:', err);
        setError('Failed to load sales data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Sales by Region</CardTitle>
        <CardDescription>
          {loading ? 'Loading...' : error ? 'Unable to load data' : `Top ${data.length} regions by sales value`}
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
            <p className="text-sm text-slate-500">No sales data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis 
                dataKey="region" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Sales']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
