import React from 'react';
import { ActivityCard } from './cards/ActivityCard';

interface Activity {
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
}

interface ActivitiesTabProps {
  activities: Activity[];
}

export const ActivitiesTab = ({ activities }: ActivitiesTabProps) => {
  return (
    <div className="space-y-8 mt-8">
      {activities.map((activity, index) => (
        <ActivityCard key={activity.id} activity={activity} index={index} />
      ))}
    </div>
  );
};
