"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from './_components/Header';
import { KeyMetrics } from './_components/KeyMetrics';
import { NavigationTabs } from './_components/NavigationTabs';
import { OverviewTab } from './_components/OverviewTab';
import { OpportunitiesTab } from './_components/OpportunitiesTab';
import { ActivitiesTab } from './_components/ActivitiesTab';
import { FollowUpsTab } from './_components/FollowUpsTab';
import { LeadTimeline } from './_components/LeadTimeline';

// Type definitions for API responses
interface LeadData {
  id: number;
  name: string;
  source: string;
  status: string;
  email?: string;
  phone?: string;
  note?: string;
  createdDate: string;
  leadScore: number;
  engagementScore: number;
  autoQualificationScore?: number;
  budgetRange?: string;
  timeline?: string;
  painPoints?: string;
  qualificationStage: string;
  buyingProcessStage?: string;
  authorityLevel?: string;
  lastActivityDate?: string;
  nextFollowUpDate?: string;
  eventDetails?: string;
  company: {
    id?: number;
    name: string;
    region: string;
    type: string;
    address?: string;
    website?: string;
    contacts: any[];
  };
  primaryContact: {
    id: number;
    name: string;
    role: string;
    email?: string;
    phone?: string;
    engagementLevel: string;
    influenceLevel?: string;
    lastInteraction?: string;
  };
  opportunities: Array<{
    id: number;
    name: string;
    stage: string;
    dealSize: number;
    probability: number;
    expectedCloseDate?: string;
    sizeDI?: string;
    quantity?: number;
    status?: string;
    riskLevel?: string;
    competition?: string;
    lastActivityDate?: string;
  }>;
  activities: Array<{
    id: number;
    type: string;
    subject: string;
    description?: string;
    occurredAt: string;
    duration?: number;
    outcome?: string;
    activityScore?: number;
    sentiment?: string;
    attendees?: number;
    followUpScheduled?: boolean;
  }>;
  dailyFollowUps: Array<{
    id: number;
    actionType?: string;
    actionDescription: string;
    status: string;
    followUpDate: string;
    priorityScore: number;
    urgencyLevel: string;
    expectedOutcome?: string;
    actualOutcome?: string;
    completionQuality?: string;
    stakeholders?: string;
    notes?: string;
    channelUsed?: string;
    timeSpent?: number;
    responseReceived?: boolean;
    responseQuality?: string;
    nextActionDate?: string;
    createdBy?: string;
  }>;
}

