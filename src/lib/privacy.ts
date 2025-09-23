/**
 * Privacy System for CRM Application
 *
 * This module provides comprehensive privacy controls for user information display
 * and access throughout the CRM application. It ensures that:
 *
 * 1. Users can control what information is visible to others
 * 2. Admins can always see all information for oversight purposes
 * 3. Sensitive information is properly masked when privacy settings restrict access
 * 4. The system is extensible for future privacy features
 *
 * Key Features:
 * - Admin Override: Admins always see full information regardless of privacy settings
 * - Information Masking: Private data is obscured (e.g., email: user@domain.com → us***@domain.com)
 * - Role-based Access: Different privacy rules for different user roles
 * - Consistent API: Same privacy logic across all components
 *
 * Usage Examples:
 *
 * 1. Using the PrivateInfo component:
 * ```tsx
 * import { PrivateInfo } from '@/components/ui/private-info';
 *
 * <PrivateInfo
 *   value={user.email}
 *   type="email"
 *   privacySetting={user.privacySettings.showEmail}
 *   isAdminView={isViewingAsAdmin}
 *   currentUserRole={currentUser.role}
 *   showIndicator={true}
 *   label="Email"
 * />
 * ```
 *
 * 2. Using utility functions directly:
 * ```tsx
 * import { canSeeInfo, getMaskedValue } from '@/lib/privacy';
 *
 * const canShowEmail = canSeeInfo(
 *   user.privacySettings.showEmail,
 *   isAdminView,
 *   currentUser.role
 * );
 *
 * const displayEmail = canShowEmail
 *   ? user.email
 *   : getMaskedValue(user.email, 'email');
 * ```
 *
 * 3. Checking profile access:
 * ```tsx
 * import { canViewProfile } from '@/lib/privacy';
 *
 * if (canViewProfile(currentUser.role, targetUser.role)) {
 *   // Show profile
 * } else {
 *   // Show access denied
 * }
 * ```
 */
export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'team';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  allowMessages: boolean;
  showActivity: boolean;
}

/**
 * Check if a user can see specific information based on privacy settings
 * @param privacySetting - The privacy setting for the specific information type
 * @param isAdminView - Whether the current viewer is viewing as an admin
 * @param currentUserRole - The role of the current user
 * @returns boolean indicating if the information can be seen
 */
export const canSeeInfo = (
  privacySetting: boolean,
  isAdminView: boolean = false,
  currentUserRole: string = 'user'
): boolean => {
  // Admins and SuperAdmins can always see information regardless of privacy settings
  if (isAdminView && (currentUserRole === 'admin' || currentUserRole === 'SuperAdmin')) {
    return true;
  }
  // Otherwise, respect the privacy setting
  return privacySetting;
};

/**
 * Get a masked/hidden version of private information
 * @param value - The original value to mask
 * @param type - The type of information being masked
 * @returns Masked string
 */
export const getMaskedValue = (value: string | null, type: 'email' | 'phone' | 'location'): string => {
  if (!value) return '';

  switch (type) {
    case 'email':
      const [local, domain] = value.split('@');
      if (local.length <= 2) return `${local}***@${domain}`;
      return `${local.substring(0, 2)}***@${domain}`;
    case 'phone':
      // Mask middle digits of phone number
      return value.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
    case 'location':
      return 'Location hidden';
    default:
      return 'Hidden';
  }
};

/**
 * Check if current user can view another user's profile
 * @param currentUserRole - Role of the current user
 * @param targetUserRole - Role of the target user (optional)
 * @returns boolean indicating if profile can be viewed
 */
export const canViewProfile = (
  currentUserRole: string
): boolean => {
  // Admins and SuperAdmins can view any profile
  if (currentUserRole === 'admin' || currentUserRole === 'SuperAdmin') {
    return true;
  }

  // Users can view public profiles and team profiles
  if (currentUserRole === 'user') {
    // This would need to be checked against the actual profile visibility setting
    // For now, assume users can view team profiles
    return true;
  }

  return false;
};

/**
 * Get privacy indicator text for UI display
 * @param privacySetting - The privacy setting
 * @param isAdminView - Whether viewing as admin
 * @returns Object with visibility status and display text
 */
export const getPrivacyIndicator = (
  privacySetting: boolean,
  isAdminView: boolean = false
) => {
  if (isAdminView) {
    return {
      visible: true,
      text: 'Admin View',
      color: 'red'
    };
  }

  return {
    visible: privacySetting,
    text: privacySetting ? 'Visible' : 'Hidden',
    color: privacySetting ? 'green' : 'gray'
  };
};
