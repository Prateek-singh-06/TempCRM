"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Edit,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Clock,
  Calendar,
  AlertCircle,
  Briefcase,
  LayoutGrid,
  List,
  MoreHorizontal,
  ArrowUpRight,
  Trash2,
  CheckCircle,
  CalendarPlus,
  Loader2,
  FileText,
  Info,
  Upload,
  MessageSquare,
  Building,
  Users,
  Lock,
} from "lucide-react";

import DailyFollowUpDialog from "./_components/DailyFollowUpDialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";
// Types
interface Opportunity {
  id: number;
  name: string;
  sizeDI: string;
  quantity: number;
  status: string;
  classification: "SMALL_BUSINESS" | "ENTERPRISE" | "MID_MARKET" | null; // extend if needed
  companies: {
    id: number;
    name: string;
  };
  companyId: number | null;
  createdDate: string; // ISO date string
  updatedAt: string; // ISO date string
  dealSize: number;
  expectedCloseDate: string; // ISO date string
  leadId: number;
  lead: {
    id: number;
    name: string;
    email: string;
  };
  ownerId: number;
  users: {
    name: string;
    email: string;
  };
  stage:
    | "PROSPECTING"
    | "QUALIFICATION"
    | "PROPOSAL"
    | "NEGOTIATION"
    | "CLOSED_WON"
    | "CLOSED_LOST"
    | string
    | null; // add more stages if needed | null
  probability: number; // percentage
  nextFollowupDate: string; // ISO date string
  lostReason: string | null;
  wonDate?: string;
  note?: string;
  isFrozen?: boolean;
  frozenReason?: string;
  pending_quotations?: Array<{
    id: string;
    status: string;
    quotationDocument: string;
    totalQty: string;
    orderValue: number;
  }>;
}
interface company {
  id: number;
  name: string;
}
interface AddOpportunity {
  name: string;
  sizeDI: string;
  quantity: number;
  status: string;
  classification:
    | "SMALL_BUSINESS"
    | "ENTERPRISE"
    | "MID_MARKET"
    | string
    | null; // extend if needed
  companyId: number | null;
  // company: string | null;
  // companyId: number | null;
  dealSize: number;
  expectedCloseDate: string; // ISO date string
  stage:
    | "PROSPECTING"
    | "QUALIFICATION"
    | "PROPOSAL"
    | "NEGOTIATION"
    | "CLOSED_WON"
    | "CLOSED_LOST"
    | string
    | null; // add more stages if needed | null
  probability: number; // percentage
  nextFollowupDate: string; // ISO date string
  lostReason: string | null;
  wonDate?: string;
}

interface Stage {
  name: string;
  color: string;
}
const options: Intl.DateTimeFormatOptions = {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "2-digit",
};

const stages: Stage[] = [
  { name: "PROSPECTING", color: "bg-blue-500" },
  { name: "QUALIFICATION", color: "bg-indigo-500" },
  { name: "PROPOSAL", color: "bg-purple-500" },
  { name: "NEGOTIATION", color: "bg-pink-500" },
  { name: "CLOSED_WON", color: "bg-green-500" },
  { name: "CLOSED_LOST", color: "bg-red-500" },
];