// Enhanced Mock Data
const mockLeadData = {
  id: 1,
  name: "Premium Infrastructure Pipeline Project",
  source: "Event",
  status: "qualified",
  eventDetails: "Tech Conference 2025, Booth #15, Met at networking session - Discussed smart infrastructure solutions and IoT monitoring capabilities",
  email: "sarah.chen@megacorp.com",
  phone: "+1 (555) 987-6543",
  note: "High-value prospect interested in comprehensive water infrastructure modernization across multiple facilities. Executive-level decision maker with immediate budget approval authority.",
  createdDate: "2024-01-15T10:30:00Z",
  leadScore: 94,
  engagementScore: 87,
  autoQualificationScore: 92,
  budgetRange: "$5M - $15M",
  timeline: "Q1 2025 Implementation",
  painPoints: "Legacy infrastructure causing 40% efficiency loss, regulatory compliance issues, and escalating maintenance costs threatening operations",
  qualificationStage: "PROPOSAL",
  buyingProcessStage: "NEGOTIATING",
  authorityLevel: "DECISION_MAKER",
  lastActivityDate: "2024-09-12T16:30:00Z",
  nextFollowUpDate: "2024-09-17T10:00:00Z",
  company: {
    id: 1,
    name: "MegaCorp Industries",
    region: "North America - East Coast",
    type: "Fortune 500 Manufacturing",
    address: "500 Corporate Plaza, Innovation District, NYC 10001",
    website: "https://megacorp.com",
    employees: "50,000+",
    revenue: "$12.5B",
    contacts: []
  },
  primaryContact: {
    id: 1,
    name: "Sarah Chen",
    role: "VP of Infrastructure & Operations",
    email: "sarah.chen@megacorp.com",
    phone: "+1 (555) 987-6543",
    engagementLevel: "VIP",
    influenceLevel: "DECISION_MAKER",
    linkedin: "linkedin.com/in/sarahchen",
    lastInteraction: "2 days ago"
  },
  opportunities: [
    {
      id: 1,
      name: "Primary Infrastructure Overhaul",
      stage: "NEGOTIATION",
      dealSize: 8500000,
      probability: 85,
      expectedCloseDate: "2024-11-30T00:00:00Z",
      sizeDI: "DN1000; DN800; DN600; DN400",
      quantity: 3500,
      status: "Final proposal review - decision expected by month-end",
      riskLevel: "LOW",
      competition: "2 competitors remaining"
    },
    {
      id: 2,
      name: "Smart Monitoring System Integration",
      stage: "PROPOSAL",
      dealSize: 1200000,
      probability: 70,
      expectedCloseDate: "2024-12-15T00:00:00Z",
      sizeDI: "IoT Sensors & Analytics",
      quantity: 500,
      status: "Technical evaluation phase",
      riskLevel: "MEDIUM",
      competition: "Sole provider consideration"
    },
    {
      id: 3,
      name: "5-Year Maintenance Partnership",
      stage: "QUALIFICATION",
      dealSize: 2800000,
      probability: 60,
      expectedCloseDate: "2025-02-28T00:00:00Z",
      sizeDI: "Service Contract",
      quantity: 0,
      status: "Long-term partnership discussion",
      riskLevel: "LOW",
      competition: "Preferred vendor status"
    }
  ],
  activities: [
    {
      id: 1,
      type: "MEETING",
      subject: "Executive Strategy Session",
      description: "Comprehensive infrastructure roadmap discussion with C-level executives. Presented ROI analysis and implementation timeline.",
      occurredAt: "2024-09-12T14:00:00Z",
      duration: 90,
      outcome: "Exceptional - Received preliminary approval for full proposal. CEO expressed strong interest.",
      activityScore: 9.4,
      sentiment: "POSITIVE",
      attendees: 8,
      followUpScheduled: true
    },
    {
      id: 2,
      type: "DEMO",
      subject: "Smart Infrastructure Technology Demo",
      description: "Live demonstration of IoT monitoring capabilities and predictive maintenance features.",
      occurredAt: "2024-09-08T10:30:00Z",
      duration: 120,
      outcome: "Outstanding reception - Technical team impressed with innovation capabilities",
      activityScore: 9.1,
      sentiment: "POSITIVE",
      attendees: 12,
      followUpScheduled: true
    },
    {
      id: 3,
      type: "CALL",
      subject: "Proposal Clarification Call",
      description: "Addressed technical specifications and timeline concerns from procurement team.",
      occurredAt: "2024-09-10T15:15:00Z",
      duration: 35,
      outcome: "Positive - All concerns addressed satisfactorily",
      activityScore: 8.2,
      sentiment: "POSITIVE",
      attendees: 4,
      followUpScheduled: false
    }
  ],
  dailyFollowUps: [
    {
      id: 1,
      actionType: "MEETING",
      actionDescription: "Final proposal presentation to board of directors",
      status: "SCHEDULED",
      followUpDate: "2024-09-17T14:00:00Z",
      urgencyLevel: "CRITICAL",
      priorityScore: 10,
      expectedOutcome: "Board approval for contract signing",
      stakeholders: "Board of Directors, CEO, CFO"
    },
    {
      id: 2,
      actionType: "EMAIL",
      actionDescription: "Send detailed implementation timeline and resource allocation plan",
      status: "SCHEDULED",
      followUpDate: "2024-09-16T09:00:00Z",
      urgencyLevel: "HIGH",
      priorityScore: 9,
      expectedOutcome: "Timeline approval and resource confirmation"
    },
    {
      id: 3,
      actionType: "CALL",
      actionDescription: "Technical integration discussion with IT leadership",
      status: "COMPLETED",
      followUpDate: "2024-09-13T11:00:00Z",
      urgencyLevel: "MEDIUM",
      priorityScore: 7,
      completionQuality: "EXCELLENT",
      actualOutcome: "Integration plan approved, no technical blockers identified"
    }
  ],
  insights: {
    momentum: "ACCELERATING",
    riskFactors: ["Budget cycle timing", "Competitor positioning"],
    successFactors: ["Executive buy-in", "Technical superiority", "Established relationship"],
    nextMilestones: ["Board presentation", "Contract negotiation", "Implementation planning"]
  }
};

