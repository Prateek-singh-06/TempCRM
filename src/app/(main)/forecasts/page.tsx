"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Target,
  TrendingUp,
  Calendar,
  Edit,

  ChevronLeft,
  ChevronRight,

  MapPin,
  Trophy,

  CheckCircle
} from "lucide-react";

// Types
interface RegionData {
  region: string;
  target: number;
  achieved: number;
  deals: string[];
}

interface MonthData {
  [month: number]: RegionData[];
}

interface YearData {
  [year: number]: MonthData;
}

// Mock data for forecasts
const mockForecastData: YearData = {
  2024: {
    1: [
      { region: "North America", target: 10, achieved: 8, deals: ["Deal 1", "Deal 2", "Deal 3"] },
      { region: "Europe", target: 8, achieved: 9, deals: ["Deal 4", "Deal 5"] },
      { region: "Asia Pacific", target: 6, achieved: 4, deals: ["Deal 6"] }
    ],
    2: [
      { region: "North America", target: 12, achieved: 5, deals: ["Deal 7", "Deal 8"] },
      { region: "Europe", target: 10, achieved: 3, deals: ["Deal 9"] },
      { region: "Asia Pacific", target: 8, achieved: 2, deals: [] }
    ],
    3: [
      { region: "North America", target: 15, achieved: 0, deals: [] },
      { region: "Europe", target: 12, achieved: 0, deals: [] },
      { region: "Asia Pacific", target: 10, achieved: 0, deals: [] }
    ]
  }
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ForecastsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [forecastData, setForecastData] = useState<YearData>(mockForecastData);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionData | null>(null);
  const [newTarget, setNewTarget] = useState("");

  const currentMonthData = forecastData[selectedYear]?.[selectedMonth] || [];
  
  // Calculate totals
  const totals = currentMonthData.reduce((acc: { target: number; achieved: number }, region: RegionData) => ({
    target: acc.target + region.target,
    achieved: acc.achieved + region.achieved
  }), { target: 0, achieved: 0 });

  // Calculate year-to-date
  const ytdData = Object.entries(forecastData[selectedYear] || {})
    .filter(([month]) => parseInt(month) <= selectedMonth)
    .reduce((acc: Record<string, { target: number; achieved: number }>, [, monthData]: [string, RegionData[]]) => {
      monthData.forEach((region: RegionData) => {
        if (!acc[region.region]) {
          acc[region.region] = { target: 0, achieved: 0 };
        }
        acc[region.region].target += region.target;
        acc[region.region].achieved += region.achieved;
      });
      return acc;
    }, {});

  const ytdTotals = Object.values(ytdData).reduce((acc: { target: number; achieved: number }, region: { target: number; achieved: number }) => ({
    target: acc.target + region.target,
    achieved: acc.achieved + region.achieved
  }), { target: 0, achieved: 0 });

  const handleEditTarget = (region: RegionData) => {
    setEditingRegion(region);
    setNewTarget(region.target.toString());
    setIsEditDialogOpen(true);
  };

  const handleSaveTarget = () => {
    if (editingRegion && newTarget) {
      const updatedData = { ...forecastData };
      const regionIndex = currentMonthData.findIndex((r: RegionData) => r.region === editingRegion.region);
      if (regionIndex !== -1) {
        updatedData[selectedYear][selectedMonth][regionIndex].target = parseInt(newTarget);
        setForecastData(updatedData);
      }
    }
    setIsEditDialogOpen(false);
    setEditingRegion(null);
    setNewTarget("");
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedMonth > 1) {
      setSelectedMonth(selectedMonth - 1);
    } else if (direction === 'next' && selectedMonth < 12) {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getPerformanceColor = (achieved: number, target: number) => {
    const percentage = (achieved / target) * 100;
    if (percentage >= 100) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    if (percentage >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getPerformanceBadge = (achieved: number, target: number) => {
    const percentage = (achieved / target) * 100;
    if (percentage >= 100) return <Badge className="bg-green-100 text-green-800">On Track</Badge>;
    if (percentage >= 75) return <Badge className="bg-yellow-100 text-yellow-800">Close</Badge>;
    if (percentage >= 50) return <Badge className="bg-orange-100 text-orange-800">Behind</Badge>;
    return <Badge className="bg-red-100 text-red-800">At Risk</Badge>;
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Sales Forecasts</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Set and track regional sales targets</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Admin Only
          </Badge>
        </div>

        {/* Month/Year Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleMonthChange('prev')}
                disabled={selectedMonth === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {months[selectedMonth - 1]} {selectedYear}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleMonthChange('next')}
                disabled={selectedMonth === 12}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Monthly Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.target} deals</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Monthly Achieved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(totals.achieved, totals.target)}`}>
                {totals.achieved} deals
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Achievement Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {totals.target > 0 ? Math.round((totals.achieved / totals.target) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                YTD Achievement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {ytdTotals.achieved}/{ytdTotals.target}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Regional Targets Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Regional Targets & Performance</CardTitle>
            <CardDescription>
              Set targets and track achievement for each region
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Achieved</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMonthData.map((region: RegionData) => (
                  <TableRow key={region.region}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {region.region}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{region.target} deals</div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-semibold ${getPerformanceColor(region.achieved, region.target)}`}>
                        {region.achieved} deals
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress 
                          value={(region.achieved / region.target) * 100} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          {Math.round((region.achieved / region.target) * 100)}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPerformanceBadge(region.achieved, region.target)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTarget(region)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Target
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Year-to-Date Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Year-to-Date Performance</CardTitle>
            <CardDescription>
              Cumulative performance from January to {months[selectedMonth - 1]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(ytdData).map(([region, data]: [string, { target: number; achieved: number }]) => (
                <div key={region} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{region}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.achieved} / {data.target} deals
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getPerformanceColor(data.achieved, data.target)}`}>
                        {data.target > 0 ? Math.round((data.achieved / data.target) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={data.target > 0 ? (data.achieved / data.target) * 100 : 0} 
                    className="h-3"
                  />
                </div>
              ))}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-lg">Total YTD</p>
                    <p className="text-sm text-muted-foreground">
                      {ytdTotals.achieved} / {ytdTotals.target} deals achieved
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${getPerformanceColor(ytdTotals.achieved, ytdTotals.target)}`}>
                      {ytdTotals.target > 0 ? Math.round((ytdTotals.achieved / ytdTotals.target) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Target Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Target</DialogTitle>
              <DialogDescription>
                Set the target for {editingRegion?.region} - {months[selectedMonth - 1]} {selectedYear}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="target">Target (Number of Deals)</Label>
                <Input
                  id="target"
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  min="0"
                  placeholder="Enter target number"
                />
              </div>
              {editingRegion && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Performance</p>
                  <p className="font-medium">
                    {editingRegion.achieved} deals achieved
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTarget} className="bg-blue-600 hover:bg-blue-700">
                Save Target
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </>
  );
}
