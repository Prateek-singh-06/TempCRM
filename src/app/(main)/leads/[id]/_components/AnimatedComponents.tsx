import React, { useState, useEffect } from 'react';

type AnimatedCounterProps = {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
};

export const AnimatedCounter = ({ value, duration = 2000, suffix = '', prefix = '' }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | undefined;
    const startValue = 0;
    const endValue = value;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      setCount(Math.floor(startValue + (endValue - startValue) * easeOutCubic));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

export const ProgressRing = ({ percentage, size = 120, strokeWidth = 8, color = '#10b981' }: { percentage: number; size?: number; strokeWidth?: number; color?: string }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 500);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-2000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{animatedPercentage}%</span>
      </div>
    </div>
  );
};

export const PulsingDot = ({ color = 'bg-green-500', size = 'w-3 h-3' }) => (
  <div className={`${size} ${color} rounded-full relative`}>
    <div className={`absolute inset-0 ${color} rounded-full animate-ping opacity-75`}></div>
    <div className={`absolute inset-0 ${color} rounded-full animate-pulse`}></div>
  </div>
);

export const FloatingCard = ({ children, delay = 0, className = "", animationAllowed = true }: { children: React.ReactNode; delay?: number; className?: string; animationAllowed?: boolean }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'} ${className}`}
    >
      <div className={`bg-white/95 backdrop-blur-lg rounded-3xl border border-gray-200 hover:border-gray-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-500 ${animationAllowed ? 'hover:scale-[1.02]' : ''} shadow-lg group`}>
        {children}
      </div>
    </div>
  );
};

export const GradientText = ({ children, gradient = "from-blue-600 to-purple-600" }: { children: React.ReactNode; gradient?: string }) => (
  <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold`}>
    {children}
  </span>
);
