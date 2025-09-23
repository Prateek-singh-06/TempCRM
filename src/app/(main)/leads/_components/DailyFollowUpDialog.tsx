"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  User,
  Loader2,
  Plus
} from "lucide-react";

interface Lead {
  id: number;
  name: string;
  companies?: { name: string };
}

interface DailyFollowUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onFollowUpCreated?: () => void;
}

export default function DailyFollowUpDialog({
  isOpen,
  onClose,
  lead,
  onFollowUpCreated
}: DailyFollowUpDialogProps) {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    role: string;
    id: string;
    email: string;
    name: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    followUpType: "CALL",
    description: "",
    nextAction: "",
    nextActionDate: "",
    priority: "MEDIUM",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCurrentUser();
      // Reset form when opened
      setFormData({
        followUpType: "CALL",
        description: "",
        nextAction: "",
        nextActionDate: "",
        priority: "MEDIUM",
        notes: "",
      });
    }
  }, [isOpen, lead]);

  const fetchCurrentUser = async () => {
    try {
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!formData.description.trim() || !formData.nextAction.trim() || !formData.nextActionDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const apiData = {
        assignedTo: currentUser?.name || "Unknown User",
        actionType: formData.followUpType,
        actionDescription: formData.description,
        followUpDate: formData.nextActionDate,
        notes: formData.notes || "",
        priority: formData.priority,
        timezone: "Asia/Kolkata",
        linkType: "LEAD",
        leadId: lead.id.toString(),
        leadName: lead.name
      };

      const response = await fetch('/api/daily-followups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        toast.success("Daily follow-up created successfully");
        onClose();
        onFollowUpCreated?.();
      } else {
        toast.error("Failed to create follow-up");
      }
    } catch (error) {
      console.error("Error creating follow-up:", error);
      toast.error("Error creating follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Daily Follow-up
            </div>
          </DialogTitle>
          <DialogDescription>
            Create a new daily follow-up entry for{" "}
            <span className="font-semibold text-blue-600">
              {lead?.name}
            </span>
            {lead?.companies?.name && (
              <> from <span className="font-semibold">{lead.companies.name}</span></>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="followUpType">Follow-up Type *</Label>
              <Select
                value={formData.followUpType}
                onValueChange={(value) => setFormData({ ...formData, followUpType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="SITE_VISIT">Site Visit</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="MESSAGE">Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the follow-up"
              required
            />
          </div>

          <div>
            <Label htmlFor="nextAction">Next Action *</Label>
            <Textarea
              id="nextAction"
              value={formData.nextAction}
              onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
              placeholder="What needs to be done next?"
              rows={2}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nextActionDate">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Action Date *
              </div>
            </Label>
            <Input
              id="nextActionDate"
              type="date"
              value={formData.nextActionDate}
              onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Notes (Optional)
              </div>
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or context"
              rows={3}
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.description.trim() || !formData.nextAction.trim() || !formData.nextActionDate}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Follow-up"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
