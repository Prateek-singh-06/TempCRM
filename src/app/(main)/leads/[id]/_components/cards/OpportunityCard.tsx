import React from 'react';
import {
  Calendar,
  TrendingUp
} from 'lucide-react';
import { FloatingCard, AnimatedCounter, ProgressRing } from '../AnimatedComponents';

interface Opportunity {
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
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  index: number;
}

export const OpportunityCard = ({ opportunity, index }: OpportunityCardProps) => {
  const getRiskColor = (risk: string) => {
    const colors = {
      LOW: 'text-green-600 bg-green-100',
      MEDIUM: 'text-yellow-600 bg-yellow-100',
      HIGH: 'text-red-600 bg-red-100',
      CRITICAL: 'text-red-500 bg-red-100'
    };
    return colors[risk as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  return (
    <FloatingCard key={opportunity.id} delay={1400 + (index * 200)} className="group">
      <div className="p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-300/10 to-pink-300/10 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700"></div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text transition-all duration-500">
                {opportunity.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-2 rounded-full text-sm border border-blue-200 group-hover:from-blue-200 group-hover:to-purple-200 transition-all duration-300">
                  {opportunity.stage}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(opportunity.riskLevel || 'MEDIUM')}`}>
                  {opportunity.riskLevel || 'MEDIUM'} Risk
                </span>
              </div>
              <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text mb-2">
                <AnimatedCounter value={opportunity.dealSize} prefix="$" />
              </div>
              <p className="text-gray-600 text-sm">{opportunity.competition}</p>
            </div>

            <div className="text-right ml-4">
              <div className="relative">
                <ProgressRing percentage={opportunity.probability} size={80} color="#8b5cf6" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 group-hover:bg-gray-100 transition-all duration-300">
                <label className="text-gray-600 text-xs font-medium">Specifications</label>
                <p className="text-gray-900 text-sm mt-1">{opportunity.sizeDI}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 group-hover:bg-gray-100 transition-all duration-300">
                <label className="text-gray-600 text-xs font-medium">Volume</label>
                <p className="text-gray-900 text-sm mt-1">{opportunity.quantity ? `${opportunity.quantity} MT` : 'Service Contract'}</p>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
              <label className="text-gray-600 text-xs font-medium flex items-center space-x-2">
                <Calendar className="w-3 h-3" />
                <span>Target Close Date</span>
              </label>
              <p className="text-gray-900 font-semibold mt-1">
                {opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'Not specified'}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="text-gray-600 text-xs font-medium">Current Status</label>
              <p className="text-gray-900 text-sm mt-2 leading-relaxed">{opportunity.status}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-medium">Win Probability</span>
              <span className="text-gray-900 text-sm font-bold">{opportunity.probability}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full animate-pulse"
                style={{ width: `${opportunity.probability}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </FloatingCard>
  );
};
