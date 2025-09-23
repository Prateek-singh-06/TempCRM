import React from 'react';
import {
  Star,
  Heart,
  DollarSign,
  Zap,
  TrendingUp,
  ArrowUp,
  Clock
} from 'lucide-react';
import { FloatingCard, AnimatedCounter, ProgressRing, GradientText } from './AnimatedComponents';

interface KeyMetricsProps {
  lead: {
    opportunities: Array<{ dealSize: number; probability: number }>;
  };
}

export const KeyMetrics = ({ lead }: KeyMetricsProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 50) return 'text-red-600';
    return 'text-gray-600';
  };

  const pipelineValue = lead.opportunities.reduce((sum, opp) => sum + opp.dealSize, 0);
  const avgWinProbability = lead.opportunities.length > 0
    ? Math.round(lead.opportunities.reduce((sum, opp) => sum + opp.probability, 0) / lead.opportunities.length)
    : 0;

  return (
    <FloatingCard delay={400} animationAllowed={false}>
      <div className="p-8">
        {/* Enhanced Key Metrics with Advanced Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* <FloatingCard delay={400} className="group">
            <div className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-300/20 to-teal-300/20 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-emerald-100/80 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                    <Star className="w-8 h-8 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowUp className="w-5 h-5 text-emerald-600 animate-bounce" />
                    <span className="text-emerald-600 text-sm font-bold">+15%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-4xl font-bold mb-2 ${getScoreColor(lead.leadScore)}`}>
                      <AnimatedCounter value={lead.leadScore} />
                    </div>
                    <div className="text-gray-600 text-sm font-medium">Lead Score</div>
                    <div className="text-xs text-emerald-600 mt-1">Exceptional Quality</div>
                  </div>
                  <ProgressRing percentage={lead.leadScore} size={70} color="#059669" />
                </div>
              </div>
            </div>
          </FloatingCard> */}

          {/* <FloatingCard delay={600} className="group">
            <div className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-300/20 to-cyan-300/20 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-blue-100/80 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                    <Heart className="w-8 h-8 text-blue-600 animate-pulse" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowUp className="w-5 h-5 text-blue-600 animate-bounce delay-100" />
                    <span className="text-blue-600 text-sm font-bold">+12%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-4xl font-bold mb-2 ${getScoreColor(lead.engagementScore)}`}>
                      <AnimatedCounter value={lead.engagementScore} />
                    </div>
                    <div className="text-gray-600 text-sm font-medium">Engagement</div>
                    <div className="text-xs text-blue-600 mt-1">Highly Active</div>
                  </div>
                  <ProgressRing percentage={lead.engagementScore} size={70} color="#2563eb" />
                </div>
              </div>
            </div>
          </FloatingCard> */}

          <FloatingCard delay={800} className="group">
            <div className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-purple-100/80 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                    <DollarSign className="w-8 h-8 text-purple-600 animate-pulse" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-purple-600 animate-bounce delay-200" />
                    <span className="text-purple-600 text-sm font-bold">+24%</span>
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    <AnimatedCounter
                      value={pipelineValue / 1000000}
                      duration={2500}
                      suffix="M"
                      prefix="$"
                    />
                  </div>
                  <div className="text-gray-600 text-sm font-medium">Pipeline Value</div>
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                      <span>Target: $15M</span>
                      <span>84%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full animate-pulse" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard delay={1000} className="group">
            <div className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-300/20 to-red-300/20 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-orange-100/80 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                    <Zap className="w-8 h-8 text-orange-600 animate-pulse" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-orange-600 animate-spin-slow" />
                    <span className="text-orange-600 text-xs">7 days</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-orange-600 mb-2">
                      <AnimatedCounter
                        value={avgWinProbability}
                        suffix="%"
                      />
                    </div>
                    <div className="text-gray-600 text-sm font-medium">Win Probability</div>
                    <div className="text-xs text-orange-600 mt-1">Board Decision Pending</div>
                  </div>
                  <ProgressRing
                    percentage={avgWinProbability}
                    size={70}
                    color="#ea580c"
                  />
                </div>
              </div>
            </div>
          </FloatingCard>
        </div>
      </div>
    </FloatingCard>
  );
};
