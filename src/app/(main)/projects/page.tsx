"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MapPin,
  Calendar,
  DollarSign,
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  province: string;
  ownerId: string;
  funding?: string;
  consultant?: string;
  contractor?: string;
  competitors?: string;
  sizeClass?: string;
  unitOfMeasurement?: string;
  approxMT?: number;
  status: string;
  monthOfQuote?: string;
  dateOfStartProcurement?: string;
  pic?: string;
  assignedAdminId?: string;
  createdAt: string;
  updatedAt: string;
  // Additional computed fields
  daysSinceStart?: number;
  isOverdue?: boolean;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    role: string;
    id: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    province: "",
    funding: "",
    consultant: "",
    contractor: "",
    competitors: "",
    sizeClass: "",
    unitOfMeasurement: "",
    approxMT: "",
    status: "ONGOING",
    monthOfQuote: "",
    dateOfStartProcurement: "",
    pic: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setCurrentUser({ role: userData.role || "user", id: userData.id });
    }
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (response.ok) {
        const enhancedProjects = data.projects.map((project: Project) => {
          const daysSinceStart = project.dateOfStartProcurement
            ? Math.floor(
                (new Date().getTime() -
                  new Date(project.dateOfStartProcurement).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;

          const isOverdue =
            project.status === "ONGOING" && daysSinceStart > 365; // Projects older than 1 year

          return {
            ...project,
            daysSinceStart,
            isOverdue,
          };
        });

        setProjects(enhancedProjects);
      } else {
        setError(data.error || "Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          approxMT: formData.approxMT
            ? parseFloat(formData.approxMT)
            : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setFormData({
          name: "",
          province: "",
          funding: "",
          consultant: "",
          contractor: "",
          competitors: "",
          sizeClass: "",
          unitOfMeasurement: "",
          approxMT: "",
          status: "ONGOING",
          monthOfQuote: "",
          dateOfStartProcurement: "",
          pic: "",
        });
        fetchProjects();
      } else {
        alert(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Failed to create project"
        );
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.consultant &&
        project.consultant.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    const matchesProvince =
      provinceFilter === "all" || project.province === provinceFilter;

    return matchesSearch && matchesStatus && matchesProvince;
  });

  const stats = {
    total: projects.length,
    ongoing: projects.filter((p) => p.status === "ONGOING").length,
    bidding: projects.filter((p) => p.status === "BIDDING").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    overdue: projects.filter((p) => p.isOverdue).length,
    totalValue: projects.reduce((sum, p) => sum + (p.approxMT || 0), 0),
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading projects...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={fetchProjects}>Try Again</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 mb-8 shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <FolderOpen className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">
                        Projects Management
                      </h1>
                      <Badge className="bg-red-500/20 text-white border-white/30 mt-2">
                        {stats.total} Projects
                      </Badge>
                    </div>
                  </div>
                  <p className="text-blue-100 text-lg max-w-2xl">
                    Comprehensive project lifecycle management with real-time
                    tracking and performance analytics
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() =>
                      window.open("/api/export?type=projects", "_blank")
                    }
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    📊 Export Projects
                  </Button>
                  <Dialog
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg">
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                          Add a new project to track its lifecycle and
                          performance
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Project Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="Enter project name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="province">Province *</Label>
                          <Input
                            id="province"
                            value={formData.province}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                province: e.target.value,
                              })
                            }
                            placeholder="Enter province"
                          />
                        </div>
                        <div>
                          <Label htmlFor="funding">Funding</Label>
                          <Input
                            id="funding"
                            value={formData.funding}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                funding: e.target.value,
                              })
                            }
                            placeholder="Funding source"
                          />
                        </div>
                        <div>
                          <Label htmlFor="consultant">Consultant</Label>
                          <Input
                            id="consultant"
                            value={formData.consultant}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                consultant: e.target.value,
                              })
                            }
                            placeholder="Consultant name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contractor">Contractor</Label>
                          <Input
                            id="contractor"
                            value={formData.contractor}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                contractor: e.target.value,
                              })
                            }
                            placeholder="Contractor name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="competitors">Competitors</Label>
                          <Input
                            id="competitors"
                            value={formData.competitors}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                competitors: e.target.value,
                              })
                            }
                            placeholder="List competitors"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sizeClass">Size Class</Label>
                          <Input
                            id="sizeClass"
                            value={formData.sizeClass}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sizeClass: e.target.value,
                              })
                            }
                            placeholder="Size classification"
                          />
                        </div>
                        <div>
                          <Label htmlFor="unitOfMeasurement">
                            Unit of Measurement
                          </Label>
                          <Input
                            id="unitOfMeasurement"
                            value={formData.unitOfMeasurement}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                unitOfMeasurement: e.target.value,
                              })
                            }
                            placeholder="Unit (MT, KM, etc.)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="approxMT">Approx MT</Label>
                          <Input
                            id="approxMT"
                            type="number"
                            value={formData.approxMT}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                approxMT: e.target.value,
                              })
                            }
                            placeholder="Approximate tonnage"
                          />
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) =>
                              setFormData({ ...formData, status: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ONGOING">Ongoing</SelectItem>
                              <SelectItem value="BIDDING">Bidding</SelectItem>
                              <SelectItem value="DESIGN">Design</SelectItem>
                              <SelectItem value="COMPLETED">
                                Completed
                              </SelectItem>
                              <SelectItem value="CANCELLED">
                                Cancelled
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="monthOfQuote">Month of Quote</Label>
                          <Input
                            id="monthOfQuote"
                            value={formData.monthOfQuote}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                monthOfQuote: e.target.value,
                              })
                            }
                            placeholder="Month of quotation"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dateOfStartProcurement">
                            Start Procurement Date
                          </Label>
                          <Input
                            id="dateOfStartProcurement"
                            type="date"
                            value={formData.dateOfStartProcurement}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dateOfStartProcurement: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="pic">PIC (Person In Charge)</Label>
                          <Input
                            id="pic"
                            value={formData.pic}
                            onChange={(e) =>
                              setFormData({ ...formData, pic: e.target.value })
                            }
                            placeholder="Person in charge"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleCreateProject}>
                          Create Project
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  Total Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                  {stats.total}
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Building2 className="h-4 w-4 text-green-600" />
                  </div>
                  Ongoing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                  {stats.ongoing}
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <DollarSign className="h-4 w-4 text-yellow-600" />
                  </div>
                  Bidding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                  {stats.bidding}
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-800 dark:text-purple-200">
                  {stats.completed}
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-800 dark:text-red-200">
                  {stats.overdue}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ONGOING">Ongoing</SelectItem>
                    <SelectItem value="BIDDING">Bidding</SelectItem>
                    <SelectItem value="DESIGN">Design</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={provinceFilter}
                  onValueChange={setProvinceFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    {/* Add province options dynamically */}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Projects Table */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <FolderOpen className="h-5 w-5 text-white" />
                </div>
                Project List
                <Badge variant="outline" className="ml-2">
                  {filteredProjects.length} projects
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-700">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Project Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Province
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Consultant
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Size (MT)
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                        Days Active
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow
                        key={project.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            {project.province}
                          </div>
                        </TableCell>
                        <TableCell>{project.consultant || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              project.status === "ONGOING"
                                ? "bg-green-100 text-green-800"
                                : project.status === "BIDDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : project.status === "COMPLETED"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {project.approxMT ? `${project.approxMT} MT` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{project.daysSinceStart || 0} days</span>
                            {project.isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProject(project);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(currentUser?.role === "admin" ||
                              currentUser?.role === "SuperAdmin") && (
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Project Details Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  {selectedProject?.name}
                </DialogTitle>
                <DialogDescription>
                  Detailed project information and tracking
                </DialogDescription>
              </DialogHeader>

              {selectedProject && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Project Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Province:</span>
                          <span className="font-medium">
                            {selectedProject.province}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <Badge
                            className={
                              selectedProject.status === "ONGOING"
                                ? "bg-green-100 text-green-800"
                                : selectedProject.status === "BIDDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {selectedProject.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span>
                            {selectedProject.approxMT
                              ? `${selectedProject.approxMT} MT`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">PIC:</span>
                          <span>{selectedProject.pic || "Not assigned"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Team & Partners
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Consultant:</span>
                          <span>{selectedProject.consultant || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contractor:</span>
                          <span>{selectedProject.contractor || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Funding:</span>
                          <span>{selectedProject.funding || "N/A"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Timeline</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Started:</span>
                          <span>
                            {selectedProject.dateOfStartProcurement
                              ? new Date(
                                  selectedProject.dateOfStartProcurement
                                ).toLocaleDateString()
                              : "Not started"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days Active:</span>
                          <span>
                            {selectedProject.daysSinceStart || 0} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quote Month:</span>
                          <span>{selectedProject.monthOfQuote || "N/A"}</span>
                        </div>
                        {selectedProject.isOverdue && (
                          <div className="flex justify-between">
                            <span className="text-red-600">Status:</span>
                            <Badge variant="destructive">Overdue</Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Market Intelligence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Competitors:</span>
                          <span>
                            {selectedProject.competitors || "None listed"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
