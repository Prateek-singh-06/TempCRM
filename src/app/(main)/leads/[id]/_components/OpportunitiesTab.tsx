import React from 'react';
import { OpportunityCard } from './cards/OpportunityCard';

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

interface OpportunitiesTabProps {
  opportunities: Opportunity[];
}

export const OpportunitiesTab = ({ opportunities }: OpportunitiesTabProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mt-8">
      {opportunities.map((opportunity, index) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} index={index} />
      ))}
    </div>
  );
};
