/**
 * Utility functions to handle hydration mismatches in Next.js
 */

import React, { useEffect, useState } from 'react';

/**
 * Hook to safely handle client-side only values that might differ from server
 */
export function useClientValue<T>(clientValue: T, serverValue?: T): T {
  const [value, setValue] = useState(serverValue ?? clientValue);

  useEffect(() => {
    setValue(clientValue);
  }, [clientValue]);

  return value;
}

/**
 * Hook to safely handle date formatting that might differ between server and client
 */
export function useFormattedDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    setFormatted(date.toLocaleDateString('en-US', options));
  }, [date, options]);

  return formatted;
}

/**
 * Hook to safely handle time-based calculations that might differ between server and client
 */
export function useTimeBasedValue<T>(
  getValue: () => T,
  dependencies: React.DependencyList = []
): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    setValue(getValue());
  }, [getValue, ...dependencies]);

  return value;
}

/**
 * Clean up browser extension attributes that cause hydration mismatches
 * This is a custom hook that must be used in React components
 */
export function useCleanupBrowserExtensionAttributes() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Remove common browser extension attributes that cause hydration mismatches
    const html = document.documentElement;

    // List of attributes to remove if they exist
    const attributesToRemove = [
      'suppresshydrationwarning',
      'data-qb-installed',
      'data-reactroot',
      'data-react-helmet'
    ];

    attributesToRemove.forEach(attr => {
      if (html.hasAttribute(attr)) {
        html.removeAttribute(attr);
      }
    });

    // Also clean up any script tags that might have been added by extensions
    const scripts = document.querySelectorAll('script[data-extension]');
    scripts.forEach(script => script.remove());
  }, []);
}
