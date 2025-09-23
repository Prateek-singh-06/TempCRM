import React from 'react';
import {
  Calendar,
  TrendingUp
} from 'lucide-react';
import { FloatingCard, AnimatedCounter, PulsingDot } from '../AnimatedComponents';

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
  notes?: string;
  channelUsed?: string;
  timeSpent?: number;
  responseReceived?: boolean;
  responseQuality?: string;
  nextActionDate?: string;
  createdBy?: string;
}

interface FollowUpCardProps {
  followUp: FollowUp;
  index: number;
}

export const FollowUpCard = ({ followUp, index }: FollowUpCardProps) => {
  return (
    <FloatingCard key={followUp.id} delay={1400 + (index * 200)} className="group">
      <div className="p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-300/10 to-red-300/10 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700"></div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-4 flex-1">
              <div className={`w-4 h-4 rounded-full mt-2 relative ${
                followUp.status === 'SCHEDULED' ? 'bg-yellow-500' :
                followUp.status === 'COMPLETED' ? 'bg-green-500' :
                'bg-red-500'
              }`}>
                {followUp.status === 'SCHEDULED' && (
                  <div className="absolute inset-0 bg-yellow-500 rounded-full animate-ping opacity-75"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-orange-600 group-hover:to-red-600 group-hover:bg-clip-text transition-all duration-500">
                  {followUp.actionDescription}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-gray-600 text-sm mb-4">
                  <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                    {followUp.actionType}
                  </span>
                  <span className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(followUp.followUpDate).toLocaleDateString('en-GB')}</span>
                  </span>
                  {followUp.stakeholders && (
                    <span className="text-xs text-gray-500">
                      {followUp.stakeholders}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right ml-4">
                <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text mb-2">
                  <AnimatedCounter value={followUp.priorityScore} />
                </div>
                <div className="text-gray-600 text-xs">Priority</div>
              </div>
            </div>
          </div>

          {followUp.expectedOutcome && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 mb-4">
              <label className="text-gray-600 text-xs font-medium">Expected Outcome</label>
              <p className="text-gray-900 text-sm mt-1">{followUp.expectedOutcome}</p>
            </div>
          )}

          {followUp.actualOutcome && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 mb-4">
              <label className="text-gray-600 text-xs font-medium">Actual Outcome</label>
              <p className="text-gray-900 text-sm mt-1">{followUp.actualOutcome}</p>
            </div>
          )}

          {followUp.notes && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4">
              <label className="text-gray-600 text-xs font-medium">Notes</label>
              <p className="text-gray-900 text-sm mt-1 leading-relaxed">{followUp.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              followUp.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
              followUp.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border border-green-200' :
              'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {followUp.status}
            </div>

            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              followUp.urgencyLevel === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
              followUp.urgencyLevel === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
              followUp.urgencyLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
              'bg-green-100 text-green-800 border border-green-200'
            }`}>
              {followUp.urgencyLevel}
            </div>
          </div>

          {followUp.completionQuality && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Execution Quality:</span>
                <span className="text-green-700 font-bold text-lg">{followUp.completionQuality}</span>
              </div>
            </div>
          )}

          {/* Additional details row */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {followUp.channelUsed && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-600 text-xs font-medium">Channel</span>
                <p className="text-gray-900 text-sm mt-1">{followUp.channelUsed}</p>
              </div>
            )}
            {typeof followUp.timeSpent === 'number' && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-600 text-xs font-medium">Time Spent</span>
                <p className="text-gray-900 text-sm mt-1">{followUp.timeSpent} min</p>
              </div>
            )}
            {typeof followUp.responseReceived === 'boolean' && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-600 text-xs font-medium">Response</span>
                <p className="text-gray-900 text-sm mt-1">{followUp.responseReceived ? 'Received' : 'Pending'}</p>
              </div>
            )}
            {followUp.responseQuality && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-600 text-xs font-medium">Response Quality</span>
                <p className="text-gray-900 text-sm mt-1">{followUp.responseQuality}</p>
              </div>
            )}
            {followUp.nextActionDate && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-600 text-xs font-medium">Next Action</span>
                <p className="text-gray-900 text-sm mt-1">{new Date(followUp.nextActionDate).toLocaleDateString('en-GB')}</p>
              </div>
            )}
            {followUp.createdBy && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-600 text-xs font-medium">Created By</span>
                <p className="text-gray-900 text-sm mt-1">{followUp.createdBy}</p>
              </div>
            )}
            {followUp.stakeholders && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 md:col-span-2">
                <span className="text-gray-600 text-xs font-medium">Stakeholders</span>
                <p className="text-gray-900 text-sm mt-1">{followUp.stakeholders}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </FloatingCard>
  );
};
