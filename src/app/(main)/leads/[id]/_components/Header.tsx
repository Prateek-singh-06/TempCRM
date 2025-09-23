import React from 'react';
import {
  User,
  Building2,
  Phone,
  Send,
  MoreHorizontal
} from 'lucide-react';
import { FloatingCard, GradientText, PulsingDot } from './AnimatedComponents';

interface LeadData {
  id: number;
  name: string;
  source: string;
  status: string;
  email?: string;
  phone?: string;
  note?: string;
  createdDate: string;
  autoQualificationScore?: number;
  budgetRange?: string;
  timeline?: string;
  painPoints?: string;
  qualificationStage: string;
  buyingProcessStage?: string;
  authorityLevel?: string;
  lastActivityDate?: string;
  nextFollowUpDate?: string;
  company: {
    id?: number;
    name: string;
    region: string;
    type: string;
    address?: string;
    website?: string;
    employees?: string;
    revenue?: string;
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
}

interface HeaderProps {
  lead: LeadData;
}

export const Header = ({ lead }: HeaderProps) => {
  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-500',
      contacted: 'bg-yellow-500',
      qualified: 'bg-green-500',
      proposal: 'bg-purple-500',
      negotiation: 'bg-orange-500',
      won: 'bg-emerald-500',
      lost: 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <FloatingCard delay={200} animationAllowed={false}>
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center space-x-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-gray-300">
                <span className="text-white">{lead.name.charAt(0)}</span>
              </div>
              <div className={`absolute -bottom-3 -right-3 ${getStatusColor(lead.status)} rounded-full border-4 border-white shadow-lg animate-bounce`}>
                <PulsingDot size="w-4 h-4" color="bg-white" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-5xl font-bold text-gray-900 mb-2 leading-tight">
                <GradientText gradient="from-blue-600 via-purple-600 to-indigo-600">
                  {lead.name}
                </GradientText>
              </h1>
              <div className="flex items-center space-x-6 text-gray-600">
                <div className="flex items-center space-x-2 group cursor-pointer">
                  <Building2 className="w-5 h-5 group-hover:text-blue-600 transition-colors duration-300" />
                  <span className="group-hover:text-gray-900 transition-colors duration-300">{lead.company.name}</span>
                </div>
                <div className="flex items-center space-x-2 group cursor-pointer">
                  <User className="w-5 h-5 group-hover:text-green-600 transition-colors duration-300" />
                  <span className="group-hover:text-gray-900 transition-colors duration-300">{lead.primaryContact.name}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200">
                  <span className="text-green-800 font-semibold text-sm">{lead.status}</span>
                </div>
                <div className="px-4 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full border border-blue-200">
                  <span className="text-blue-800 font-semibold text-sm">{lead.buyingProcessStage}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="group relative bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-white/20 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <Phone className="w-5 h-5 mr-3 inline relative z-10" />
              <span className="relative z-10 font-semibold">Call Now</span>
            </button>
            <button className="bg-gray-100 backdrop-blur-sm text-gray-700 px-6 py-4 rounded-2xl hover:bg-gray-200 transition-all duration-300 border border-gray-300 group">
              <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
            </button>
            <button className="bg-gray-100 backdrop-blur-sm text-gray-700 px-6 py-4 rounded-2xl hover:bg-gray-200 transition-all duration-300 border border-gray-300 group">
              <MoreHorizontal className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </FloatingCard>
  );
};
