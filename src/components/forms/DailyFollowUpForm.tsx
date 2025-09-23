"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CalendarDays, CheckCircle2 } from "lucide-react";

interface FollowUpOption {
  id: string;
  actionType: string;
  actionDescription: string;
  followUpDate: string;
  status: string;
  notes?: string;
  priority?: string;
}

interface DailyFollowUpFormProps {
  formData: any;
  onFormChange: (data: any) => void;
  currentUser: { name: string; email: string } | null;
  mode: 'new' | 'existing';
  onModeChange: (mode: 'new' | 'existing') => void;
  existingFollowUps: FollowUpOption[];
  selectedExistingFollowUpId: string;
  onSelectExisting: (id: string) => void;
  isLoadingExisting?: boolean;
  fetchError?: string | null;
}

export function DailyFollowUpForm({
  formData,
  onFormChange,
  currentUser,
  mode,
  onModeChange,
  existingFollowUps,
  selectedExistingFollowUpId,
  onSelectExisting,
  isLoadingExisting,
  fetchError
}: DailyFollowUpFormProps) {
  const [leadOptions, setLeadOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [opportunityOptions, setOpportunityOptions] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch options when linkType changes
  useEffect(() => {
    const fetchLists = async () => {
      try {
        if (formData.linkType === 'LEAD') {
          const res = await fetch('/api/leads');
          const data = await res.json();
          if (res.ok) {
            setLeadOptions((data.leads || []).map((l: any) => ({ id: String(l.id), name: l.name })));
          }
        } else if (formData.linkType === 'OPPORTUNITY') {
          const res = await fetch('/api/opportunities');
          const data = await res.json();
          if (res.ok) {
            setOpportunityOptions((data.opportunities || []).map((o: any) => ({ id: String(o.id), name: o.name })));
          }
        }
      } catch (e) {
        console.error('Failed to fetch options', e);
      }
    };
    fetchLists();
  }, [formData.linkType]);
  
  const handleInputChange = (field: string, value: string) => {
    onFormChange({ ...formData, [field]: value });
  };
  
  const handleLinkTypeChange = (value: string) => {
    onFormChange({ ...formData, linkType: value, leadId: '', opportunityId: '' });
  };


  const formatFollowUpDateTime = (value?: string) => {
    if (!value) return 'Scheduled time not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Scheduled time not available';
    }
    return date.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const selectedFollowUp =
    mode === 'existing'
      ? existingFollowUps.find((followUp) => followUp.id === selectedExistingFollowUpId)
      : undefined;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Daily Follow-up</CardTitle>
        <CardDescription>
          This is mandatory with attendance. Link today's activity or create a new one before submitting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-1 dark:bg-gray-900/50">
            <Button
              type="button"
              variant={mode === 'existing' ? 'default' : 'ghost'}
              className="rounded-md"
              onClick={() => onModeChange('existing')}
            >
              Use today's follow-up
            </Button>
            <Button
              type="button"
              variant={mode === 'new' ? 'default' : 'ghost'}
              className="rounded-md"
              onClick={() => onModeChange('new')}
            >
              Create new follow-up
            </Button>
          </div>
          {currentUser?.name && (
            <div className="text-xs text-muted-foreground">
              Logged in as <span className="font-medium text-foreground">{currentUser.name}</span>
            </div>
          )}
        </div>

        {mode === 'existing' ? (
          <div className="space-y-4">
            {isLoadingExisting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading today's follow-ups...
              </div>
            ) : fetchError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load follow-ups</AlertTitle>
                <AlertDescription>{fetchError}</AlertDescription>
              </Alert>
            ) : existingFollowUps.length === 0 ? (
              <Alert>
                <AlertTitle>No follow-ups logged yet</AlertTitle>
                <AlertDescription>
                  You have not logged a follow-up for today. Switch to “Create new follow-up” to add one now.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Select today's follow-up</Label>
                  <Select
                    value={selectedExistingFollowUpId}
                    onValueChange={onSelectExisting}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose a follow-up you've already created" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingFollowUps.map((followUp) => (
                        <SelectItem key={followUp.id} value={followUp.id}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {followUp.actionType} • {followUp.actionDescription || 'No description'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatFollowUpDateTime(followUp.followUpDate)} 
                              {followUp.priority ? ` · Priority ${followUp.priority}` : ''}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedFollowUp && (
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Linked follow-up details
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedFollowUp.priority && (
                          <Badge variant="outline" className="text-xs uppercase tracking-wide">
                            Priority {selectedFollowUp.priority}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                          {selectedFollowUp.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {selectedFollowUp.actionType} • {selectedFollowUp.actionDescription || 'No description provided'}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <CalendarDays className="h-3 w-3" />
                        {formatFollowUpDateTime(selectedFollowUp.followUpDate)}
                      </div>
                      {selectedFollowUp.notes && (
                        <p className="text-xs italic text-muted-foreground/90">
                          “{selectedFollowUp.notes}”
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>Link Type</Label>
                <Select value={formData.linkType} onValueChange={handleLinkTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MISC">Miscellaneous</SelectItem>
                    <SelectItem value="LEAD">Lead</SelectItem>
                    <SelectItem value="OPPORTUNITY">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.linkType === 'LEAD' && (
                <div className="md:col-span-2">
                  <Label>Select Lead</Label>
                  <Select value={formData.leadId} onValueChange={(value) => handleInputChange('leadId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadOptions.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formData.linkType === 'OPPORTUNITY' && (
                <div className="md:col-span-2">
                  <Label>Select Opportunity</Label>
                  <Select value={formData.opportunityId} onValueChange={(value) => handleInputChange('opportunityId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your opportunity" />
                    </SelectTrigger>
                    <SelectContent>
                      {opportunityOptions.map((opportunity) => (
                        <SelectItem key={opportunity.id} value={opportunity.id}>
                          {opportunity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="followUpType">Follow-up Type</Label>
                <Select value={formData.followUpType} onValueChange={(value) => handleInputChange('followUpType', value)}>
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
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
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
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(event) => handleInputChange('description', event.target.value)}
                placeholder="Brief description of the follow-up"
                required
              />
            </div>

            <div>
              <Label htmlFor="nextAction">Next Action</Label>
              <Input
                id="nextAction"
                value={formData.nextAction}
                onChange={(event) => handleInputChange('nextAction', event.target.value)}
                placeholder="What needs to be done next?"
                required
              />
            </div>

            <div>
              <Label htmlFor="nextActionDate">Next Action Date</Label>
              <Input
                id="nextActionDate"
                type="date"
                value={formData.nextActionDate}
                onChange={(event) => handleInputChange('nextActionDate', event.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(event) => handleInputChange('notes', event.target.value)}
                placeholder="Additional notes or context"
                rows={3}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
