import React from 'react';
import { User, Mail, Phone, Eye, Briefcase, Calendar, CheckCircle2, Activity, Clock } from 'lucide-react';
import { FloatingCard, GradientText, PulsingDot } from './AnimatedComponents';

// Assuming these components exist in your project - you may need to check their actual import paths
// import { FloatingCard, GradientText, PulsingDot } from '../path/to/components';

interface ContactTimelineProps {
  // Define the lead prop type based on the usage in the component
  lead: {
    primaryContact: {
      name: string;
      role: string;
      lastInteraction: string;
      email: string;
      phone: string;
      engagementLevel: string;
      influenceLevel: string;
    };
    createdDate?: string;
    lastActivityDate?: string;
    nextFollowUpDate?: string;
  };
}

export function ContactTimeline({ lead }: ContactTimelineProps) {
  return (
    <div className="space-y-8">
        <FloatingCard delay={1800}>
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-green-100 rounded-xl">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                <GradientText gradient="from-green-600 to-blue-600">Key Stakeholder</GradientText>
              </h3>
            </div>

            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-2xl shadow-gray-300">
                  <span>{lead.primaryContact.name.charAt(0)}</span>
                </div>
                <div className="absolute -bottom-2 -right-2">
                  <PulsingDot color="bg-green-400" size="w-6 h-6" />
                </div>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">{lead.primaryContact.name}</h4>
              <p className="text-gray-600 text-lg">{lead.primaryContact.role}</p>
              <p className="text-green-600 text-sm mt-1">Active {lead.primaryContact.lastInteraction}</p>
            </div>

            <div className="space-y-4">
              <div className="group flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                <Mail className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
                <div className="flex-1">
                  <p className="text-gray-900 group-hover:text-blue-800 transition-colors duration-300">{lead.primaryContact.email}</p>
                  <p className="text-xs text-gray-500">Primary Communication</p>
                </div>
              </div>

              <div className="group flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 border border-gray-200">
                <Phone className="w-5 h-5 text-gray-600 group-hover:text-green-600 transition-colors duration-300" />
                <div className="flex-1">
                  <p className="text-gray-900 group-hover:text-green-800 transition-colors duration-300">{lead.primaryContact.phone}</p>
                  <p className="text-xs text-gray-500">Direct Line</p>
                </div>
                <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-600 flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Engagement</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-700 font-bold">{lead.primaryContact.engagementLevel}</span>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-600 flex items-center space-x-2">
                  <Briefcase className="w-4 h-4" />
                  <span>Authority</span>
                </span>
                <span className="text-red-700 font-bold">{lead.primaryContact.influenceLevel}</span>
              </div>
            </div>
          </div>
        </FloatingCard>

        {/* Timeline */}
        <FloatingCard delay={2000}>
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-orange-100 rounded-xl">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                <GradientText gradient="from-orange-600 to-red-600">Timeline</GradientText>
              </h3>
            </div>

            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-blue-500 to-yellow-500"></div>

              <div className="space-y-8">
                <div className="flex items-start space-x-6 relative group">
                  <div className="w-12 h-12 bg-green-500 rounded-full border-4 border-white shadow-lg shadow-green-300/30 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-gray-900 font-bold text-lg group-hover:text-green-700 transition-colors duration-300">Lead Generated</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {lead.createdDate ? new Date(lead.createdDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown Date'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Initial qualification completed</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6 relative group">
                  <div className="w-12 h-12 bg-blue-500 rounded-full border-4 border-white shadow-lg shadow-blue-300/30 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-gray-900 font-bold text-lg group-hover:text-blue-700 transition-colors duration-300">Last Engagement</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {lead.lastActivityDate ? new Date(lead.lastActivityDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown Date'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Executive strategy session</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6 relative group">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full border-4 border-white shadow-lg shadow-yellow-300/30 group-hover:scale-110 transition-transform duration-300 relative z-10 animate-pulse">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-gray-900 font-bold text-lg group-hover:text-yellow-700 transition-colors duration-300">Next Milestone</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown Date'}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">Board presentation scheduled</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FloatingCard>
      </div>
  );
}
