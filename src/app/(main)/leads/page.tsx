"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDebounce } from "use-debounce";
import PhoneInput, {
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowUpRight,
  Users,
  Building,
  Phone,
  Mail,
  Calendar,
  Loader2,
  ArrowDown,
  CalendarPlus,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

import DailyFollowUpDialog from "./_components/DailyFollowUpDialog";

// Type definitions
interface Lead {
  id: number;
  status: string;
  name: string;
  source: string;
  nextFollowUpDate?: string | null;
  companies?: { id: number; name: string; region?: string | null };
  leadScore?: number;
  qualificationStage?: string;
  engagementScore?: number;
  users?: {
    name: string;
    email: string;
    role: string;
    employeeCode: string;
  };
  createdDate: string;
  email?: string;
  phone?: string;
  note?: string;
  opportunities?: unknown[];
}
interface company {
  id: number;
  name: string;
  region?: string | null;
}
interface newLead {
  name: string;
  companyId: number | null;
  source: string;
  email: string;
  phone: string;
  note: string;
  nextFollowUpDate?: string; // YYYY-MM-DD
}

const sourceColors: Record<string, string> = {
  Referral: "bg-indigo-100 text-indigo-800",
  Web: "bg-cyan-100 text-cyan-800",
  "Cold Call": "bg-orange-100 text-orange-800",
  Event: "bg-pink-100 text-pink-800",
  Other: "bg-gray-100 text-gray-800",
};
const options: Intl.DateTimeFormatOptions = {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "2-digit",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // const [editSearchQuery, setEditSearchQuery] = useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 300); // debounce for 300ms
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const inputEditRef = useRef<HTMLDivElement | null>(null);
  const [companies, setCompanies] = useState<company[] | null>(null);
  const [overdueFollowupsByLead, setOverdueFollowupsByLead] = useState<
    Record<
      number,
      {
        actionDescription: string;
        followUpDate?: string;
        daysOverdue: number;
        assignedTo: string;
        notes?: string;
        overdueReason?: string;
      }
    >
  >({});
  const [convertForm, setConvertForm] = useState({
    name: "",
    sizeDI: "",
    quantity: 0,
    status: "",
    classification: "SMALL_BUSINESS" as
      | "SMALL_BUSINESS"
      | "ENTERPRISE"
      | "MID_MARKET"
      | null,
    dealSize: 0,
    expectedCloseDate: "",
    stage: "PROSPECTING" as
      | "PROSPECTING"
      | "QUALIFICATION"
      | "PROPOSAL"
      | "NEGOTIATION"
      | "CLOSED_WON"
      | "CLOSED_LOST"
      | string
      | null,
    probability: 25,
    nextFollowupDate: "",
    lostReason: "",
  });
  const [currentUser, setCurrentUser] = useState<{
    role: string;
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // New lead form state
  const [newLead, setNewLead] = useState<newLead>({
    name: "",
    companyId: null,
    source: "",
    email: "",
    phone: "",
    note: "",
    nextFollowUpDate: "",
  });
  const [newLeadCountry, setNewLeadCountry] = useState("US");
  const [newLeadPhoneNational, setNewLeadPhoneNational] = useState("");

  const [eventDetails, setEventDetails] = useState("");
  const [editLead, setEditLead] = useState<newLead>({
    name: "",
    companyId: null,
    source: "",
    email: "",
    phone: "",
    note: "",
    nextFollowUpDate: "",
  });
  const [editLeadCountry, setEditLeadCountry] = useState("US");
  const [editLeadPhoneNational, setEditLeadPhoneNational] = useState("");

  // Fetch leads from API
  const fetchLeads = async () => {
    try {
      console.log("🚀 Frontend: Starting fetch leads request...");
      const response = await fetch("/api/leads");

      console.log("📡 Frontend: Response status:", response.status);
      console.log("📡 Frontend: Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log(
          "✅ Frontend: Successfully received",
          data.leads?.length || 0,
          "leads"
        );
        console.log("leads", data.leads);

        // Check for duplicate IDs
        const leadIds = data.leads?.map((lead: any) => lead.id) || [];
        const uniqueIds = [...new Set(leadIds)];
        if (leadIds.length !== uniqueIds.length) {
          console.warn(
            "⚠️ Frontend: Found duplicate lead IDs:",
            leadIds.filter(
              (id: any, index: any) => leadIds.indexOf(id) !== index
            )
          );
        }

        setLeads(data.leads || []);
        fetchOverdueFollowups();
      } else {
        // Try to get error details from response
        let errorDetails = "Unknown error";
        const contentType = response.headers.get("Content-Type");

        try {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorDetails =
              errorData.error ||
              errorData.message ||
              errorData.details ||
              `HTTP ${response.status}: ${response.statusText}`;
            console.error("❌ Frontend: API Error details:", errorData);
          } else {
            // Try to get text response for non-JSON errors
            const textResponse = await response.text();
            console.error(
              "❌ Frontend: Non-JSON error response:",
              textResponse
            );
            errorDetails =
              textResponse || `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (parseError) {
          console.error(
            "❌ Frontend: Could not parse error response:",
            parseError
          );
          errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        }

        console.error("❌ Frontend: Failed to fetch leads -", errorDetails);
        toast.error(`Failed to fetch leads: ${errorDetails}`);
      }
    } catch (error) {
      console.error("❌ Frontend: Network error fetching leads:", error);
      toast.error(
        `Network error: ${
          error instanceof Error ? error.message : "Unknown network error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdueFollowups = async () => {
    try {
      const response = await fetch("/api/daily-followups?showOverdue=true");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const map: Record<
        number,
        {
          actionDescription: string;
          followUpDate?: string;
          daysOverdue: number;
          assignedTo: string;
          notes?: string;
          overdueReason?: string;
        }
      > = {};

      if (Array.isArray(data?.dailyFollowUps)) {
        data.dailyFollowUps.forEach((item: any) => {
          if (!item?.linkedLeadId) {
            return;
          }
          const leadId = parseInt(item.linkedLeadId, 10);
          if (Number.isNaN(leadId)) {
            return;
          }
          const normalizedDays = Math.max(
            1,
            item.daysOverdue ?? Math.abs(item.daysUntilFollowUp ?? 1)
          );
          const existing = map[leadId];
          if (!existing || normalizedDays >= existing.daysOverdue) {
            map[leadId] = {
              actionDescription: item.actionDescription,
              followUpDate: item.followUpDate,
              daysOverdue: normalizedDays,
              assignedTo: item.assignedTo,
              notes: item.notes,
              overdueReason: item.overdueReason,
            };
          }
        });
      }

      setOverdueFollowupsByLead(map);
    } catch (error) {
      console.error("Failed to fetch overdue follow-ups for leads", error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const data = await fetch("/api/profile");
      if (data.ok) {
        const userData = await data.json();
        setCurrentUser({
          role: userData.profile.role,
          id: userData.profile.id,
          email: userData.profile.email,
          name: userData.profile.name,
        });
      } else {
        console.error("Failed to fetch current user");
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchLeads();
    fetchOverdueFollowups();
  }, []);

  // Filter leads based on search and filters
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email &&
        lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.companies?.name &&
        lead.companies.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.users?.name &&
        lead.users.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.users?.email &&
        lead.users.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.users?.employeeCode &&
        lead.users.employeeCode
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;
    const matchesSource =
      sourceFilter === "all" || lead.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    const oldLeads = [...leads];
    if (lead.status === "qualified") {
      alert("Cannot change status of a qualified lead");
      return;
    }
    if (newStatus === "qualified") {
      // alert("Please convert to opportunity first");
      // setIsConvertDialogOpen(true);
      handleConvertToOpportunity(lead);
      return;
    }

    // Optimistic update
    setLeads(
      leads.map((leadnew) =>
        leadnew.id === lead.id ? { ...leadnew, status: newStatus } : leadnew
      )
    );

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        // Revert on failure
        setLeads(oldLeads);
        console.error("Failed to update lead status");
        alert("Failed to update lead status. Please try again.");
      }
    } catch (error) {
      // Revert on error
      setLeads(oldLeads);
      console.error("Error updating lead status:", error);
      alert("Error updating lead status. Please try again.");
    }
  };

  // Handle creating new lead
  const handleCreateLead = async () => {
    if (!newLead?.name || !newLead.companyId || !newLead.source) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the payload with event details if source is Event
      const payload = {
        ...newLead,
        ...(newLead.source === "Event" && eventDetails && { eventDetails }),
      };

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setLeads([...leads, data.lead]);
        setNewLead({
          name: "",
          companyId: null,
          source: "",
          email: "",
          phone: "",
          note: "",
          nextFollowUpDate: "",
        });
        setNewLeadCountry("US");
        setNewLeadPhoneNational("");
        setEventDetails(""); // Clear event details
        setIsAddDialogOpen(false);
        fetchLeads(); // Refresh the list
      } else {
        let errorMessage = "Failed to create lead";
        try {
          const error = await response.json();
          errorMessage =
            error.error ||
            error.message ||
            error.details ||
            "Failed to create lead";
        } catch (parseError) {
          console.error(
            "❌ Frontend: Could not parse create lead error response:",
            parseError
          );
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      alert("Failed to create lead");
    } finally {
      setIsSubmitting(false);
    }
  };
  // handle editing lead
  const handleEditLead = async (lead: Lead) => {
    setSelectedLead(lead);
    setEditLead({
      name: lead.name,
      companyId: lead.companies?.id || null,
      source: lead.source,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      note: lead.note ?? "",
      nextFollowUpDate: lead.nextFollowUpDate
        ? new Date(lead.nextFollowUpDate).toISOString().split("T")[0]
        : "",
    });

    // Parse the phone number to separate country and national parts
    if (lead.phone && lead.phone.trim() !== "") {
      try {
        const parsedPhone = parsePhoneNumber(lead.phone);
        if (parsedPhone && parsedPhone.country && parsedPhone.nationalNumber) {
          setEditLeadCountry(parsedPhone.country);
          setEditLeadPhoneNational(parsedPhone.nationalNumber);
        } else {
          // Fallback if parsing fails
          setEditLeadCountry("US");
          setEditLeadPhoneNational(lead.phone);
        }
      } catch (error) {
        console.warn("Phone parsing failed, using defaults:", lead.phone);
        setEditLeadCountry("US");
        setEditLeadPhoneNational(lead.phone);
      }
    } else {
      setEditLeadCountry("US");
      setEditLeadPhoneNational("");
    }

    // Set the company name in the search query for display
    if (lead.companies && lead.companies.name) {
      setSearchQuery(lead.companies.name);
    }
    setIsEditLeadDialogOpen(true);
  };
  const handleEditLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead?.name || !searchQuery.trim() || !editLead.source) {
      // alert("Please fill in all required fields");
      toast.info("Please fill in all required fields");
      return;
    }
    if (!selectedLead) {
      toast.info("Please select a lead to edit");
      return;
    }

    setIsSubmitting(true);
    // console.log("Editing lead:", editLead);
    try {
      const response = await fetch(`/api/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editLead: {
            ...editLead,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Lead updated successfully");
        setSelectedLead(null);
        setIsEditLeadDialogOpen(false);
        fetchLeads(); // Refresh the leads list
      } else {
        let errorMessage = "Failed to update lead";
        try {
          errorMessage =
            typeof data.error === "string"
              ? data.error
              : data.error?.message ||
                data.message ||
                data.details ||
                "Failed to update lead";
        } catch (parseError) {
          console.error(
            "❌ Frontend: Could not parse update lead error response:",
            parseError
          );
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        toast.error(errorMessage);
      }
      setIsEditLeadDialogOpen(false);
    } catch (error) {
      console.error("Error converting lead:", error);
      alert("Failed to convert lead to opportunity");
      setIsEditLeadDialogOpen(false);
    } finally {
      setIsSubmitting(false);
      setIsEditLeadDialogOpen(false);
    }
  };

  // Handle converting lead to opportunity

  const handleConvertToOpportunity = (lead: Lead) => {
    setSelectedLead(lead);
    setConvertForm({
      name: lead.name,
      sizeDI: "",
      quantity: 0,
      status: "",
      classification: "SMALL_BUSINESS" as
        | "SMALL_BUSINESS"
        | "ENTERPRISE"
        | "MID_MARKET"
        | null,
      dealSize: 0,
      expectedCloseDate: "",
      stage: "PROSPECTING",
      probability: 25,
      nextFollowupDate: "",
      lostReason: "",
    });
    setIsConvertDialogOpen(true);
  };

  const handleConvertSubmit = async () => {
    console.log("Converting lead:", convertForm);
    if (!selectedLead) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/leads/convert/${selectedLead.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...convertForm,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // alert("Lead converted to opportunity successfully!");
        toast.success("Lead converted to opportunity successfully");
        setIsConvertDialogOpen(false);
        fetchLeads(); // Refresh the leads list
      } else {
        let errorMessage = "Failed to convert lead";
        try {
          errorMessage =
            data.error ||
            data.message ||
            data.details ||
            "Failed to convert lead";
        } catch (parseError) {
          console.error(
            "❌ Frontend: Could not parse convert lead error response:",
            parseError
          );
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error converting lead:", error);
      alert("Failed to convert lead to opportunity");
    } finally {
      setIsSubmitting(false);
      setIsConvertDialogOpen(false); // Close the dialog regardless of success/failure
    }
  };
  const handleDeleteLead = async (leadId: number) => {
    try {
      if (!confirm("Are you sure you want to delete this lead?")) return;
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Lead deleted successfully");
        fetchLeads(); // Refresh the leads list
      } else {
        toast.error("Failed to delete lead");
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setCompanies(null);
      return;
    }

    const fetchCompanies = async () => {
      console.log("Fetching companies...");
      try {
        const res = await fetch(`/api/companies/search?q=${debouncedQuery}`);
        const data = await res.json();
        console.log("Fetched companies:", data.companies);
        setCompanies(data.companies);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };

    fetchCompanies();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        // If nothing is selected, clear the search term when closing
        if (!newLead.companyId) {
          setSearchQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [newLead.companyId]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputEditRef.current &&
        !inputEditRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        // If nothing is selected, clear the search term when closing
        if (!editLead.companyId) {
          setSearchQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editLead.companyId]);

  const handleCompanyChange = (id: number, name: string) => {
    if (name === "__add_master__") {
      router.push("/companies");
    } else {
      setNewLead({ ...newLead, companyId: id });
      setIsDropdownOpen(false);
      setSearchQuery(name);
    }
  };
  const handleEditCompanyChange = (id: number | null, name: string) => {
    if (name === "__add_master__") {
      router.push("/companies");
    } else {
      setEditLead({ ...editLead, companyId: id });
      setIsDropdownOpen(false);
      setSearchQuery(name);
    }
  };

  const handleOpenFollowUpDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setIsFollowUpDialogOpen(true);
  };

  const handleFollowUpCreated = () => {
    // Refresh leads or perform any other necessary actions after follow-up creation
    fetchLeads();
  };

  // Combine phone number
  const combineLeadPhone = (country: string, national: string) => {
    if (!country || !national) return "";
    const callingCode = getCountryCallingCode(country as any);
    return `+${callingCode}${national.replace(/^\+/, "").replace(/\D/g, "")}`;
  };

  // Update phone when country or national changes for new lead
  useEffect(() => {
    const fullPhone = combineLeadPhone(newLeadCountry, newLeadPhoneNational);
    setNewLead({
      ...newLead,
      phone: fullPhone,
    });
  }, [newLeadCountry, newLeadPhoneNational]);

  // Update phone when country or national changes for edit lead
  useEffect(() => {
    const fullPhone = combineLeadPhone(editLeadCountry, editLeadPhoneNational);
    setEditLead({
      ...editLead,
      phone: fullPhone,
    });
  }, [editLeadCountry, editLeadPhoneNational]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Leads
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage and track your sales leads
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new lead. All fields marked with *
                    are required.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Lead Name */}
                  <div className="grid gap-2">
                    <Label htmlFor="lead-name">Lead Name *</Label>
                    <Input
                      id="lead-name"
                      placeholder="Lead Name or Project Title"
                      value={newLead?.name}
                      onChange={(e) =>
                        setNewLead({ ...newLead, name: e.target.value })
                      }
                    />
                  </div>

                  {/* Company Select */}
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company *</Label>
                    <div className="relative" ref={inputRef}>
                      {/* Hidden input can be useful for traditional form submissions */}
                      <input
                        type="hidden"
                        name="company_id"
                        value={newLead?.companyId?.toString() || ""}
                      />

                      {/* Visible input for searching and displaying selection */}
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          placeholder={"Search company..."}
                          className="w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-4 pr-10 py-3 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                        <svg
                          className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none transition-transform ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>

                      {/* Dropdown list */}
                      {isDropdownOpen && (
                        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {companies && companies.length > 0 ? (
                          companies.map((company) => (
                            <div
                              key={company.id}
                              onClick={() =>
                                handleCompanyChange(company.id, company.name)
                              }
                              className="px-4 py-3 cursor-pointer hover:bg-blue-50 text-gray-800"
                            >
                              <div className="flex flex-col">
                                <span className="font-normal text-base">
                                  {company.name}
                                </span>
                                {company.region && (
                                  <span className="text-sm text-gray-500">
                                    {company.region}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500">
                            No companies found
                          </div>
                        )}
                          {/* "Add Master" option */}
                          {companies && companies.length === 0 && (
                            <div
                              onClick={() =>
                                handleCompanyChange(0, "__add_master__")
                              }
                              className="px-4 py-3 cursor-pointer hover:bg-green-50 text-green-700 font-medium border-t border-gray-200"
                            >
                              ➕ Add Master
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="contact@example.com"
                      value={newLead?.email}
                      onChange={(e) =>
                        setNewLead({ ...newLead, email: e.target.value })
                      }
                    />
                  </div>

                  {/* Phone */}
                  <div className="grid gap-2">
                    <div className="flex gap-1">
                      <div className="">
                        <Label htmlFor="leadPhoneCountry">Phone Country</Label>
                        <Select
                          value={newLeadCountry}
                          onValueChange={setNewLeadCountry}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCountries().map((country) => (
                              <SelectItem key={country} value={country}>
                                {country} (+{getCountryCallingCode(country)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="">
                        <Label htmlFor="leadPhoneNational">Phone Number</Label>
                        <Input
                          id="leadPhoneNational"
                          name="leadPhoneNational"
                          placeholder="1234567890"
                          value={newLeadPhoneNational}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/\D/g, '');
                            setNewLeadPhoneNational(numericValue);
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </div>

                    {/* Lead Source */}
                    <div className="">
                      <Label htmlFor="source">Lead Source *</Label>
                      <Select
                        value={newLead?.source}
                        onValueChange={(value) => {
                          setNewLead({ ...newLead, source: value });
                          // Clear event details if source changes from Event
                          if (value !== "Event") {
                            setEventDetails("");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Web">Web</SelectItem>
                          <SelectItem value="Cold Call">Cold Call</SelectItem>
                          <SelectItem value="Event">Event</SelectItem>
                          <SelectItem value="Tender">Tender</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Event Details - Only show when Event is selected */}
                  {newLead?.source === "Event" && (
                    <div className="grid gap-2">
                      <Label htmlFor="event-details">Event Details</Label>
                      <Input
                        id="event-details"
                        placeholder="e.g., Tech Conference 2025, Booth #15, Met at networking session"
                        value={eventDetails}
                        onChange={(e) => setEventDetails(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Next Follow Up Date */}
                  <div className="grid gap-2">
                    <Label htmlFor="next-follow-up-date">
                      Next Follow Up Date
                    </Label>
                    <Input
                      id="next-follow-up-date"
                      type="date"
                      value={newLead?.nextFollowUpDate || ""}
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          nextFollowUpDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Note - Optional */}
                  <div className="grid gap-2">
                    <Label htmlFor="note">Note</Label>
                    <Input
                      id="note"
                      placeholder="Optional note..."
                      value={newLead?.note}
                      onChange={(e) =>
                        setNewLead({ ...newLead, note: e.target.value })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleCreateLead}
                    disabled={
                      isSubmitting ||
                      !newLead.name ||
                      !newLead.companyId ||
                      !newLead.source
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Lead"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leads.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  New This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {
                    leads.filter(
                      (lead) =>
                        lead.createdDate >
                        new Date(
                          Date.now() - 7 * 24 * 60 * 60 * 1000
                        ).toISOString()
                    ).length
                  }
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Qualified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {leads.filter((lead) => lead.status === "qualified").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    (leads.filter((lead) => lead.status === "qualified")
                      .length /
                      leads.length) *
                      100
                  ) || 0}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search leads by name, email, company, owner, or employee code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="disqualified">Disqualified</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Web">Web</SelectItem>
                    <SelectItem value="Cold Call">Cold Call</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="Tender">Tender</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead Name</TableHead>
                    <TableHead>company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Next Follow Up Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-center">Follow Up</TableHead>
                    {(currentUser?.role === "admin" ||
                      currentUser?.role === filteredLeads[0]?.users?.role) && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          currentUser?.role === "admin" ||
                          currentUser?.role === filteredLeads[0]?.users?.role
                            ? 10
                            : 9
                        }
                        className="text-center py-8"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading leads...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          currentUser?.role === "admin" ||
                          currentUser?.role === filteredLeads[0]?.users?.role
                            ? 10
                            : 9
                        }
                        className="text-center py-8 text-muted-foreground"
                      >
                        No leads found. Create your first lead to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead, index) => {
                      const overdueDetails = overdueFollowupsByLead[lead.id];
                      const nextFollowUpDate = lead.nextFollowUpDate
                        ? new Date(lead.nextFollowUpDate)
                        : null;
                      const isOverdue = nextFollowUpDate
                        ? nextFollowUpDate < new Date()
                        : false;
                      const fallbackDays = nextFollowUpDate
                        ? Math.max(
                            1,
                            Math.ceil(
                              (Date.now() - nextFollowUpDate.getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          )
                        : 0;
                      const daysOverdue =
                        overdueDetails?.daysOverdue ?? fallbackDays;
                      return (
                        <TableRow
                          key={`${lead.id}-${index}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <Link
                                href={`/leads/${lead.id}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                prefetch={false}
                              >
                                {lead.name}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-gray-400" />
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {lead.companies?.name || "N/A"}
                                </span>
                                {lead.companies?.region && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {lead.companies.region}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-gray-400" />
                                {lead.email}
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-gray-400" />
                                {lead.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                sourceColors[lead.source] ||
                                "bg-gray-100 text-gray-800"
                              }
                            >
                              {lead.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={lead.status}
                              onValueChange={(value) =>
                                handleStatusChange(lead, value)
                              }
                            >
                              <SelectTrigger className="w-[130px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">
                                  <Badge className="bg-blue-100 text-blue-800">
                                    New
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="contacted">
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    Contacted
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="qualified">
                                  <Badge className="bg-green-100 text-green-800">
                                    Qualified
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="disqualified">
                                  <Badge className="bg-gray-100 text-gray-800">
                                    Disqualified
                                  </Badge>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{lead.users?.name || "Unknown"}</TableCell>
                          <TableCell>
                            {lead.nextFollowUpDate ? (
                              <div
                                className={`flex items-center gap-1 text-sm ${
                                  isOverdue
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {new Date(
                                  lead.nextFollowUpDate
                                ).toLocaleDateString("en-IN", options)}
                                {isOverdue && (
                                  <Tooltip
                                    content={
                                      <div className="space-y-3 text-left">
                                        <div className="space-y-1">
                                          <p className="text-sm font-semibold text-white">
                                            Follow-up overdue by {daysOverdue}{" "}
                                            day{daysOverdue > 1 ? "s" : ""}
                                          </p>
                                          {nextFollowUpDate && (
                                            <p className="text-xs text-white/80">
                                              Scheduled on{" "}
                                              {nextFollowUpDate.toLocaleDateString(
                                                "en-IN",
                                                {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                                }
                                              )}
                                            </p>
                                          )}
                                          <p className="text-xs text-white/70">
                                            Owner:{" "}
                                            {overdueDetails?.assignedTo ||
                                              lead.users?.name ||
                                              "Unassigned"}
                                          </p>
                                          <p className="text-xs text-white/70">
                                            Action:{" "}
                                            {overdueDetails?.actionDescription ||
                                              "Daily follow-up"}
                                          </p>
                                          {overdueDetails?.notes && (
                                            <p className="text-xs text-white/60">
                                              Notes: {overdueDetails.notes}
                                            </p>
                                          )}
                                          <p className="text-xs text-amber-200">
                                            {overdueDetails?.overdueReason
                                              ? `Reason logged: ${overdueDetails.overdueReason}`
                                              : "Reason not captured yet"}
                                          </p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-xs text-black bg-white hover:bg-gray-50"
                                          onClick={() =>
                                            handleOpenFollowUpDialog(lead)
                                          }
                                        >
                                          <CalendarPlus className="h-3 w-3 mr-1" />
                                          Schedule Follow-up
                                        </Button>
                                      </div>
                                    }
                                    position="top"
                                    interactive={true}
                                  >
                                    <Badge
                                      variant="destructive"
                                      className="ml-1 text-xs cursor-help"
                                    >
                                      Overdue
                                      {daysOverdue > 0
                                        ? ` (${daysOverdue}d)`
                                        : ""}
                                    </Badge>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(lead.createdDate).toLocaleDateString(
                                "en-IN",
                                options
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenFollowUpDialog(lead)}
                              className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-300 bg-white shadow-sm rounded-lg transition-all duration-200"
                              title="Add Daily Follow-up"
                            >
                              <CalendarPlus className="h-4 w-4 text-blue-500" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            {(lead.users?.email === currentUser?.email ||
                              currentUser?.role === "admin") && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/leads/${lead.id}`}
                                      className="flex items-center"
                                    >
                                      <ArrowUpRight className="mr-2 h-4 w-4 rotate-45" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleEditLead(lead)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Lead
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleConvertToOpportunity(lead)
                                    }
                                    className="text-green-600"
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Convert to Opportunity
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {currentUser?.role === "admin" && (
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDeleteLead(lead.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Lead
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Convert to Opportunity Dialog */}
          <Dialog
            open={isConvertDialogOpen}
            onOpenChange={setIsConvertDialogOpen}
          >
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Convert Lead to Opportunity</DialogTitle>
                <DialogDescription>
                  Fill in the details to convert "{selectedLead?.name}" to an
                  opportunity.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {/* Company and Opportunity Name */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="convert-opp-name">Opportunity Name</Label>
                    <Input
                      id="convert-opp-name"
                      placeholder="Lead Name or Project Title"
                      value={convertForm.name}
                      onChange={(e) =>
                        setConvertForm({
                          ...convertForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Stage / Probability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="convert-stage">Stage</Label>
                    <Select
                      value={convertForm.stage || "PROSPECTING"}
                      onValueChange={(value) =>
                        setConvertForm({
                          ...convertForm,
                          stage: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PROSPECTING">Prospecting</SelectItem>
                        <SelectItem value="QUALIFICATION">
                          Qualification
                        </SelectItem>
                        <SelectItem value="PROPOSAL">Proposal Sent</SelectItem>
                        <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                        <SelectItem value="CLOSED_WON">Closed Won</SelectItem>
                        <SelectItem value="CLOSED_LOST">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="convert-probability">Probability (%)</Label>
                    <Input
                      id="convert-probability"
                      type="number"
                      placeholder="30"
                      min="0"
                      max="100"
                      value={convertForm.probability}
                      onChange={(e) =>
                        setConvertForm({
                          ...convertForm,
                          probability: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {/* Deal Size */}
                <div className="grid gap-2">
                  <Label htmlFor="convert-deal-size">Deal Size ($)</Label>
                  <Input
                    id="convert-deal-size"
                    type="number"
                    placeholder="500000"
                    min="0"
                    step="0.01"
                    value={convertForm.dealSize}
                    onChange={(e) =>
                      setConvertForm({
                        ...convertForm,
                        dealSize: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                {/* Next Follow-up / Expected Close */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="convert-next-followup">
                      Next Follow-up Date
                    </Label>
                    <Input
                      id="convert-next-followup"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={convertForm.nextFollowupDate}
                      onChange={(e) =>
                        setConvertForm({
                          ...convertForm,
                          nextFollowupDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="convert-expected-close">
                      Expected Close Date
                    </Label>
                    <Input
                      id="convert-expected-close"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={convertForm.expectedCloseDate}
                      onChange={(e) =>
                        setConvertForm({
                          ...convertForm,
                          expectedCloseDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Size DI / Quantity / Classification */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="convert-size-di">Size DI</Label>
                    <Input
                      id="convert-size-di"
                      placeholder="e.g., DN700; DN600"
                      value={convertForm.sizeDI}
                      onChange={(e) =>
                        setConvertForm({
                          ...convertForm,
                          sizeDI: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="convert-quantity">Quantity (MT)</Label>
                    <Input
                      id="convert-quantity"
                      type="number"
                      placeholder="2000"
                      value={convertForm.quantity}
                      onChange={(e) =>
                        setConvertForm({
                          ...convertForm,
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="convert-classification">
                      Classification
                    </Label>
                    <Select
                      value={convertForm.classification || ""}
                      onValueChange={(value) =>
                        setConvertForm({
                          ...convertForm,
                          classification: value as
                            | "SMALL_BUSINESS"
                            | "ENTERPRISE"
                            | "MID_MARKET"
                            | null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMALL_BUSINESS">
                          Small Business
                        </SelectItem>
                        <SelectItem value="MID_MARKET">Mid Market</SelectItem>
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status */}
                <div className="grid gap-2">
                  <Label htmlFor="convert-status">Status</Label>
                  <Input
                    id="convert-status"
                    placeholder="e.g., Bidding will be on September 2025"
                    value={convertForm.status}
                    onChange={(e) =>
                      setConvertForm({
                        ...convertForm,
                        status: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Lost Reason (only show if stage is CLOSED_LOST) */}
                {convertForm.stage === "CLOSED_LOST" && (
                  <div className="grid gap-2">
                    <Label htmlFor="convert-lost-reason">Lost Reason</Label>
                    <Input
                      id="convert-lost-reason"
                      placeholder="Reason for losing the deal"
                      value={convertForm.lostReason}
                      onChange={(e) =>
                        setConvertForm({
                          ...convertForm,
                          lostReason: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsConvertDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleConvertSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    "Convert to Opportunity"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Edit Lead Dialog */}
          <Dialog
            open={isEditLeadDialogOpen}
            onOpenChange={setIsEditLeadDialogOpen}
          >
            {/* <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Lead
                </Button>
              </DialogTrigger> */}
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Edit Lead</DialogTitle>
                <DialogDescription>
                  Enter the details to edit the lead.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Lead Name */}
                <div className="grid gap-2">
                  <Label htmlFor="lead-name">Lead Name *</Label>
                  <Input
                    id="lead-name"
                    placeholder="e.g., Enterprise Software Deal"
                    value={editLead?.name}
                    onChange={(e) =>
                      setEditLead({ ...editLead, name: e.target.value })
                    }
                  />
                </div>

                {/* Company Select */}
                <div className="grid gap-2">
                  <Label htmlFor="company">Company *</Label>
                  <div className="relative" ref={inputEditRef}>
                    {/* Hidden input can be useful for traditional form submissions */}
                    <input
                      type="hidden"
                      name="company_id"
                      value={editLead?.companyId?.toString() || ""}
                    />

                    {/* Visible input for searching and displaying selection */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        placeholder={"Search company..."}
                        className="w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-4 pr-10 py-3 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                      <svg
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none transition-transform ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>

                    {/* Dropdown list */}
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {companies && companies.length > 0 ? (
                          companies.map((company) => (
                            <div
                              key={company.id}
                              onClick={() =>
                                handleEditCompanyChange(
                                  company.id,
                                  company.name
                                )
                              }
                              className="px-4 py-3 cursor-pointer hover:bg-blue-50 text-gray-800"
                            >
                              <div className="flex flex-col">
                                <span className="font-normal text-base">
                                  {company.name}
                                </span>
                                {company.region && (
                                  <span className="text-sm text-gray-500">
                                    {company.region}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500">
                            No companies found
                          </div>
                        )}
                        {/* "Add Master" option */}
                        {companies && companies.length === 0 && (
                          <div
                            onClick={() =>
                              handleEditCompanyChange(0, "__add_master__")
                            }
                            className="px-4 py-3 cursor-pointer hover:bg-green-50 text-green-700 font-medium border-t border-gray-200"
                          >
                            ➕ Add Master
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@example.com"
                    value={editLead?.email}
                    onChange={(e) =>
                      setEditLead({ ...editLead, email: e.target.value })
                    }
                  />
                </div>

                {/* Phone */}
                <div className="flex gap-1">
                  <div className="grid gap-1">
                    <Label htmlFor="editLeadPhoneCountry">Phone Country</Label>
                    <Select
                      value={editLeadCountry}
                      onValueChange={setEditLeadCountry}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCountries().map((country) => (
                          <SelectItem key={country} value={country}>
                            {country} (+{getCountryCallingCode(country)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="editLeadPhoneNational">Phone Number</Label>
                    <Input
                      id="editLeadPhoneNational"
                      name="editLeadPhoneNational"
                      placeholder="1234567890"
                      value={editLeadPhoneNational}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, '');
                        setEditLeadPhoneNational(numericValue);
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                </div>

                {/* Lead Source */}
                <div className="grid gap-2">
                  <Label htmlFor="source">Lead Source *</Label>
                  <Select
                    value={editLead?.source}
                    onValueChange={(value) =>
                      setEditLead({ ...editLead, source: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Web">Web</SelectItem>
                      <SelectItem value="Cold Call">Cold Call</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="Tender">Tender</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Note - Optional */}
                <div className="grid gap-2">
                  <Label htmlFor="note">Note</Label>
                  <Input
                    id="note"
                    placeholder="Optional note..."
                    value={editLead?.note}
                    onChange={(e) =>
                      setEditLead({ ...editLead, note: e.target.value })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditLeadDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleEditLeadSubmit}
                  disabled={
                    isSubmitting ||
                    !editLead.name ||
                    !searchQuery.trim() ||
                    !editLead.source ||
                    !selectedLead?.id
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Editing...
                    </>
                  ) : (
                    "Edit Lead"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Daily Follow Up Dialog */}
          <DailyFollowUpDialog
            isOpen={isFollowUpDialogOpen}
            onClose={() => setIsFollowUpDialogOpen(false)}
            lead={selectedLead}
            onFollowUpCreated={handleFollowUpCreated}
          />
        </div>
      </div>
    </>
  );
}
