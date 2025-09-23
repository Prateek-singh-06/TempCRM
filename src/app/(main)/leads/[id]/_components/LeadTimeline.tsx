import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Activity,
  Clock,
  TrendingUp,
  Users,
  Mail,
  Phone,
  FileText,
  Target,
  DollarSign,
  AlertCircle,
  Star,
  MessageSquare
} from 'lucide-react';
import { FloatingCard, GradientText, PulsingDot } from './AnimatedComponents';

interface TimelineEvent {
  id: string;
  type: 'lead_created' | 'activity' | 'opportunity' | 'followup' | 'status_change' | 'milestone';
  title: string;
  description: string;
  date: string;
  icon: React.ReactNode;
  color: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface LeadTimelineProps {
  lead: {
    id: number;
    name: string;
    source: string;
    status: string;
    createdDate: string;
    leadScore: number;
    engagementScore: number;
    qualificationStage: string;
    buyingProcessStage?: string;
    lastActivityDate?: string;
    nextFollowUpDate?: string;
    opportunities: Array<{
      id: number;
      name: string;
      stage: string;
      dealSize: number;
      probability: number;
      expectedCloseDate?: string;
      createdAt?: string;
    }>;
    activities: Array<{
      id: number;
      type: string;
      subject: string;
      description?: string;
      occurredAt: string;
      outcome?: string;
      activityScore?: number;
    }>;
    dailyFollowUps: Array<{
      id: number;
      actionType?: string;
      actionDescription: string;
      status: string;
      followUpDate: string;
      urgencyLevel: string;
      priorityScore: number;
      expectedOutcome?: string;
      actualOutcome?: string;
    }>;
  };
}

export function LeadTimeline({ lead }: LeadTimelineProps) {
  // Generate timeline events from lead data
  const generateTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Lead creation event
    events.push({
      id: 'lead_created',
      type: 'lead_created',
      title: 'Lead Created',
      description: `Lead generated from ${lead.source} with initial score of ${lead.leadScore}`,
      date: lead.createdDate,
      icon: <Star className="w-4 h-4" />,
      color: 'bg-blue-500',
      priority: 'high'
    });

    // Add activities
    lead.activities.forEach(activity => {
      events.push({
        id: `activity_${activity.id}`,
        type: 'activity',
        title: activity.subject,
        description: activity.description || `${activity.type} activity completed`,
        date: activity.occurredAt,
        icon: <Activity className="w-4 h-4" />,
        color: 'bg-green-500',
        priority: activity.activityScore && activity.activityScore > 8 ? 'high' : 'medium'
      });
    });

    // Add opportunities
    lead.opportunities.forEach(opportunity => {
      events.push({
        id: `opportunity_${opportunity.id}`,
        type: 'opportunity',
        title: `Opportunity: ${opportunity.name}`,
        description: `$${opportunity.dealSize.toLocaleString()} opportunity created with ${opportunity.probability}% probability`,
        date: opportunity.createdAt || lead.createdDate,
        icon: <Target className="w-4 h-4" />,
        color: 'bg-purple-500',
        priority: opportunity.probability > 70 ? 'high' : 'medium'
      });
    });

    // Add follow-ups
    lead.dailyFollowUps.forEach(followup => {
      events.push({
        id: `followup_${followup.id}`,
        type: 'followup',
        title: followup.actionDescription,
        description: followup.expectedOutcome || `Priority: ${followup.urgencyLevel}`,
        date: followup.followUpDate,
        icon: followup.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />,
        color: followup.status === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500',
        priority: followup.urgencyLevel === 'CRITICAL' ? 'critical' :
                 followup.urgencyLevel === 'HIGH' ? 'high' : 'medium'
      });
    });

    // Add qualification milestones
    if (lead.qualificationStage) {
      events.push({
        id: 'qualification_stage',
        type: 'milestone',
        title: `Qualification: ${lead.qualificationStage}`,
        description: `Lead reached ${lead.qualificationStage} qualification stage`,
        date: lead.lastActivityDate || lead.createdDate,
        icon: <TrendingUp className="w-4 h-4" />,
        color: 'bg-indigo-500',
        priority: 'high'
      });
    }

    // Add next follow-up if exists
    if (lead.nextFollowUpDate) {
      events.push({
        id: 'next_followup',
        type: 'followup',
        title: 'Next Scheduled Follow-up',
        description: 'Upcoming follow-up action planned',
        date: lead.nextFollowUpDate,
        icon: <Calendar className="w-4 h-4" />,
        color: 'bg-orange-500',
        priority: 'high'
      });
    }

    // Sort events by date (most recent first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const timelineEvents = generateTimelineEvents();

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-gray-500 bg-gray-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="space-y-6">
      <FloatingCard delay={0}>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              <GradientText gradient="from-blue-600 to-purple-600">Lead Timeline</GradientText>
            </h3>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            {timelineEvents.length} events • Last updated {formatDate(lead.lastActivityDate || lead.createdDate)}
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-indigo-500"></div>

            <div className="space-y-6">
              {timelineEvents.slice(0, 10).map((event, index) => (
                <div key={event.id} className="flex items-start space-x-4 relative group">
                  {/* Timeline dot */}
                  <div className={`w-12 h-12 ${event.color} rounded-full border-4 border-white shadow-lg flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                    {event.icon}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className={`p-4 rounded-xl border-2 transition-all duration-300 group-hover:shadow-lg ${getPriorityColor(event.priority)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900 group-hover:text-blue-800 transition-colors duration-300">
                          {event.title}
                        </h4>
                        {event.priority === 'critical' && (
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-2" />
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-2">{event.description}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(event.date)}</span>
                        </span>
                        {event.priority && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            event.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {timelineEvents.length > 10 && (
              <div className="text-center mt-6">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View all {timelineEvents.length} events
                </button>
              </div>
            )}
          </div>
        </div>
      </FloatingCard>

      {/* Quick Stats */}
      <FloatingCard delay={200}>
        <div className="p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-800">{lead.activities.length}</div>
              <div className="text-xs text-blue-600">Activities</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-800">{lead.opportunities.length}</div>
              <div className="text-xs text-purple-600">Opportunities</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-800">
                {lead.dailyFollowUps.filter(f => f.status === 'COMPLETED').length}
              </div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-800">
                {lead.dailyFollowUps.filter(f => f.status === 'SCHEDULED').length}
              </div>
              <div className="text-xs text-orange-600">Pending</div>
            </div>
          </div>
        </div>
      </FloatingCard>
    </div>
  );
}
