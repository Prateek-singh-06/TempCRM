import React from 'react';
import {
  FileText,
  Building2,
  Sparkles,
  DollarSign,
  Clock,
  Award,
  BarChart3,
  Shield,
  User,
  Mail,
  Phone,
  Eye,
  Briefcase,
  CheckCircle2,
  Activity,
  Calendar
} from 'lucide-react';
import { FloatingCard, GradientText, PulsingDot } from './AnimatedComponents';

interface LeadData {
  source: string;
  budgetRange?: string;
  timeline?: string;
  qualificationStage: string;
  buyingProcessStage?: string;
  authorityLevel?: string;
  status: string;
  note?: string;
  eventDetails?: string;
  
  company: {
    name: string;
    type: string;
    region: string;
    employees?: string;
    revenue?: string;
    website?: string;
    address?: string;
  };
  primaryContact: {
    name: string;
    role: string;
    email?: string;
    phone?: string;
    engagementLevel: string;
    influenceLevel?: string;
    lastInteraction?: string;
  };
  painPoints?: string;
  lastActivityDate?: string;
  nextFollowUpDate?: string;
  createdDate: string;
}

interface OverviewTabProps {
  lead: LeadData;
}

export const OverviewTab = ({ lead }: OverviewTabProps) => {
  return (
    <div className="gap-8 mt-8">
      {/* Lead Information */}
      <div className="space-y-8">
        <FloatingCard delay={1400}>
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-blue-100 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">
                <GradientText gradient="from-blue-600 to-purple-600">Lead Intelligence</GradientText>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium flex items-center space-x-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Lead Source</span>
                  </label>
                  <p className="text-gray-900 text-lg mt-2 group-hover:text-blue-800 transition-colors duration-300">{lead.source}</p>
                </div>

                {/* Event Details - Only show when source is Event */}
                {lead.source === "Event" && lead.eventDetails && (
                  <div className="group p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl hover:from-pink-100 hover:to-purple-100 transition-all duration-300 border border-pink-200">
                    <label className="text-gray-600 text-sm font-medium flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Event Details</span>
                    </label>
                    <p className="text-gray-900 text-lg mt-2 group-hover:text-purple-800 transition-colors duration-300 leading-relaxed">{lead.eventDetails}</p>
                  </div>
                )}
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Next Followup Date</span>
                  </label>
                  {lead.nextFollowUpDate ? (() => {
                    const nextDate = new Date(lead.nextFollowUpDate);
                    const today = new Date();
                    // Remove time part for comparison
                    nextDate.setHours(0,0,0,0);
                    today.setHours(0,0,0,0);
                    const isOverdue = nextDate < today;
                    return (
                      <div className="flex items-center space-x-3 mt-2">
                        <p className={`text-lg group-hover:text-green-800 transition-colors duration-300 ${isOverdue ? 'text-red-600 group-hover:text-red-800' : 'text-gray-900'}`}>{nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        {isOverdue && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-300">Overdue</span>
                        )}
                      </div>
                    );
                  })() : (
                    <p className="text-gray-900 text-lg mt-2 group-hover:text-green-800 transition-colors duration-300">N/A</p>
                  )}
                </div>
                
              </div>
              <div className="space-y-6">
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium flex items-center space-x-2">
                    <Award className="w-4 h-4" />
                    <span>Qualification Level</span>
                  </label>
                  <div className="flex items-center space-x-3 mt-2">
                    <p className="text-gray-900 text-lg group-hover:text-green-800 transition-colors duration-300">{lead.status}</p>
                    <div className="px-2 py-1 bg-green-100 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Created Date</span>
                  </label>
                  <p className="text-gray-900 text-lg mt-2 group-hover:text-green-800 transition-colors duration-300">{new Date(lead.createdDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
               
              </div>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-200">
              <label className="text-gray-600 text-sm font-medium flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Critical Pain Points</span>
              </label>
              <p className="text-gray-900 text-lg mt-3 leading-relaxed">{lead.painPoints}</p>
            </div>
          </div>
        </FloatingCard>

        {/* Company Information */}
        <FloatingCard delay={1600}>
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">
                <GradientText gradient="from-purple-600 to-pink-600">Enterprise Profile</GradientText>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium">Organization</label>
                  <p className="text-gray-900 text-lg mt-1 group-hover:text-purple-800 transition-colors duration-300">{lead.company.name}</p>
                </div>
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium">Industry Sector</label>
                  <p className="text-gray-900 text-lg mt-1 group-hover:text-blue-800 transition-colors duration-300">{lead.company.type}</p>
                </div>
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium">Global Presence</label>
                  <p className="text-gray-900 text-lg mt-1 group-hover:text-green-800 transition-colors duration-300">{lead.company.region}</p>
                </div>
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium">Corporate Website</label>
                  <a href={lead.company.website} className="text-blue-600 text-lg hover:text-blue-800 hover:underline transition-all duration-300 block mt-1">
                    {lead.company.website}
                  </a>
                </div>
              </div>
               
              <div className="space-y-6">
                
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium">Primary Contact Name</label>
                  <p className="text-gray-900 text-lg mt-1 group-hover:text-emerald-800 transition-colors duration-300">{lead.primaryContact.name} </p>
                </div>
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium">Primary Contact Email</label>
                  <p className="text-gray-900 text-lg mt-1 group-hover:text-emerald-800 transition-colors duration-300">{lead.primaryContact.email ?? "N/A"}</p>
                </div>
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium">Primary Contact Phone</label>
                  <p className="text-gray-900 text-lg mt-1 group-hover:text-emerald-800 transition-colors duration-300">{lead.primaryContact.phone ?? "N/A"}</p>
                </div>
               
                <div className="group p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                  <label className="text-gray-600 text-sm font-medium">Address</label>
                  <p className="text-gray-900 text-lg mt-1 group-hover:text-yellow-800 transition-colors duration-300">{lead.company.address ?? "N/A"}</p>
                </div>
              </div>
              
            </div>
          </div>
        </FloatingCard>
      </div>

      {/* Contact Information & Insights */}
      
    </div>
  );
};
