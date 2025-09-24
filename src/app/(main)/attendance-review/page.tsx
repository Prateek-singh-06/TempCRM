"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
  Calendar,
  FileText,
  MapPin,
  Camera,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  visitReport: string;
  timelineUrl?: string;
  photoUrl?: string;
  submittedAt: string;
  status: string;
  users_attendances_userIdTousers: {
    name: string;
    email: string;
    employeeCode: string;
    role: string;
  };
  reviewer?: {
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface Summary {
  SUBMITTED: number;
  APPROVED: number;
  REJECTED: number;
  AUTO_FLAGGED: number;
  AMENDED: number;
}

export default function AttendanceReviewPage() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [filteredAttendances, setFilteredAttendances] = useState<
    AttendanceRecord[]
  >([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionNotes, setActionNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendances();
  }, []);

  // Filter attendances based on active filter
  useEffect(() => {
    if (activeFilter === "ALL") {
      setFilteredAttendances(attendances);
    } else {
      setFilteredAttendances(
        attendances.filter((att) => att.status === activeFilter)
      );
    }
  }, [attendances, activeFilter]);

  const fetchAttendances = async () => {
    try {
      const response = await fetch("/api/attendance/approve");

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Failed to fetch attendances:",
          response.status,
          errorText
        );

        // If admin access is denied, show appropriate error message
        if (response.status === 403) {
          console.error(
            "Admin access denied - user does not have admin privileges"
          );
          setAccessError(
            "Admin access required to view attendance review. Please contact your administrator."
          );
          return;
        }

        setAccessError(`Failed to fetch attendance data: ${response.status}`);
        return;
      }

      const data = await response.json();
      setAttendances(data.attendances || []);
      setSummary(
        data.summary || {
          SUBMITTED: 0,
          APPROVED: 0,
          REJECTED: 0,
          AUTO_FLAGGED: 0,
          AMENDED: 0,
        }
      );
      setIsAdmin(true); // Successfully accessed admin endpoint
    } catch (error) {
      console.error("Error fetching attendances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (!isAdmin) {
      alert("Admin access required to approve/reject attendance records");
      return;
    }

    if (selectedIds.length === 0) {
      alert("Please select attendance records to process");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/attendance/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attendanceIds: selectedIds,
          action,
          notes: actionNotes,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Bulk action failed:", response.status, errorText);
        alert(
          `Error: ${
            response.status === 403
              ? "Admin access required"
              : "Failed to process attendance records"
          }`
        );
        return;
      }

      const data = await response.json();

      if (data.success) {
        alert(data.message || `${action} successful`);
        setSelectedIds([]);
        setActionNotes("");
        fetchAttendances(); // Refresh the list
      } else {
        alert(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error processing bulk action:", error);
      alert("Failed to process attendance records");
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAttendances.map((att) => att.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SUBMITTED: { variant: "secondary" as const, icon: Clock },
      APPROVED: { variant: "default" as const, icon: CheckCircle },
      REJECTED: { variant: "destructive" as const, icon: XCircle },
      AUTO_FLAGGED: { variant: "outline" as const, icon: AlertTriangle },
      AMENDED: { variant: "outline" as const, icon: FileText },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.SUBMITTED;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading attendance records...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (accessError) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 max-w-md">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
                Access Denied
              </h2>
              <p className="text-red-600 dark:text-red-400">{accessError}</p>
              <Button
                className="mt-4"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Attendance Review
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Review and approve employee attendance submissions
              </p>
            </div>
          </div>

          {/* Summary Cards - Clickable Filters */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  activeFilter === "ALL"
                    ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : ""
                }`}
                onClick={() => setActiveFilter("ALL")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-gray-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{attendances.length}</p>
                      <p className="text-sm text-muted-foreground">All</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  activeFilter === "SUBMITTED"
                    ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : ""
                }`}
                onClick={() => setActiveFilter("SUBMITTED")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.SUBMITTED || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  activeFilter === "APPROVED"
                    ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
                    : ""
                }`}
                onClick={() => setActiveFilter("APPROVED")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.APPROVED || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  activeFilter === "REJECTED"
                    ? "ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20"
                    : ""
                }`}
                onClick={() => setActiveFilter("REJECTED")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.REJECTED || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  activeFilter === "AUTO_FLAGGED"
                    ? "ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                    : ""
                }`}
                onClick={() => setActiveFilter("AUTO_FLAGGED")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.AUTO_FLAGGED || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Flagged</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  activeFilter === "AMENDED"
                    ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : ""
                }`}
                onClick={() => setActiveFilter("AMENDED")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.AMENDED || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Amended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedIds.length > 0 && isAdmin && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedIds.length} record
                    {selectedIds.length > 1 ? "s" : ""} selected
                  </span>
                  <Textarea
                    placeholder="Add review notes (optional)"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    onClick={() => handleBulkAction("approve")}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleBulkAction("reject")}
                    disabled={processing}
                    variant="destructive"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attendance Records */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>
                    {isAdmin
                      ? "Review and manage attendance submissions"
                      : "View your attendance records"}
                  </CardDescription>
                </div>
                {filteredAttendances.length > 0 && isAdmin && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        selectedIds.length === filteredAttendances.length &&
                        filteredAttendances.length > 0
                      }
                      onCheckedChange={(checked: boolean | "indeterminate") =>
                        handleSelectAll(checked === true)
                      }
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      Select All ({filteredAttendances.length} records)
                    </label>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredAttendances.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {activeFilter === "ALL"
                      ? "No attendance records to review"
                      : `No ${activeFilter
                          .toLowerCase()
                          .replace("_", " ")} records found`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAttendances.map((record) => (
                    <Card
                      key={record.id}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <Checkbox
                              checked={selectedIds.includes(record.id)}
                              onCheckedChange={(
                                checked: boolean | "indeterminate"
                              ) => handleSelectOne(record.id, checked === true)}
                            />

                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  {record.users_attendances_userIdTousers.name}
                                </span>
                                <Badge variant="outline">
                                  {
                                    record.users_attendances_userIdTousers
                                      .employeeCode
                                  }
                                </Badge>
                                {getStatusBadge(record.status)}
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(record.date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Submitted: {formatDate(record.submittedAt)}
                                </div>
                              </div>

                              <div className="text-sm">
                                <p className="font-medium mb-1">
                                  Visit Report:
                                </p>
                                <p className="text-muted-foreground">
                                  {record.visitReport}
                                </p>
                              </div>

                              <div className="flex gap-4 text-sm">
                                {record.timelineUrl && (
                                  <a
                                    href={record.timelineUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                  >
                                    <MapPin className="h-4 w-4" />
                                    Timeline
                                  </a>
                                )}
                                {record.photoUrl && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Camera className="h-4 w-4" />
                                    Photo attached
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Dialog
                            open={
                              dialogOpen && selectedRecord?.id === record.id
                            }
                            onOpenChange={setDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  Attendance Review -{" "}
                                  {record.users_attendances_userIdTousers.name}
                                </DialogTitle>
                                <DialogDescription>
                                  Review and approve/reject this attendance
                                  submission
                                </DialogDescription>
                              </DialogHeader>

                              {selectedRecord && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Employee Details
                                      </h4>
                                      <p>
                                        <strong>Name:</strong>{" "}
                                        {
                                          selectedRecord
                                            .users_attendances_userIdTousers
                                            .name
                                        }
                                      </p>
                                      <p>
                                        <strong>Email:</strong>{" "}
                                        {
                                          selectedRecord
                                            .users_attendances_userIdTousers
                                            .email
                                        }
                                      </p>
                                      <p>
                                        <strong>Employee Code:</strong>{" "}
                                        {
                                          selectedRecord
                                            .users_attendances_userIdTousers
                                            .employeeCode
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Submission Details
                                      </h4>
                                      <p>
                                        <strong>Date:</strong>{" "}
                                        {new Date(
                                          selectedRecord.date
                                        ).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </p>
                                      <p>
                                        <strong>Submitted:</strong>{" "}
                                        {formatDate(selectedRecord.submittedAt)}
                                      </p>
                                      <p>
                                        <strong>Status:</strong>{" "}
                                        {getStatusBadge(selectedRecord.status)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Location at time of submission (from GPS) */}
                                  <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-900/30">
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Location At Submission
                                    </h4>
                                    {(() => {
                                      const lat =
                                        selectedRecord.latitude ??
                                        selectedRecord.clientLat;
                                      const lng =
                                        selectedRecord.longitude ??
                                        selectedRecord.clientLng;
                                      const accuracy =
                                        selectedRecord.accuracy ??
                                        selectedRecord.clientAccuracyM;
                                      const addressParts = [
                                        selectedRecord.address,
                                        selectedRecord.city,
                                        selectedRecord.state,
                                        selectedRecord.country,
                                        selectedRecord.postalCode,
                                      ].filter(Boolean);
                                      const address = addressParts.join(", ");
                                      const ts =
                                        selectedRecord.locationTimestamp ||
                                        selectedRecord.submittedAt;
                                      if (lat && lng) {
                                        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                                        return (
                                          <div className="text-sm space-y-1">
                                            {address && (
                                              <p>
                                                <strong>Address:</strong>{" "}
                                                {address}
                                              </p>
                                            )}
                                            <p>
                                              <strong>Coordinates:</strong>{" "}
                                              {Number(lat).toFixed(6)},{" "}
                                              {Number(lng).toFixed(6)}{" "}
                                              <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline"
                                              >
                                                (Open Map)
                                              </a>
                                            </p>
                                            {accuracy && (
                                              <p>
                                                <strong>Accuracy:</strong> ±
                                                {Math.round(accuracy)} m
                                              </p>
                                            )}
                                            {selectedRecord.locationSource && (
                                              <p>
                                                <strong>Source:</strong>{" "}
                                                {selectedRecord.locationSource}
                                              </p>
                                            )}
                                            {ts && (
                                              <p>
                                                <strong>Captured:</strong>{" "}
                                                {formatDate(ts)}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      }
                                      // Fallbacks when only IP location is available
                                      if (
                                        selectedRecord.ipCity ||
                                        selectedRecord.ipCountry
                                      ) {
                                        return (
                                          <div className="text-sm">
                                            <p>
                                              <strong>Approx. Location:</strong>{" "}
                                              {[
                                                selectedRecord.ipCity,
                                                selectedRecord.ipCountry,
                                              ]
                                                .filter(Boolean)
                                                .join(", ")}
                                            </p>
                                            {ts && (
                                              <p>
                                                <strong>Captured:</strong>{" "}
                                                {formatDate(ts)}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      }
                                      return (
                                        <p className="text-sm text-muted-foreground">
                                          Location not available
                                        </p>
                                      );
                                    })()}
                                  </div>

                                  <div>
                                    <h4 className="font-medium mb-2">
                                      Visit Report
                                    </h4>
                                    <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                      {selectedRecord.visitReport}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    {selectedRecord.timelineUrl && (
                                      <div>
                                        <h4 className="font-medium mb-2">
                                          Timeline
                                        </h4>
                                        <a
                                          href={selectedRecord.timelineUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                          View Timeline
                                        </a>
                                      </div>
                                    )}

                                    {selectedRecord.photoUrl && (
                                      <div>
                                        <h4 className="font-medium mb-2">
                                          Photo
                                        </h4>
                                        <Image
                                          src={selectedRecord.photoUrl}
                                          alt="Attendance photo"
                                          width={200}
                                          height={200}
                                          className="rounded border"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  <DialogFooter>
                                    <Button
                                      onClick={() =>
                                        handleBulkAction("approve")
                                      }
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button
                                      onClick={() => handleBulkAction("reject")}
                                      variant="destructive"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </DialogFooter>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
