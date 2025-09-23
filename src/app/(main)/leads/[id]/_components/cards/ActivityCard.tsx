import React from 'react';
import {
  Calendar,
  Clock,
  Users
} from 'lucide-react';
import { FloatingCard, AnimatedCounter, GradientText } from '../AnimatedComponents';

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

interface ActivityCardProps {
  activity: Activity;
  index: number;
}

export const ActivityCard = ({ activity, index }: ActivityCardProps) => {
  return (
    <FloatingCard key={activity.id} delay={1400 + (index * 200)} className="group">
      <div className="p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-300/10 to-blue-300/10 rounded-full transform translate-x-20 -translate-y-20 group-hover:scale-150 transition-transform duration-700"></div>

        <div className="flex items-start space-x-8 relative z-10">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-300/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative overflow-hidden">
              <span className="text-white text-xl font-bold">{activity.type.charAt(0)}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          </div>

          <div className="flex-grow">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-blue-600 group-hover:bg-clip-text transition-all duration-500">
                  {activity.subject}
                </h3>
                <div className="flex items-center space-x-6 text-gray-600 text-sm mb-4">
                  <span className="bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-800 px-4 py-2 rounded-full border border-cyan-200">
                    {activity.type}
                  </span>
                  <span className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(activity.occurredAt).toLocaleDateString()}</span>
                  </span>
                  <span className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{activity.duration} minutes</span>
                  </span>
                  <span className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{activity.attendees} attendees</span>
                  </span>
                </div>
              </div>

              <div className="text-right ml-6">
                <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text mb-2">
                  <AnimatedCounter value={(activity.activityScore ?? 0) * 10} suffix="/100" />
                </div>
                <div className="text-gray-600 text-sm">Impact Score</div>
              </div>
            </div>

            <p className="text-gray-600 mb-6 text-lg leading-relaxed">{activity.description}</p>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
              <div className="flex-1">
                <span className="text-gray-600 text-sm font-medium">Outcome: </span>
                <span className="text-gray-900 text-lg font-semibold">{activity.outcome}</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  activity.sentiment === 'POSITIVE' ? 'bg-green-100 text-green-800 border border-green-200' :
                  activity.sentiment === 'NEUTRAL' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                  'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {activity.sentiment}
                </div>
                {activity.followUpScheduled && (
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs border border-blue-200 animate-pulse">
                    Follow-up Scheduled
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FloatingCard>
  );
};