const stageColors: Record<string, string> = {
  PROSPECTING: "bg-blue-100 text-blue-800",
  QUALIFICATION: "bg-indigo-100 text-indigo-800",
  PROPOSAL: "bg-purple-100 text-purple-800",
  NEGOTIATION: "bg-pink-100 text-pink-800",
  CLOSED_WON: "bg-green-100 text-green-800",
  CLOSED_LOST: "bg-red-100 text-red-800",
};

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [addOpportunities, setAddOpportunities] = useState<AddOpportunity>(
    {} as AddOpportunity
  );
  const [editOpportunity, setEditOpportunity] = useState<AddOpportunity>(
    {} as AddOpportunity
  );
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);

  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditOpportunityDialogOpen, setIsEditOpportunityDialogOpen] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosedWonDialogOpen, setIsClosedWonDialogOpen] = useState(false);
  const [pendingClosedWonOpportunity, setPendingClosedWonOpportunity] = useState<Opportunity | null>(null);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const[selectedOpportunityForFollowUp, setSelectedOpportunityForFollowUp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(false);
  const [closedWonForm, setClosedWonForm] = useState({
    wonDate: "",
    finalDealSize: "",
    notes: "",
    wonReason: "",
    nextSteps: "",
    // Pipeline fields
    customerName: "",
    class: "",
    diameter: "",
    nr: "",
    orderValueInCr: "",
    qtyInMt: "",
    specification: "",
    challenges: "",
    expectedOrderBookDate: ""
  });
  const [companies, setCompanies] = useState<company[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // const [editSearchQuery, setEditSearchQuery] = useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 300); // debounce for 300ms
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const inputEditRef = useRef<HTMLDivElement | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    role: string;
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string>("");
  const [editDateValidationError, setEditDateValidationError] = useState<string>("");
  const [editingStatus, setEditingStatus] = useState<{ oppId: number; status: string } | null>(null);
  const [statusInputValue, setStatusInputValue] = useState("");
  const [overdueFollowupsByOpportunity, setOverdueFollowupsByOpportunity] = useState<Record<number, {
    actionDescription: string;
    followUpDate?: string;
    daysOverdue: number;
    assignedTo: string;
    notes?: string;
    overdueReason?: string;
  }>>({});
  const router = useRouter();

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  // Date validation functions
  const validateDates = (nextFollowupDate: string, expectedCloseDate: string) => {
    if (!nextFollowupDate || !expectedCloseDate) return "";

    const nextDate = new Date(nextFollowupDate);
    const expectedDate = new Date(expectedCloseDate);

    if (nextDate >= expectedDate) {
      return "Next follow-up date must be before expected close date";
    }

    return "";
  };

  const handleNextFollowupDateChange = (value: string, isEdit: boolean = false) => {
    const setter = isEdit ? setEditOpportunity : setAddOpportunities;
    const errorSetter = isEdit ? setEditDateValidationError : setDateValidationError;
    const currentData = isEdit ? editOpportunity : addOpportunities;

    setter({
      ...currentData,
      nextFollowupDate: value,
    });

    if (value && currentData.expectedCloseDate) {
      const error = validateDates(value, currentData.expectedCloseDate);
      errorSetter(error);
    } else {
      errorSetter("");
    }
  };

  const handleExpectedCloseDateChange = (value: string, isEdit: boolean = false) => {
    const setter = isEdit ? setEditOpportunity : setAddOpportunities;
    const errorSetter = isEdit ? setEditDateValidationError : setDateValidationError;
    const currentData = isEdit ? editOpportunity : addOpportunities;

    setter({
      ...currentData,
      expectedCloseDate: value,
    });

    if (currentData.nextFollowupDate && value) {
      const error = validateDates(currentData.nextFollowupDate, value);
      errorSetter(error);
    } else {
      errorSetter("");
    }
  };

  const fetchOpportunities = async (retryCount = 0) => {
    const maxRetries = 3;
    setLoading(true);
    try {
      console.log(
        `Fetching opportunities (attempt ${retryCount + 1}/${
          maxRetries + 1
        })...`
      );
      const response = await fetch("/api/opportunities", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities || []);
        fetchOverdueFollowups();
        setLoading(false);
        console.log(
          `Successfully fetched ${
            data.opportunities?.length || 0
          } opportunities`
        );
        return true;
      } else {
        console.error(
          `Failed to fetch opportunities: ${response.status} ${response.statusText}`
        );

        // Handle specific error codes
        if (response.status === 401) {
          console.error("Authentication failed - redirecting to login");
          toast.error("Session expired. Please log in again.");
          // You might want to redirect to login page here
          return false;
        } else if (response.status === 403) {
          console.error("Access denied");
          toast.error("Access denied. Please contact your administrator.");
          return false;
        } else if (response.status >= 500) {
          console.error("Server error - might be temporary");
          toast.error("Server error. Please try again later.");
        } else {
          toast.error("Failed to fetch opportunities");
        }

        return false;
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);

      // Handle specific error types
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("Network error - check internet connection");
        toast.error("Network error. Please check your connection.");
      } else if (error instanceof Error && error.name === "AbortError") {
        console.error("Request timeout");
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error("Error fetching opportunities");
      }

      // Implement retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        setTimeout(() => {
          fetchOpportunities(retryCount + 1);
        }, delay);
        return true; // Indicate that retry is in progress
      }

      return false;
    } finally {
      // Only set loading to false if we're not retrying
      if (retryCount >= maxRetries) {
        setLoading(false);
      }
    }
  };
  const fetchCurrentUser = async (retryCount = 0) => {
    const maxRetries = 3;
    try {
      console.log(
        `Fetching current user (attempt ${retryCount + 1}/${maxRetries + 1})...`
      );
      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser({
          role: userData.profile.role,
          id: userData.profile.id,
          email: userData.profile.email,
          name: userData.profile.name,
        });
        console.log(
          "Successfully fetched current user:",
          userData.profile.name
        );
        return true;
      } else {
        console.error(
          `Failed to fetch current user: ${response.status} ${response.statusText}`
        );

        // Handle specific error codes
        if (response.status === 401) {
          console.error("Authentication failed for profile fetch");
          toast.error("Session expired. Please log in again.");
          return false;
        } else if (response.status === 403) {
          console.error("Access denied for profile fetch");
          toast.error("Access denied. Please contact your administrator.");
          return false;
        } else {
          toast.error("Failed to fetch user profile");
        }

        return false;
      }
    } catch (error) {
      console.error("Error fetching current user:", error);

      // Handle specific error types
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("Network error - check internet connection");
        toast.error("Network error. Please check your connection.");
      } else if (error instanceof Error && error.name === "AbortError") {
        console.error("Profile request timeout");
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error("Error fetching user profile");
      }

      // Implement retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying profile fetch in ${delay}ms...`);
        setTimeout(() => {
          fetchCurrentUser(retryCount + 1);
        }, delay);
        return true; // Indicate that retry is in progress
      }

      return false;
    }
  };

  const fetchOverdueFollowups = async () => {
    try {
      const response = await fetch('/api/daily-followups?showOverdue=true');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const map: Record<number, {
        actionDescription: string;
        followUpDate?: string;
        daysOverdue: number;
        assignedTo: string;
        notes?: string;
        overdueReason?: string;
      }> = {};

      if (Array.isArray(data?.dailyFollowUps)) {
        data.dailyFollowUps.forEach((item: any) => {
          if (!item?.linkedOpportunityId) {
            return;
          }
          const oppId = parseInt(item.linkedOpportunityId, 10);
          if (Number.isNaN(oppId)) {
            return;
          }
          const existing = map[oppId];
          const normalizedDays = Math.max(1, item.daysOverdue ?? Math.abs(item.daysUntilFollowUp ?? 1));
          if (!existing || normalizedDays >= existing.daysOverdue) {
            map[oppId] = {
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

      setOverdueFollowupsByOpportunity(map);
    } catch (error) {
      console.error('Failed to fetch overdue follow-ups for opportunities', error);
    }
  };
  useEffect(() => {
    fetchCurrentUser();
    fetchOpportunities();
    fetchOverdueFollowups();
  }, []);

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage =
      stageFilter === "all" || opp?.stage?.toUpperCase() === stageFilter;

    return matchesSearch && matchesStage;
  });
  // console.log("Filtered Opportunities:", filteredOpportunities);

  // Group opportunities by stage for Kanban view
  const opportunitiesByStage = stages.reduce(
    (acc: Record<string, Opportunity[]>, stage: Stage) => {
      acc[stage.name] = filteredOpportunities.filter(
        (opp: Opportunity) => opp?.stage?.toUpperCase() === stage.name
      );
      return acc;
    },
    {} as Record<string, Opportunity[]>
  );

  // Handle stage changes with special logic for CLOSED_WON
  const handleStageChange = async (oppId: number, newStage: string | null, currentStage: string | null) => {
    const newStageUpper = newStage?.toUpperCase() || null;
    if (newStageUpper === currentStage) return; // No change
    if (!newStageUpper) return; // Invalid stage

    // Check if opportunity is frozen
    const opportunity = opportunities.find(opp => opp.id === oppId);
    if (opportunity?.isFrozen) {
      toast.error("Cannot change stage for frozen opportunity. Please complete the pending quotation first.");
      return;
    }

    if(currentStage==="CLOSED_WON") {
      toast.error("Cannot change stage from CLOSED_WON to another stage");
      return;
    }
    // If changing to CLOSED_WON, show dialog first
    if (newStageUpper === "CLOSED_WON") {
      const opportunity = opportunities.find(opp => opp.id === oppId);
      if (opportunity) {
        
        setPendingClosedWonOpportunity(opportunity);
        setClosedWonForm({
          wonDate: new Date().toISOString().split('T')[0], // Today
          finalDealSize: opportunity.dealSize.toString(),
          notes: "",
          wonReason: "",
          nextSteps: "",
          customerName: opportunity.companies?.name || "", // Add customerName from opportunity
          class: "",
          diameter: opportunity.sizeDI || "", // Auto-populate with sizeDI from opportunity
          nr: "",
          orderValueInCr: "",
          qtyInMt: "",
          specification: "",
          challenges: "",
          expectedOrderBookDate: ""
        });
        setIsClosedWonDialogOpen(true);
        return;
      }
    }
    
    // If changing to PROPOSAL stage, show dialog
    if (newStageUpper === "PROPOSAL") {
      const opportunity = opportunities.find(opp => opp.id === oppId);
      if (opportunity) {
        setPendingProposalOpportunity(opportunity);
        setProposalForm({
          quotationNo: `SQ ${new Date().getFullYear()}-${String(opportunity.id).padStart(4, '0')}`,
          totalQty: opportunity.quantity?.toString() || "",
          totalAmount: opportunity.dealSize?.toString() || "",
          notes: "",
          quotationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
          contactPerson: "",
          contactEmail: "",
          quotationFile: null,
          stage: "PENDING"
        });
        setIsProposalDialogOpen(true);
        return;
      }
    }

    // For other stage changes, proceed normally
    setOpportunities(
      opportunities.map((opp: Opportunity) =>
        opp.id === oppId
          ? { ...opp, stage: newStageUpper }
          : opp
      )
    );

    try {
      const updatedOpp = await fetch(`/api/opportunities/${oppId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage: newStageUpper,
        }),
      });
      if (updatedOpp.ok) {
        toast.success("Opportunity updated successfully");
      } else {
        toast.error("Failed to update opportunity");
      }
      fetchOpportunities();
    } catch (error) {
      console.error("Error updating opportunity:", error);
      toast.error("Failed to update opportunity");
    }
  };

  // Handle CLOSED_WON dialog submission
  const handleClosedWonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingClosedWonOpportunity) return;

    // Validate required fields before submission
    const requiredFields = [
      { name: 'wonDate', label: 'Won Date', value: closedWonForm.wonDate },
      { name: 'finalDealSize', label: 'Final Deal Size', value: closedWonForm.finalDealSize },
      { name: 'class', label: 'Deal Class', value: closedWonForm.class },
      { name: 'diameter', label: 'Diameter', value: closedWonForm.diameter || pendingClosedWonOpportunity?.sizeDI },
      { name: 'orderValueInCr', label: 'Order Value', value: closedWonForm.orderValueInCr },
      { name: 'qtyInMt', label: 'Quantity', value: closedWonForm.qtyInMt },
      { name: 'specification', label: 'Specification', value: closedWonForm.specification },
      { name: 'challenges', label: 'Challenges', value: closedWonForm.challenges },
      { name: 'expectedOrderBookDate', label: 'Expected Order Book Date', value: closedWonForm.expectedOrderBookDate }
    ];

    const missingFields = requiredFields.filter(field => !field.value || field.value.toString().trim() === '');

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    let createdPipelineId: number | null = null;

    try {
      // Step 1: Create pipeline first
      const pipelineResponse = await fetch("/api/pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opportunityId: pendingClosedWonOpportunity.id,
          companyId: pendingClosedWonOpportunity.companyId,
          name: `${pendingClosedWonOpportunity.name} - Pipeline`,
          status: "ORDER_RECEIVED",
          orderValue: parseFloat(closedWonForm.finalDealSize) * 10000000, // Convert crores to dollars
          quantity: pendingClosedWonOpportunity.quantity,
          diameter: pendingClosedWonOpportunity.sizeDI,
          orderDate: closedWonForm.wonDate,
          notes: `Pipeline created from won opportunity. ${closedWonForm.wonReason ? `Win Reason: ${closedWonForm.wonReason}` : ''} ${closedWonForm.notes ? `Notes: ${closedWonForm.notes}` : ''}`.trim(),
          wonDate: closedWonForm.wonDate ? new Date(closedWonForm.wonDate).toISOString() : null,
          // Pipeline fields (customerName will be taken from opportunity's company)
          class: closedWonForm.class,
          nr: closedWonForm.nr,
          orderValueInCr: closedWonForm.orderValueInCr,
          qtyInMt: closedWonForm.qtyInMt,
          specification: closedWonForm.specification,
          challenges: closedWonForm.challenges,
          expectedOrderBookDate: closedWonForm.expectedOrderBookDate,
          // Additional fields
          wonReason: closedWonForm.wonReason,
          nextSteps: closedWonForm.nextSteps
        }),
      });

      if (!pipelineResponse.ok) {
        const errorData = await pipelineResponse.json();
        throw new Error(`Failed to create pipeline: ${errorData.error || 'Unknown error'}`);
      }

      const pipelineData = await pipelineResponse.json();
      createdPipelineId = pipelineData.pipeline.id;
      console.log("Pipeline created successfully:", createdPipelineId);

      // Step 2: Update opportunity stage if pipeline creation was successful
      const opportunityResponse = await fetch(`/api/opportunities/${pendingClosedWonOpportunity.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage: "CLOSED_WON",
          dealSize: parseFloat(closedWonForm.finalDealSize),
        }),
      });

      if (opportunityResponse.ok) {
        // Success: Both pipeline and opportunity update succeeded
        toast.success("Opportunity successfully closed as won!");
        setIsClosedWonDialogOpen(false);
        setPendingClosedWonOpportunity(null);
        fetchOpportunities(); // Refresh the list
      } else {
        // Opportunity update failed - delete the pipeline we just created
        console.error("Opportunity update failed, deleting pipeline...");
        if (createdPipelineId) {
          try {
            const deleteResponse = await fetch(`/api/pipeline/${createdPipelineId}`, {
              method: "DELETE",
            });
            if (deleteResponse.ok) {
              console.log("Pipeline deleted due to opportunity update failure");
            } else {
              console.error("Failed to delete pipeline:", await deleteResponse.text());
            }
          } catch (deleteError) {
            console.error("Failed to delete pipeline:", deleteError);
          }
        }
        throw new Error("Failed to update opportunity stage");
      }
    } catch (error) {
      console.error("Error in handleClosedWonSubmit:", error);

      // Reset form state on error
      setClosedWonForm({
        wonDate: "",
        finalDealSize: "",
        notes: "",
        wonReason: "",
        nextSteps: "",
        customerName: "",
        class: "",
        diameter: "",
        nr: "",
        orderValueInCr: "",
        qtyInMt: "",
        specification: "",
        challenges: "",
        expectedOrderBookDate: ""
      });

      toast.error(error instanceof Error ? error.message : "Failed to close opportunity as won");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add handleProposalSubmit function after handleClosedWonSubmit
  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingProposalOpportunity) return;

    // Validate required fields
    const requiredFields = [
      { name: 'quotationNo', label: 'Quotation No', value: proposalForm.quotationNo },
      { name: 'totalQty', label: 'Total Quantity', value: proposalForm.totalQty },
      { name: 'totalAmount', label: 'Total Amount', value: proposalForm.totalAmount }
    ];

    const missingFields = requiredFields.filter(field => !field.value || field.value.toString().trim() === '');

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      let quotationDocumentUrl = "";

      // Step 1: Upload file if provided
      if (proposalForm.quotationFile) {
        const formData = new FormData();
        formData.append('file', proposalForm.quotationFile);
        formData.append('type', 'quotation');

        const uploadResponse = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          console.log("File upload response:", uploadData);
          quotationDocumentUrl = uploadData.url;
        } else {
          console.warn("File upload failed, proceeding without document");
          toast.error("File upload failed. Please try again.");
          return;
        }
      }

      // Step 2: Create pending quotation
      const quotationResponse = await fetch("/api/pending-quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectOrClientName: pendingProposalOpportunity.companies?.name || pendingProposalOpportunity.name,
          quotationPendingSince: new Date().toISOString().split('T')[0],
          quotationDeadline: proposalForm.quotationDeadline,
          orderValue: parseFloat(proposalForm.totalAmount),
          contactPerson: proposalForm.contactPerson,
          contactEmail: proposalForm.contactEmail,
          status: proposalForm.stage,
          quotationDocument: quotationDocumentUrl,
          notes: `Quotation ${proposalForm.quotationNo} created from opportunity: ${pendingProposalOpportunity.name}. ${proposalForm.notes || ''}`,
          opportunityId: pendingProposalOpportunity.id,
          companyId: pendingProposalOpportunity.companyId,
          totalQty: proposalForm.totalQty
        }),
      });

      if (!quotationResponse.ok) {
        const errorData = await quotationResponse.json();
        throw new Error(`Failed to create pending quotation: ${errorData.error || 'Unknown error'}`);
      }

      const quotationData = await quotationResponse.json();
      console.log("Pending quotation created successfully:", quotationData.quotation.id);

      // Step 3: Update opportunity stage and freeze it
      const opportunityResponse = await fetch(`/api/opportunities/${pendingProposalOpportunity.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage: "PROPOSAL",
          isFrozen: true,
          frozenReason: "Pending quotation in progress"
        }),
      });

      if (!opportunityResponse.ok) {
        throw new Error("Failed to update opportunity stage");
      }

      // Update local state
      setOpportunities(
        opportunities.map((opp: Opportunity) =>
          opp.id === pendingProposalOpportunity.id
            ? { ...opp, stage: "PROPOSAL", isFrozen: true }
            : opp
        )
      );

      toast.success("Proposal created and quotation added to pending quotations. Opportunity is now frozen until quotation is completed.");
      setIsProposalDialogOpen(false);
      setPendingProposalOpportunity(null);
      setProposalForm({
        quotationNo: "",
        totalQty: "",
        totalAmount: "",
        notes: "",
        quotationDeadline: "",
        contactPerson: "",
        contactEmail: "",
        quotationFile: null,
        stage: "PENDING"
      });
      
      // Refresh data
      fetchOpportunities();
      
    } catch (error) {
      console.error("Error creating proposal:", error);
      toast.error("Failed to create proposal and quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate pipeline metrics
  const pipelineMetrics = {
    totalValue: filteredOpportunities.reduce(
      (acc: number, opp: Opportunity) => acc + opp?.dealSize,
      0
    ),
    TotalQuantity: filteredOpportunities.reduce(
      (acc: number, opp: Opportunity) =>
        acc + (opp?.quantity || 0),
      0
    ),
    totalDeals: filteredOpportunities.length,
    overdueCount: filteredOpportunities.filter(
      (opp: Opportunity) => opp.expectedCloseDate < new Date().toISOString()
    ).length,
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for date validation errors
    if (dateValidationError) {
      toast.error(dateValidationError);
      return;
    }

    setIsSubmitting(true);
    console.log("Final opportunity:", {
      ...addOpportunities,
    });
    try {
      const response = await fetch(`/api/opportunities/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...addOpportunities,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Opportunity created successfully");
        setIsAddDialogOpen(false);
        fetchOpportunities(); // Refresh the opportunities list
      } else {
        toast.error(data.error || "Failed to create opportunity");
      }
    } catch (error) {
      console.error("Error converting lead:", error);
      alert("Failed to convert lead to opportunity");
    } finally {
      setIsSubmitting(false);
      setIsAddDialogOpen(false);
      setAddOpportunities({} as AddOpportunity);
    }
  };

  const handleEditOpportunity = async (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    if (opp.companies?.name) {
      setSearchQuery(opp.companies?.name);
    }
    setEditOpportunity({
      name: opp.name,
      sizeDI: opp.sizeDI,
      quantity: opp.quantity,
      status: opp.status,
      companyId: opp.companies?.id || null,
      stage: opp.stage,
      dealSize: opp.dealSize,
      probability: opp.probability,
      classification: opp.classification,
      expectedCloseDate: opp.expectedCloseDate,
      nextFollowupDate: opp.nextFollowupDate,
      lostReason: opp.lostReason ?? "", // add this
    });
    setIsEditOpportunityDialogOpen(true);
  };
  const handleEditOpportunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for date validation errors
    if (editDateValidationError) {
      toast.error(editDateValidationError);
      return;
    }

    console.log("Editing opportunity:", editOpportunity);
    if (
      !editOpportunity.name ||
      !editOpportunity.companyId ||
      !editOpportunity.stage ||
      !editOpportunity.probability ||
      !editOpportunity.expectedCloseDate ||
      !editOpportunity.nextFollowupDate ||
      !editOpportunity.sizeDI ||
      !editOpportunity.quantity ||
      editOpportunity.dealSize === undefined ||
      editOpportunity.dealSize === null ||
      editOpportunity.dealSize < 0
    ) {
      // alert("Please fill in all required fields");
      toast.info("Please fill in all required fields");
      return;
    }
    if (!selectedOpportunity) {
      toast.info("Please select an opportunity to edit");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/opportunities/${selectedOpportunity.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...editOpportunity, 
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Opportunity updated successfully");
        setIsEditOpportunityDialogOpen(false);
        fetchOpportunities(); // Refresh the opportunities list
        setSearchQuery("");
      } else {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Failed to update lead"
        );
      }
      setIsEditOpportunityDialogOpen(false);
    } catch (error) {
      console.error("Error converting lead:", error);
      alert("Failed to convert lead to opportunity");
      setIsEditOpportunityDialogOpen(false);
    } finally {
      setIsSubmitting(false);
      setIsEditOpportunityDialogOpen(false);
    }
  };
  const handleDeleteOpportunity = async (leadId: number) => {
    try {
      if (!confirm("Are you sure you want to delete this opportunity?")) return;
      const response = await fetch(`/api/opportunities/${leadId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Opportunity deleted successfully");
        fetchOpportunities(); // Refresh the opportunities list
      } else {
        toast.error("Failed to delete opportunity");
      }
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      toast.error("Failed to delete opportunity");
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
        if (!addOpportunities.companyId) {
          setSearchQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [addOpportunities.companyId]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputEditRef.current &&
        !inputEditRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        // If nothing is selected, clear the search term when closing
        if (!editOpportunity.companyId) {
          setSearchQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editOpportunity.companyId]);

  const handleCompanyChange = (id: number, name: string) => {
    if (name === "__add_master__") {
      router.push("/companies");
    } else {
      setAddOpportunities({ ...addOpportunities, companyId: id });
      setIsDropdownOpen(false);
      setSearchQuery(name);
    }
  };
  const handleEditCompanyChange = (id: number | null, name: string) => {
    if (name === "__add_master__") {
      router.push("/companies");
    } else {
      setEditOpportunity({ ...editOpportunity, companyId: id });
      setIsDropdownOpen(false);
      setSearchQuery(name);
    }
  };

  // Handle status editing
  const handleEditStatus = (opp: Opportunity) => {
    setEditingStatus({ oppId: opp.id, status: opp.status || "" });
    setStatusInputValue(opp.status || "");
  };

  const handleSaveStatus = async (oppId: number) => {
    if (!statusInputValue.trim()) {
      toast.error("Status cannot be empty");
      return;
    }

    try {
      const response = await fetch(`/api/opportunities/${oppId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: statusInputValue.trim(),
        }),
      });

      if (response.ok) {
        toast.success("Status updated successfully");
        setEditingStatus(null);
        setStatusInputValue("");
        fetchOpportunities(); // Refresh the list
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleCancelEditStatus = () => {
    setEditingStatus(null);
    setStatusInputValue("");
  };

  // Check if user can edit status
  const canEditStatus = (opp: Opportunity) => {
    return currentUser && (opp.users.email === currentUser.email || currentUser.role === "admin");
  };

  // Handle opening follow-up dialog
  const handleOpenFollowUpDialog = (opp: Opportunity) => {
    setSelectedOpportunityForFollowUp(opp);
    setIsFollowUpDialogOpen(true);
  };

  // Handle follow-up created - refresh data
  const handleFollowUpCreated = () => {
    fetchOpportunities();
  };

  // Add new state variables after existing closed won states
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [pendingProposalOpportunity, setPendingProposalOpportunity] = useState<Opportunity | null>(null);
  const [proposalForm, setProposalForm] = useState({
    quotationNo: "",
    totalQty: "",
    totalAmount: "",
    notes: "",
    quotationDeadline: "",
    contactPerson: "",
    contactEmail: "",
    quotationFile: null as File | null,
    stage: "PENDING"
  });

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Sales Opportunities
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage and track individual sales opportunities
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className="gap-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  Table
                </Button>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Opportunity
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle>Create New Opportunity</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new opportunity.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                    {/* Company and Opportunity Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="company">Company *</Label>
                        <div className="relative" ref={inputRef}>
                          <input
                            type="hidden"
                            name="company_id"
                            value={
                              addOpportunities?.companyId?.toString() || ""
                            }
                          />
                          <div className="relative">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              placeholder="Search company..."
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

                          {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {companies && companies.length > 0 ? (
                                companies.map((company) => (
                                  <div
                                    key={company.id}
                                    onClick={() =>
                                      handleCompanyChange(
                                        company.id,
                                        company.name
                                      )
                                    }
                                    className="px-4 py-3 cursor-pointer hover:bg-blue-50 text-gray-800"
                                  >
                                    {company.name}
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-gray-500">
                                  No companies found
                                </div>
                              )}
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

                      <div className="grid gap-2">
                        <Label htmlFor="opp-name">Opportunity Name *</Label>
                        <Input
                          id="opp-name"
                          placeholder="e.g., Enterprise Deal"
                          value={addOpportunities.name || ""}
                          onChange={(e) =>
                            setAddOpportunities({
                              ...addOpportunities,
                              name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Stage / Probability */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="stage">Stage</Label>
                        <Select
                          value={addOpportunities.stage || "PROSPECTING"}
                          onValueChange={(value) =>
                            setAddOpportunities({
                              ...addOpportunities,
                              stage: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stages
                              .filter((s) => !s.name.includes("Closed"))
                              .map((s) => (
                                <SelectItem key={s.name} value={s.name}>
                                  {s.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="probability">Probability (%)</Label>
                        <Input
                          id="probability"
                          type="number"
                          placeholder="30"
                          min="0"
                          max="100"
                          value={addOpportunities.probability ?? ""}
                          onChange={(e) =>
                            setAddOpportunities({
                              ...addOpportunities,
                              probability: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Classification / Expected Close */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="next-followup">
                          Next Follow-up Date
                        </Label>
                        <Input
                          id="next-followup"
                          type="date"
                          min={today}
                          value={addOpportunities.nextFollowupDate ?? ""}
                          onChange={(e) => handleNextFollowupDateChange(e.target.value)}
                          // max={addOpportunities.expectedCloseDate || undefined}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="expected-close">
                          Expected Close Date
                        </Label>
                        <Input
                          id="expected-close"
                          type="date"
                          min={today}
                          value={addOpportunities.expectedCloseDate ?? ""}
                          onChange={(e) => handleExpectedCloseDateChange(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Expected Deal Size */}
                    <div className="grid gap-2">
                      <Label htmlFor="deal-size">Expected Deal Size ($) *</Label>
                      <Input
                        id="deal-size"
                        type="number"
                        min="0"
                        value={addOpportunities.dealSize ?? 0}
                        onChange={(e) =>
                          setAddOpportunities({
                            ...addOpportunities,
                            dealSize: parseFloat(e.target.value),
                          })
                        }
                        required
                      />
                    </div>

                    {/* Date Validation Error */}
                    {dateValidationError && (
                      <div className="text-red-600 text-sm font-medium">
                        {dateValidationError}
                      </div>
                    )}

                    {/* Size DI / Quantity / Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="size-di">Size DI*</Label>
                        <Input
                          id="size-di"
                          placeholder="e.g., DN700; DN600"
                          required
                          value={addOpportunities.sizeDI ?? ""}
                          onChange={(e) =>
                            setAddOpportunities({
                              ...addOpportunities,
                              sizeDI: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="quantity">Quantity*</Label>
                        <Input
                          id="quantity"
                          type="number"
                          required
                          placeholder="2000"
                          value={addOpportunities.quantity ?? ""}
                          onChange={(e) =>
                            setAddOpportunities({
                              ...addOpportunities,
                              quantity: Number(e.target.value),
                            })
                          }
                        />
                    </div>

                      <div className="grid gap-2">
                        <Label htmlFor="class">Classification</Label>
                        <Select
                          value={addOpportunities.classification ?? ""}
                          onValueChange={(value) =>
                            setAddOpportunities({
                              ...addOpportunities,
                              classification: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ENTERPRISE">
                              ENTERPRISE
                            </SelectItem>
                            <SelectItem value="MID_MARKET">
                              MID_MARKET
                            </SelectItem>
                            <SelectItem value="SMALL_BUSINESS">
                              SMALL_BUSINESS
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Input
                        id="status"
                        placeholder="e.g., Bidding will be on September 2025"
                        value={addOpportunities.status ?? ""}
                        onChange={(e) =>
                          setAddOpportunities({
                            ...addOpportunities,
                            status: e.target.value,
                          })
                        }
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isSubmitting}
                      >
                        Create Opportunity
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Expected Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${pipelineMetrics.totalValue.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Quantity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(pipelineMetrics.TotalQuantity).toLocaleString()} MT
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Active Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {pipelineMetrics.totalDeals}
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Overdue Follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {pipelineMetrics.overdueCount}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search opportunities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.name} value={stage.name}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* View Content */}
          {viewMode === "kanban" ? (
            // Kanban View
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map((stage) => (
                <div key={stage.name} className="flex-shrink-0 w-80">
                  <div className={`${stage.color} text-white p-3 rounded-t-lg`}>
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">{stage.name}</h3>
                      <Badge
                        variant="secondary"
                        className="bg-white/20 text-white"
                      >
                        {opportunitiesByStage[stage.name]?.length || 0}
                      </Badge>
                    </div>
                    <div className="text-sm mt-1 opacity-90">
                      $
                      {opportunitiesByStage[stage.name]
                        ?.reduce(
                          (acc: number, opp: Opportunity) => acc + opp.dealSize,
                          0
                        )
                        .toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 min-h-[400px] p-3 space-y-3 rounded-b-lg">
                    {opportunitiesByStage[stage.name]?.map(
                      (opp: Opportunity) => (
                        <Card
                          key={opp.id}
                          className={`transition-all duration-200 ${opp.isFrozen ? 'opacity-50 bg-gray-50' : 'hover:shadow-lg'}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-sm">
                                  {opp.companies?.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {opp.name}
                                </p>
                              </div>
                              {opp.expectedCloseDate <
                                new Date().toISOString() && (
                                <Tooltip
                                  content={
                                    canEditStatus(opp) ? (
                                      <div className="space-y-2">
                                        <div className="text-sm">
                                          {opp.status && opp.status.trim() ? opp.status : "Status not added"}
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-xs"
                                          onClick={() => handleEditStatus(opp)}
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Edit Status
                                        </Button>
                                      </div>
                                    ) : (
                                      opp.status && opp.status.trim() ? opp.status : "Status not added"
                                    )
                                  }
                                  position="top"
                                  interactive={true}
                                >
                                <Badge
                                  variant="destructive"
                                    className="text-xs cursor-help"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                                </Tooltip>
                              )}
                              {opp.isFrozen && (
                                <Tooltip
                                  content={
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium">Opportunity Frozen</div>
                                      <div className="text-xs text-gray-600">
                                        {opp.frozenReason || "Pending quotation in progress"}
                                      </div>
                                    </div>
                                  }
                                  position="top"
                                >
                                <Badge
                                  className="text-xs cursor-help bg-blue-100 text-blue-800 border-blue-300"
                                >
                                  <Lock className="h-3 w-3 mr-1" />
                                  Frozen
                                </Badge>
                                </Tooltip>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-green-600">
                                  ${(opp.dealSize / 1000).toFixed(0)}k
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {opp.probability}%
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{opp.users?.name}</span>
                                {/* <span>{opp.daysInStage}d in stage</span> */}
                              </div>
                            </div>
                            {stage.name === "PROPOSAL" && (
                              <div className="mt-3 pt-3 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`w-full text-xs ${opp.isFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  disabled={opp.isFrozen}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStageChange(opp.id, "NEGOTIATION",opp.stage);
                                  }}
                                >
                                  Move to Negotiation
                                  <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Table View
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center font-bold" >Opportunity</TableHead>
                      <TableHead className="text-left font-bold">Stage</TableHead>
                      <TableHead className="text-center font-bold">Size</TableHead>
                      <TableHead className="text-center font-bold">Quantity(MT)</TableHead>
                      <TableHead className="text-center font-bold">Probability</TableHead>
                      <TableHead className="text-left font-bold">Expected Close</TableHead>
                      <TableHead className="text-left font-bold">Next Follow-up</TableHead>
                      <TableHead className="text-center font-bold">Follow-Up</TableHead>
                      <TableHead className="text-center font-bold">Owner</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOpportunities.map((opp) => {
                      const overdueDetails = overdueFollowupsByOpportunity[opp.id];
                      const nextFollowUpDate = opp.nextFollowupDate ? new Date(opp.nextFollowupDate) : null;
                      const isFollowUpOverdue = nextFollowUpDate ? nextFollowUpDate < new Date() : false;
                      const fallbackDaysOverdue = nextFollowUpDate
                        ? Math.max(1, Math.ceil((Date.now() - nextFollowUpDate.getTime()) / (1000 * 60 * 60 * 24)))
                        : 0;
                      const daysOverdue = overdueDetails?.daysOverdue ?? fallbackDaysOverdue;
                      return (
                        <TableRow
                          key={opp.id}
                          className={`text-center ${opp.isFrozen ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium">{opp.companies?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {opp.name}
                              </p>
                            </div>
                            {opp.isFrozen && (
                              <Tooltip
                                content={
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium">Opportunity Frozen</div>
                                    <div className="text-xs text-gray-600">
                                      {opp.frozenReason || "Pending quotation in progress"}
                                    </div>
                                  </div>
                                }
                                position="top"
                              >
                              <Badge
                                className="text-xs bg-blue-100 text-blue-800 border-blue-300"
                              >
                                <Lock className="h-3 w-3 mr-1" />
                                Frozen
                              </Badge>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={opp.stage?.toUpperCase()}
                            onValueChange={(value) =>
                              handleStageChange(opp.id, value,opp.stage)
                            }
                            disabled={opp.isFrozen}
                          >
                            <SelectTrigger className={`w-[160px] h-8 ${opp.isFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((stage) => (
                                <SelectItem key={stage.name} value={stage.name}>
                                  <Badge className={stageColors[stage.name]}>
                                    {stage.name}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-blue-600">
                            {opp.sizeDI??""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            {opp.quantity?.toLocaleString() ?? 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${opp.probability}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {opp.probability}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {opp.expectedCloseDate ? (
                            <div
                              className={`flex items-center gap-1 text-sm ${
                                new Date(opp.expectedCloseDate) < new Date()
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              <Clock
                                className="h-4 w-4 mr-1"
                              />
                              {new Date(
                                opp.expectedCloseDate
                              ).toLocaleDateString("en-IN", options)}
                          </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {opp.nextFollowupDate ? (
                            <div
                              className={`flex items-center gap-1 text-sm ${
                                new Date(opp.nextFollowupDate) < new Date()
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              <Clock
                                className="h-4 w-4 mr-1"
                              />
                              {new Date(
                                opp.nextFollowupDate
                              ).toLocaleDateString("en-IN", options)}
                              {isFollowUpOverdue && (
                                <Tooltip
                                  content={
                                    <div className="space-y-3 text-left">
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold text-white">
                                          Follow-up overdue by {daysOverdue} day{daysOverdue > 1 ? 's' : ''}
                                        </p>
                                        {nextFollowUpDate && (
                                          <p className="text-xs text-white/80">
                                            Scheduled on {nextFollowUpDate.toLocaleDateString('en-IN', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric'
                                            })}
                                          </p>
                                        )}
                                        <p className="text-xs text-white/70">
                                          Owner: {overdueDetails?.assignedTo || opp.users?.name || 'Unassigned'}
                                        </p>
                                        <p className="text-xs text-white/70">
                                          Action: {overdueDetails?.actionDescription || 'Daily follow-up'}
                                        </p>
                                        {overdueDetails?.notes && (
                                          <p className="text-xs text-white/60">
                                            Notes: {overdueDetails.notes}
                                          </p>
                                        )}
                                        <p className="text-xs text-amber-200">
                                          {overdueDetails?.overdueReason
                                            ? `Reason logged: ${overdueDetails.overdueReason}`
                                            : 'Reason not captured yet'}
                                        </p>
                                      </div>
                                      {canEditStatus(opp) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-xs text-black"
                                          onClick={() => handleEditStatus(opp)}
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Edit Status
                                        </Button>
                                      )}
                                    </div>
                                  }
                                  position="top"
                                  interactive={true}
                                >
                                <Badge
                                  variant="destructive"
                                    className="ml-1 text-xs cursor-help"
                                >
                                  Overdue{daysOverdue > 0 ? ` (${daysOverdue}d)` : ''}
                                </Badge>
                                </Tooltip>

                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFollowUpDialog(opp)}
                            className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-300 bg-white shadow-sm rounded-lg transition-all duration-200"
                            title="Add Daily Follow-up"
                          >
                            <CalendarPlus className="h-4 w-4 text-blue-500" />
                          </Button>
                        </TableCell>
                        <TableCell>{opp.users.name}</TableCell>
                        {/* <TableCell className="text-right">
                          <Button variant="ghost" size="sm" >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell> */}
                        <TableCell className="text-right">
                          {(opp.users.email === currentUser?.email ||
                            currentUser?.role === "admin") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  {/* <MoreHorizontal className="h-4 w-4" /> */}
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                <DropdownMenuItem
                                  onClick={() => handleEditOpportunity(opp)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Opportunity
                                </DropdownMenuItem>
                                {/* <DropdownMenuItem */}
                                {/* onClick={() => */}
                                {/* handleConvertToOpportunity(opp) */}
                                {/* } */}
                                {/* className="text-green-600" */}
                                {/* > */}
                                {/* <ArrowUpRight className="mr-2 h-4 w-4" /> */}
                                {/* Convert to Opportunity */}
                                {/* </DropdownMenuItem> */}
                                <DropdownMenuSeparator />
                                {currentUser.role === "admin" && (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                      handleDeleteOpportunity(opp.id)
                                    }
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
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
        <Dialog
          open={isEditOpportunityDialogOpen}
          onOpenChange={setIsEditOpportunityDialogOpen}
        >
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Edit Opportunity</DialogTitle>
              <DialogDescription>
                Make changes to your opportunity here. Click save when you're
                done.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleEditOpportunitySubmit}
              className="grid gap-6 py-4"
            >
              {/* Company and Opportunity Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company">Company *</Label>
                  <div className="relative" ref={inputEditRef}>
                    <input
                      type="hidden"
                      name="company_id"
                      value={editOpportunity?.companyId?.toString() || ""}
                    />
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        placeholder={editOpportunity.companyId ? `Current: ${searchQuery || 'Company selected'}` : "Search company..."}
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
                              {company.name}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500">
                            No companies found
                          </div>
                        )}
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

                <div className="grid gap-2">
                  <Label htmlFor="opp-name">Opportunity Name *</Label>
                  <Input
                    id="opp-name"
                    placeholder={editOpportunity.name ? `Current: ${editOpportunity.name}` : "e.g., Enterprise Deal"}
                    value={editOpportunity.name || ""}
                    onChange={(e) =>
                      setEditOpportunity({
                        ...editOpportunity,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              {/* Stage / Probability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select
                    value={editOpportunity.stage || "PROSPECTING"}
                    onValueChange={(value) =>
                      setEditOpportunity({
                        ...editOpportunity,
                        stage: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages
                        .filter((s) => !s.name.includes("Closed"))
                        .map((s) => (
                          <SelectItem key={s.name} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    placeholder={`Current: ${editOpportunity.probability ?? 0}%`}
                    min="0"
                    max="100"
                    value={editOpportunity.probability ?? ""}
                    onChange={(e) =>
                      setEditOpportunity({
                        ...editOpportunity,
                        probability: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {/* Deal Size */}
                <div className="grid gap-2">
                <Label htmlFor="deal-size">Expected Deal Size ($) *</Label>
                  <Input
                  id="deal-size"
                    type="number"
                  placeholder= "WRITE EXPECTED DEAL SIZE IN USD"
                    min="0"
                  step="0.01"
                  value={editOpportunity.dealSize ?? 0}
                    onChange={(e) =>
                      setEditOpportunity({
                        ...editOpportunity,
                      dealSize: parseFloat(e.target.value),
                      })
                    }
                  required
                  />
                </div>

              {/* Next Follow-up / Expected Close */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="next-followup">Next Follow-up Date</Label>
                  <Input
                    id="next-followup"
                    type="date"
                    min={today}
                    value={editOpportunity.nextFollowupDate ?? ""}
                    onChange={(e) => handleNextFollowupDateChange(e.target.value, true)}
                  />
              </div>

                <div className="grid gap-2">
                  <Label htmlFor="expected-close">Expected Close Date</Label>
                  <Input
                    id="expected-close"
                    type="date"
                    min={today}
                    value={editOpportunity.expectedCloseDate ?? ""}
                    onChange={(e) => handleExpectedCloseDateChange(e.target.value, true)}
                  />
                </div>
              </div>

              {/* Date Validation Error */}
              {editDateValidationError && (
                <div className="text-red-600 text-sm font-medium">
                  {editDateValidationError}
                </div>
              )}

              {/* Size DI / Quantity / Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="size-di">Size DI*</Label>
                  <Input
                    id="size-di"
                    placeholder={editOpportunity.sizeDI ? `Current: ${editOpportunity.sizeDI}` : "e.g., DN700; DN600"}
                    required
                    value={editOpportunity.sizeDI ?? ""}
                    onChange={(e) =>
                      setEditOpportunity({
                        ...editOpportunity,
                        sizeDI: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity*</Label>
                  <Input
                    id="quantity"
                    type="number"
                    required
                    placeholder={editOpportunity.quantity ? `Current: ${editOpportunity.quantity} MT` : "2000"}
                    value={editOpportunity.quantity ?? ""}
                    onChange={(e) =>
                      setEditOpportunity({
                        ...editOpportunity,
                        quantity: Number(e.target.value),
                      })
                    }
                  />
              </div>

                <div className="grid gap-2">
                  <Label htmlFor="class">Classification</Label>
                  <Select
                    value={editOpportunity.classification ?? ""}
                    onValueChange={(value) =>
                      setEditOpportunity({
                        ...editOpportunity,
                        classification: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      <SelectItem value="MID_MARKET">MID_MARKET</SelectItem>
                      <SelectItem value="SMALL_BUSINESS">
                        SMALL_BUSINESS
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status */}
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Input
                  id="status"
                  placeholder={editOpportunity.status ? `Current: ${editOpportunity.status}` : "e.g., Bidding will be on September 2025"}
                  value={editOpportunity.status ?? ""}
                  onChange={(e) =>
                    setEditOpportunity({
                      ...editOpportunity,
                      status: e.target.value,
                    })
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditOpportunityDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Status Dialog */}
        <Dialog
          open={!!editingStatus}
          onOpenChange={(open) => !open && handleCancelEditStatus()}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Status</DialogTitle>
              <DialogDescription>
                Update the status for this opportunity.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Textarea
                  id="edit-status"
                  placeholder="Enter status details..."
                  value={statusInputValue}
                  onChange={(e) => setStatusInputValue(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelEditStatus}
              >
                Cancel
              </Button>
              <Button
                onClick={() => editingStatus && handleSaveStatus(editingStatus.oppId)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CLOSED_WON Confirmation Dialog */}
        <Dialog
          open={isClosedWonDialogOpen}
          onOpenChange={setIsClosedWonDialogOpen}
        >
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
            <DialogHeader className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-t-lg border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    🎉 Close Opportunity as Won
              </DialogTitle>
                  <DialogDescription className="text-gray-600 mt-1">
                    Congratulations on winning this deal! Please complete the pipeline information to finalize.
              </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleClosedWonSubmit} className="flex flex-col max-h-[calc(90vh-120px)]">
              {/* Opportunity Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-6 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900">{pendingClosedWonOpportunity?.name}</h4>
                    <p className="text-sm text-blue-700">{pendingClosedWonOpportunity?.companies?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-600">Current Stage</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {pendingClosedWonOpportunity?.stage}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Step 1: Basic Deal Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm font-semibold">1</div>
                    <h3 className="text-lg font-semibold text-gray-900">Basic Deal Information</h3>
                  </div>

              <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="won-date" className="text-sm font-medium text-gray-700">Won Date *</Label>
                  <Input
                    id="won-date"
                    type="date"
                    value={closedWonForm.wonDate}
                    onChange={(e) =>
                      setClosedWonForm({
                        ...closedWonForm,
                        wonDate: e.target.value,
                      })
                    }
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
                    <div className="space-y-2">
                      <Label htmlFor="final-deal-size" className="text-sm font-medium text-gray-700">Final Deal Size ($) *</Label>
                      
                  <Input
                    id="final-deal-size"
                    type="number"
                    placeholder="Enter final amount"
                    value={closedWonForm.finalDealSize}
                    onChange={(e) =>
                      setClosedWonForm({
                        ...closedWonForm,
                        finalDealSize: e.target.value,
                      })
                    }
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                    </div>
                </div>
              </div>

                {/* Step 2: Customer Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">2</div>
                    <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Customer Name - Read Only */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Customer Name</Label>
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {pendingClosedWonOpportunity?.companies?.name?.charAt(0)?.toUpperCase() || "C"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">
                              {pendingClosedWonOpportunity?.companies?.name || "N/A"}
                            </span>
                            <p className="text-xs text-gray-500">Auto-filled from opportunity</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Class */}
                    <div className="space-y-2">
                      <Label htmlFor="class" className="text-sm font-medium text-gray-700">Deal Class *</Label>
                      <select
                        id="class"
                        value={closedWonForm.class}
                        onChange={(e) =>
                          setClosedWonForm({
                            ...closedWonForm,
                            class: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="">Select a class</option>
                        <option value="A">A - Premium</option>
                        <option value="B">B - Standard</option>
                        <option value="C">C - Basic</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 3: Technical Specifications */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold">3</div>
                    <h3 className="text-lg font-semibold text-gray-900">Technical Specifications</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="diameter" className="text-sm font-medium text-gray-700">
                        Diameter *
                        {pendingClosedWonOpportunity?.sizeDI && (
                          <span className="text-xs text-purple-600 ml-1">(Auto-filled from opportunity)</span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          id="diameter"
                          placeholder="e.g., DN700, DN600"
                          value={closedWonForm.diameter}
                          onChange={(e) =>
                            setClosedWonForm({
                              ...closedWonForm,
                              diameter: e.target.value,
                            })
                          }
                          className={`border-gray-300 focus:border-purple-500 focus:ring-purple-500 pr-8 ${
                            pendingClosedWonOpportunity?.sizeDI ? 'bg-purple-50' : ''
                          }`}
                          required
                        />
                        {pendingClosedWonOpportunity?.sizeDI && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-xs text-purple-600">📏</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nr" className="text-sm font-medium text-gray-700">NR Reference</Label>
                      <Input
                        id="nr"
                        placeholder="NR reference number"
                        value={closedWonForm.nr}
                        onChange={(e) =>
                          setClosedWonForm({
                            ...closedWonForm,
                            nr: e.target.value,
                          })
                        }
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="specification" className="text-sm font-medium text-gray-700">Technical Specification *</Label>
                    <Textarea
                      id="specification"
                      placeholder="Detailed technical specifications, requirements, material specifications, etc."
                      value={closedWonForm.specification}
                      onChange={(e) =>
                        setClosedWonForm({
                          ...closedWonForm,
                          specification: e.target.value,
                        })
                      }
                      className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
                      required
                      rows={3}
                    />
                  </div>
                </div>

                {/* Step 4: Order Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold">4</div>
                    <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order-value-cr" className="text-sm font-medium text-gray-700">Order Value ($ in Millions) *</Label>
                      <div className="relative">
                        <Input
                          id="order-value-cr"
                          type="number"
                          step="0.01"
                          placeholder="2.5"
                          value={closedWonForm.orderValueInCr}
                          onChange={(e) =>
                            setClosedWonForm({
                              ...closedWonForm,
                              orderValueInCr: e.target.value,
                            })
                          }
                          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 pr-12"
                          required
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">Cr</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qty-mt" className="text-sm font-medium text-gray-700">Quantity (MT) *</Label>
                      <div className="relative">
                        <Input
                          id="qty-mt"
                          type="number"
                          step="0.01"
                          placeholder="2000"
                          value={closedWonForm.qtyInMt}
                          onChange={(e) =>
                            setClosedWonForm({
                              ...closedWonForm,
                              qtyInMt: e.target.value,
                            })
                          }
                          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 pr-8"
                          required
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">MT</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="expected-order-date" className="text-sm font-medium text-gray-700">Expected Order Book Date *</Label>
                    <Input
                      id="expected-order-date"
                      type="date"
                      value={closedWonForm.expectedOrderBookDate}
                      onChange={(e) =>
                        setClosedWonForm({
                          ...closedWonForm,
                          expectedOrderBookDate: e.target.value,
                        })
                      }
                      className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>

                {/* Step 5: Challenges & Additional Info */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full text-sm font-semibold">5</div>
                    <h3 className="text-lg font-semibold text-gray-900">Challenges & Additional Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="challenges" className="text-sm font-medium text-gray-700">Challenges to Book Order *</Label>
                      <Textarea
                        id="challenges"
                        placeholder="Describe potential challenges, obstacles, or special requirements for booking this order..."
                        value={closedWonForm.challenges}
                        onChange={(e) =>
                          setClosedWonForm({
                            ...closedWonForm,
                            challenges: e.target.value,
                          })
                        }
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500 resize-none"
                        required
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="won-reason" className="text-sm font-medium text-gray-700">Reason for Win</Label>
                <Input
                  id="won-reason"
                  placeholder="e.g., Competitive advantage, Strong relationship, Technical superiority"
                  value={closedWonForm.wonReason}
                  onChange={(e) =>
                    setClosedWonForm({
                      ...closedWonForm,
                      wonReason: e.target.value,
                    })
                  }
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>

                    <div className="space-y-2">
                      <Label htmlFor="won-notes" className="text-sm font-medium text-gray-700">Additional Notes</Label>
                      <Textarea
                  id="won-notes"
                  placeholder="Any additional details about this successful deal"
                  value={closedWonForm.notes}
                  onChange={(e) =>
                    setClosedWonForm({
                      ...closedWonForm,
                      notes: e.target.value,
                    })
                  }
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500 resize-none"
                        rows={2}
                />
              </div>

                    <div className="space-y-2">
                      <Label htmlFor="next-steps" className="text-sm font-medium text-gray-700">Next Steps / Follow-up</Label>
                      <Textarea
                  id="next-steps"
                        placeholder="Implementation planning, Contract signing, Handover process, etc."
                  value={closedWonForm.nextSteps}
                  onChange={(e) =>
                    setClosedWonForm({
                      ...closedWonForm,
                      nextSteps: e.target.value,
                    })
                  }
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500 resize-none"
                        rows={2}
                />
                    </div>
                  </div>
                </div>
              </div>


              {/* Footer with Progress Indicator */}
              <div className="border-t bg-gray-50 px-6 py-4 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Required fields:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      closedWonForm.wonDate && closedWonForm.finalDealSize ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      Deal Info
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      closedWonForm.class ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      Customer
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (closedWonForm.diameter || pendingClosedWonOpportunity?.sizeDI) && closedWonForm.specification ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      Technical
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      closedWonForm.orderValueInCr && closedWonForm.qtyInMt && closedWonForm.expectedOrderBookDate ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      Order
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      closedWonForm.challenges ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      Challenges
                    </span>
                  </div>
                  <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsClosedWonDialogOpen(false);
                    setPendingClosedWonOpportunity(null);
                  }}
                      className="border-gray-300 hover:bg-gray-100"
                      disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isSubmitting}
                >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Close as Won
                        </div>
                      )}
                </Button>
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Daily FollowUp Dialog */}
        {isFollowUpDialogOpen && selectedOpportunityForFollowUp && (
          <DailyFollowUpDialog
            isOpen={isFollowUpDialogOpen}
            onClose={() => {
              setIsFollowUpDialogOpen(false);
              setSelectedOpportunityForFollowUp(null);
            }}
            opportunity={selectedOpportunityForFollowUp}
            onFollowUpCreated={handleFollowUpCreated}
          />
        )}

        {/* Enhanced Proposal Stage Dialog */}
        <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-purple-600" />
                Create Proposal - {pendingProposalOpportunity?.name}
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Create a comprehensive quotation for this opportunity. This will automatically add the quotation to the pending quotations page and freeze the opportunity until completion.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleProposalSubmit} className="space-y-6 pt-4">
              {/* Basic Information Section */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-purple-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quotationNo" className="text-sm font-medium text-gray-700">
                      Quotation No (SQ n.) *
                    </Label>
                    <Input
                      id="quotationNo"
                      value={proposalForm.quotationNo}
                      onChange={(e) => setProposalForm({ ...proposalForm, quotationNo: e.target.value })}
                      placeholder="e.g., SQ 2024-0001"
                      className="mt-1 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="stage" className="text-sm font-medium text-gray-700">
                      Initial Stage
                    </Label>
                    <Select
                      value={proposalForm.stage}
                      onValueChange={(value) => setProposalForm({ ...proposalForm, stage: value })}
                    >
                      <SelectTrigger className="mt-1 border-purple-300 focus:border-purple-500">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                        <SelectItem value="REQUOTATION">Requotation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="totalQty" className="text-sm font-medium text-gray-700">
                      Total Quantity *
                    </Label>
                    <Input
                      id="totalQty"
                      type="number"
                      value={proposalForm.totalQty}
                      onChange={(e) => setProposalForm({ ...proposalForm, totalQty: e.target.value })}
                      placeholder="Enter total quantity"
                      className="mt-1 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="totalAmount" className="text-sm font-medium text-gray-700">
                      Total Amount ($) *
                    </Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      value={proposalForm.totalAmount}
                      onChange={(e) => setProposalForm({ ...proposalForm, totalAmount: e.target.value })}
                      placeholder="Enter total amount"
                      className="mt-1 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="quotationDeadline" className="text-sm font-medium text-gray-700">
                      Quotation Deadline
                    </Label>
                    <Input
                      id="quotationDeadline"
                      type="date"
                      value={proposalForm.quotationDeadline}
                      onChange={(e) => setProposalForm({ ...proposalForm, quotationDeadline: e.target.value })}
                      className="mt-1 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPerson" className="text-sm font-medium text-gray-700">
                      Contact Person
                    </Label>
                    <Input
                      id="contactPerson"
                      value={proposalForm.contactPerson}
                      onChange={(e) => setProposalForm({ ...proposalForm, contactPerson: e.target.value })}
                      placeholder="Primary contact person"
                      className="mt-1 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contactEmail" className="text-sm font-medium text-gray-700">
                      Contact Email
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={proposalForm.contactEmail}
                      onChange={(e) => setProposalForm({ ...proposalForm, contactEmail: e.target.value })}
                      placeholder="Contact email address"
                      className="mt-1 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-green-600" />
                  Quotation Document
                </h3>
                <div className="space-y-3">
                  <Label htmlFor="quotationFile" className="text-sm font-medium text-gray-700">
                    Upload Quotation (PDF or Excel)
                  </Label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="quotationFile" className="flex flex-col items-center justify-center w-full h-32 border-2 border-green-300 border-dashed rounded-lg cursor-pointer bg-green-50 hover:bg-green-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-green-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, XLS, XLSX (MAX. 10MB)</p>
                        {proposalForm.quotationFile && (
                          <p className="text-xs text-green-600 mt-2 font-medium">
                            Selected: {proposalForm.quotationFile.name}
                          </p>
                        )}
                      </div>
                      <input
                        id="quotationFile"
                        type="file"
                        className="hidden"
                        accept=".pdf,.xls,.xlsx"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setProposalForm({ ...proposalForm, quotationFile: file });
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Notes Section */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-yellow-600" />
                  Additional Notes
                </h3>
                <Textarea
                  id="notes"
                  value={proposalForm.notes}
                  onChange={(e) => setProposalForm({ ...proposalForm, notes: e.target.value })}
                  placeholder="Additional notes, specifications, or special requirements..."
                  rows={4}
                  className="border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              {/* Opportunity Summary */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-gray-600" />
                  Opportunity Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-500">Company</p>
                    <p className="font-semibold text-gray-900">{pendingProposalOpportunity?.companies?.name}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-500">Original Deal Size</p>
                    <p className="font-semibold text-gray-900">${(pendingProposalOpportunity?.dealSize || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-500">Current Stage</p>
                    <p className="font-semibold text-gray-900">{pendingProposalOpportunity?.stage}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Note: Creating this proposal will freeze the opportunity until the quotation process is completed.
                  </p>
                </div>
              </div>
              
              <DialogFooter className="border-t pt-4 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsProposalDialogOpen(false);
                    setPendingProposalOpportunity(null);
                  }}
                  disabled={isSubmitting}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Proposal...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Create Proposal & Quotation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
