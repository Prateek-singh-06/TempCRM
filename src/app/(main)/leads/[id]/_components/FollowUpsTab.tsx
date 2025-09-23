import React from 'react';
import { FollowUpCard } from './cards/FollowUpCard';

interface FollowUp {
  id: number;
  actionType?: string;
  actionDescription: string;
  status: string;
  followUpDate: string;
  urgencyLevel: string;
  priorityScore: number;
  expectedOutcome?: string;
  actualOutcome?: string;
  stakeholders?: string;
  completionQuality?: string;
}

interface FollowUpsTabProps {
  dailyFollowUps: FollowUp[];
}

export const FollowUpsTab = ({ dailyFollowUps }: FollowUpsTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
      {dailyFollowUps.map((followUp, index) => (
        <FollowUpCard key={followUp.id} followUp={followUp} index={index} />
      ))}
    </div>
  );
};
