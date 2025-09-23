"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Building, FileText, ChevronDown, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface DailyFollowUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: {
    id: number;
    name: string;
    companies?: { id: number; name: string };
    users?: { name: string; email: string };
    stage?: string | null;
  } | null;
  onFollowUpCreated: () => void;
}

export default function DailyFollowUpDialog({
  isOpen,
  onClose,
  opportunity,
  onFollowUpCreated,
}: DailyFollowUpDialogProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: "",
    description: "",
    nextFollowUpDate: "",
    nextAction: "",
    nextActionDate: "",
    priority: "MEDIUM",
    notes: "",

  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const apiData = {
        assignedTo: opportunity?.users?.name || "Unknown User",
        actionType: formData.type,
        actionDescription: formData.description,
        actionDate: formData.date,
        nextAction: formData.nextAction || "",
        followUpDate: formData.nextFollowUpDate,
        notes: formData.notes || "",
        priority: formData.priority || "MEDIUM",
        timezone: "Asia/Kolkata",
        linkType: "OPPORTUNITY",
        opportunityId: opportunity?.id,
        opportunityName: opportunity?.name,
        companyId: opportunity?.companies?.id || null,
        

      };
      const response = await fetch("/api/daily-followups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Daily follow-up created successfully!");
        onClose();
        onFollowUpCreated();
        // Reset form
        setFormData({
          date: new Date().toISOString().split('T')[0],
          type: "",
          description: "",
          nextFollowUpDate: "",
          nextAction: "",
          nextActionDate: "",
          priority: "MEDIUM",
          notes: "",
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create follow-up");
      }
    } catch (error) {
      console.error("Error creating follow-up:", error);
      toast.error("Failed to create follow-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset form when closing
      setFormData({
        date: new Date().toISOString().split('T')[0],
          type: "",
          description: "",
          nextFollowUpDate: "",
          nextAction: "",
          nextActionDate: "",
          priority: "MEDIUM",
          notes: "",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Daily Follow-Up
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Create a daily follow-up for opportunity tracking
              </DialogDescription>
            </div>
          </div>

          {/* Opportunity Summary */}
          {opportunity && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 text-sm">{opportunity.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-blue-700">
                      <Building className="h-3 w-3" />
                      {opportunity.companies?.name || "N/A"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-blue-700">
                      <Users className="h-3 w-3" />
                      {opportunity.users?.name || "Unknown"}
                    </div>
                  </div>
                </div>
                <div>
                  <Badge variant="outline" className="text-xs bg-white border-blue-200 text-blue-700">
                    {opportunity.stage || "Unknown"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date & Type Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="followup-date" className="text-sm font-semibold text-gray-700">
                Date *
              </Label>
              <div className="relative">
                <Input
                  id="followup-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="pl-3 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                  required
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="followup-type" className="text-sm font-semibold text-gray-700">
                Follow-Up Type *
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">📞 Call</SelectItem>
                  <SelectItem value="EMAIL">✉️ Email</SelectItem>
                  <SelectItem value="MEETING">💼 Meeting</SelectItem>
                  <SelectItem value="SITE_VISIT">🏗️ Site Visit</SelectItem>
                  <SelectItem value="MESSAGE">📄 Message</SelectItem>
                  <SelectItem value="OTHER">📝 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="followup-status" className="text-sm font-semibold text-gray-700">
              Priority *
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value })
              }
            >
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="followup-description" className="text-sm font-semibold text-gray-700">
              Description *
            </Label>
            <Textarea
              id="followup-description"
              placeholder="Detailed description of the follow-up activity..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="min-h-24 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white resize-none"
              required
            />
          </div>

          {/* Next Follow-up */}
          <div className="space-y-2">
            <Label htmlFor="next-followup-date" className="text-sm font-semibold text-gray-700">
              Next Follow-Up Date (Optional)
            </Label>
            <div className="relative">
              <Input
                id="next-followup-date"
                type="date"
                value={formData.nextFollowUpDate}
                onChange={(e) =>
                  setFormData({ ...formData, nextFollowUpDate: e.target.value })
                }
                className="pl-3 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                min={new Date().toISOString().split('T')[0]}
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="followup-notes" className="text-sm font-semibold text-gray-700">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="followup-notes"
              placeholder="Any additional notes or observations..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="min-h-16 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white resize-none"
            />
          </div>

          <DialogFooter className="flex gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </div>
              ) : (
                "Create Follow-Up"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
