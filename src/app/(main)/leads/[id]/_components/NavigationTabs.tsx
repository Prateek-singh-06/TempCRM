import React from 'react';
import {
  Target,
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { FloatingCard } from './AnimatedComponents';

interface NavigationTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  opportunitiesLength: number;
  activitiesLength: number;
  scheduledFollowUps: number;
}

export const NavigationTabs = ({ activeTab, setActiveTab, opportunitiesLength, activitiesLength, scheduledFollowUps }: NavigationTabsProps) => {
  return (
    <FloatingCard delay={1200} animationAllowed={false}>
      <div className="p-2">
        <div className="flex space-x-2">
          {[
            { id: 'overview', label: 'Overview', icon: Target, badge: null, color: 'from-blue-500 to-purple-600' },
            { id: 'opportunities', label: 'Opportunities', icon: TrendingUp, badge: opportunitiesLength, color: 'from-green-500 to-emerald-600' },
            { id: 'activities', label: 'Activities', icon: Activity, badge: activitiesLength, color: 'from-purple-500 to-pink-600' },
            { id: 'follow-ups', label: 'Follow-ups', icon: CheckCircle2, badge: scheduledFollowUps, color: 'from-orange-500 to-red-600' }
          ].map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-3 px-8 py-4 rounded-2xl transition-all duration-500 transform ${activeTab === tab.id ? `bg-gradient-to-r ${tab.color} text-white shadow-2xl scale-105 shadow-blue-500/25` : 'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:scale-102'} border border-gray-300 group overflow-hidden`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/50 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Icon className={`w-6 h-6 relative z-10 ${activeTab === tab.id ? 'animate-pulse' : 'group-hover:scale-110'} transition-transform duration-300`} />
                <span className="font-semibold relative z-10">{tab.label}</span>
                {tab.badge && (
                  <div className="relative z-10">
                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse font-bold">
                      {tab.badge}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </FloatingCard>
  );
};