const LeadDetailPage = () => {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [lead, setLead] = useState<LeadData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const leadId = (params.id as string);
      const response = await fetch(`/api/leads/${leadId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch lead: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Fetched lead data:', result);

      // Transform API data to match component structure
      const transformedData: LeadData = {
        id: result.lead.id,
        name: result.lead.name,
        source: result.lead.source,
        status: result.lead.status,
        email: result.lead.email,
        phone: result.lead.phone,
        note: result.lead.note,
        createdDate: result.lead.createdDate,
        leadScore: result.lead.leadScore,
        engagementScore: result.lead.engagementScore,
        autoQualificationScore: result.lead.autoQualificationScore,
        budgetRange: result.lead.budgetRange,
        timeline: result.lead.timeline,
        painPoints: result.lead.painPoints,
        qualificationStage: result.lead.qualificationStage,
        buyingProcessStage: result.lead.buyingProcessStage,
        authorityLevel: result.lead.authorityLevel,
        lastActivityDate: result.lead.lastActivityDate,
        nextFollowUpDate: result.lead.nextFollowUpDate,
        eventDetails: result.lead.eventDetails,
        company: result.lead.companies || {
          name: 'Unknown Company',
          region: 'Unknown Region',
          type: 'Unknown Type',
          address: null,
          website: null,
          contacts: []
        },
        primaryContact: (result.lead.companies.contacts && result.lead.companies.contacts.length > 0 && result.lead.companies.contacts[0]) ? {
          id: result.lead.companies.contacts[0].id,
          name: result.lead.companies.contacts[0].name,
          role: result.lead.companies.contacts[0].role,
          email: result.lead.companies.contacts[0].email || undefined,
          phone: result.lead.companies.contacts[0].phone || undefined,
          engagementLevel: result.lead.companies.contacts[0].engagementLevel || 'LOW',
          influenceLevel: result.lead.companies.contacts[0].influenceLevel || undefined,
          lastInteraction: result.lead.companies.contacts[0].lastInteraction ?
            Math.floor((new Date().getTime() - new Date(result.lead.companies.contacts[0].lastInteraction).getTime()) / (1000 * 60 * 60 * 24)) + ' days ago' :
            undefined
        } : {
          id: 0,
          name: 'No Primary Contact',
          role: 'Unknown',
          email: undefined,
          phone: undefined,
          engagementLevel: 'LOW',
          influenceLevel: undefined,
          lastInteraction: undefined
        },
        opportunities: result.lead.opportunities || [],
        activities: result.lead.activities || [],
        dailyFollowUps: (result.lead.daily_follow_ups || []).map((f: any) => ({
          id: f.id,
          actionType: f.actionType,
          actionDescription: f.actionDescription,
          status: f.status,
          followUpDate: f.followUpDate,
          urgencyLevel: f.urgencyLevel,
          priorityScore: f.priorityScore,
          expectedOutcome: f.expectedOutcome,
          actualOutcome: f.actualOutcome,
          completionQuality: f.completionQuality,
          stakeholders: [f?.companies?.name, f?.contacts?.name].filter(Boolean).join(', ') || undefined,
          notes: f.notes,
          channelUsed: f.channelUsed,
          timeSpent: f.timeSpent,
          responseReceived: f.responseReceived,
          responseQuality: f.responseQuality,
          nextActionDate: f.nextActionDate,
          createdBy: f?.users?.name,
        }))
      };

      setLead(transformedData);
      console.log('Transformed lead data:', transformedData);
    } catch (err) {
      console.error('Error fetching lead data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch lead data');

      // Fallback to mock data if API fails
      console.log('Falling back to mock data');
      setLead(mockLeadData as LeadData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadData();
  }, []);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading lead details...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-red-200">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load lead data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-blue-400/8 to-indigo-400/8 rounded-full animate-spin-slow"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-purple-400/8 to-pink-400/8 rounded-full animate-reverse-spin"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-indigo-300/5 to-blue-300/5 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-l from-purple-300/5 to-pink-300/5 rounded-full animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Header lead={lead} />
              <KeyMetrics lead={lead} />
              <NavigationTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                opportunitiesLength={lead.opportunities.length}
                activitiesLength={lead.activities.length}
                scheduledFollowUps={lead.dailyFollowUps.filter(f => f.status === 'SCHEDULED').length}
              />

              {/* Tab Content */}
              {activeTab === 'overview' && <OverviewTab lead={lead} />}
              {activeTab === 'opportunities' && <OpportunitiesTab opportunities={lead.opportunities} />}
              {activeTab === 'activities' && <ActivitiesTab activities={lead.activities} />}
              {activeTab === 'follow-ups' && <FollowUpsTab dailyFollowUps={lead.dailyFollowUps} />}
            </div>

            {/* Right Side - Timeline */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <LeadTimeline lead={lead} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        .animate-reverse-spin {
          animation: reverse-spin 25s linear infinite;
        }

        .hover\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default LeadDetailPage;
