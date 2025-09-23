import React from 'react';
import { canSeeInfo, getMaskedValue, getPrivacyIndicator } from '@/lib/privacy';
import { Eye, EyeOff, Shield } from 'lucide-react';

interface PrivateInfoProps {
  value: string | null;
  type: 'email' | 'phone' | 'location';
  privacySetting: boolean;
  isAdminView?: boolean;
  currentUserRole?: string;
  className?: string;
  showIndicator?: boolean;
  label?: string;
}

/**
 * Component for displaying user information with privacy controls
 * Automatically handles masking and admin override logic
 */
export const PrivateInfo: React.FC<PrivateInfoProps> = ({
  value,
  type,
  privacySetting,
  isAdminView = false,
  currentUserRole = 'user',
  className = '',
  showIndicator = false,
  label
}) => {
  const canSee = canSeeInfo(privacySetting, isAdminView, currentUserRole);
  const indicator = getPrivacyIndicator(privacySetting, isAdminView);

  const renderValue = () => {
    if (canSee && value) {
      return <span className={className}>{value}</span>;
    } else if (!canSee && value) {
      return <span className={`${className} opacity-50`}>{getMaskedValue(value, type)}</span>;
    } else {
      return <span className={`${className} text-gray-400 italic`}>Not provided</span>;
    }
  };

  const renderIndicator = () => {
    if (!showIndicator) return null;

    const iconClass = `h-3 w-3 ${
      indicator.color === 'red' ? 'text-red-500' :
      indicator.color === 'green' ? 'text-green-500' : 'text-gray-400'
    }`;

    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
        indicator.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
        indicator.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}>
        {indicator.color === 'red' ? <Shield className={iconClass} /> :
         canSee ? <Eye className={iconClass} /> : <EyeOff className={iconClass} />}
        {indicator.text}
      </span>
    );
  };

  if (label) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}:
        </span>
        {renderValue()}
        {renderIndicator()}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {renderValue()}
      {renderIndicator()}
    </div>
  );
};

export default PrivateInfo;
