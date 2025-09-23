/**
 * Enhanced Location utilities for the CRM application
 * Handles reverse geocoding, location validation, and security features
 */

export interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  displayName?: string;
  street?: string;
  road?: string;
  highway?: string;
  neighbourhood?: string;
  suburb?: string;
  county?: string;
  postcode?: string;
  // More granular details
  houseNumber?: string;
  amenity?: string;
  shop?: string;
  tourism?: string;
  place?: string;
  locality?: string;
  district?: string;
  region?: string;
  // Additional metadata
  osmType?: string;
  osmId?: string;
  category?: string;
  type?: string;
  // Enhanced accuracy and validation
  accuracyLevel?: string;
  isValidLocation?: boolean;
  confidence?: number;
  timestamp?: number;
  source?: string;
  locationProvider?: string;
  locationSource?: string;
  postalCode?: string;
  // Security features
  isWithinOfficeBounds?: boolean;
  distanceFromOffice?: number;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
  validateOfficeLocation?: boolean;
  officeLocations?: Array<{
    latitude: number;
    longitude: number;
    radius: number; // in meters
    name: string;
  }>;
}

export interface LocationValidation {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
  security: {
    isWithinOfficeBounds: boolean;
    distanceFromOffice: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

/**
 * Enhanced reverse geocode with multiple service fallbacks and improved accuracy
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationInfo> {
  const geocodingServices = [
    // Primary: OpenStreetMap Nominatim (free, reliable)
    async () => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
        {
          headers: {
            'User-Agent': 'CRM-Attendance-System/2.0'
          }
        }
      );

      if (!response.ok) throw new Error('Nominatim service error');

      const data = await response.json();
      return {
        ...data,
        source: 'OpenStreetMap',
        confidence: 0.95
      };
    },

    // Fallback 1: LocationIQ (if API key available)
    async () => {
      const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
      if (!apiKey) throw new Error('LocationIQ API key not available');

      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${latitude}&lon=${longitude}&format=json&zoom=18`
      );

      if (!response.ok) throw new Error('LocationIQ service error');

      const data = await response.json();
      return {
        ...data,
        source: 'LocationIQ',
        confidence: 0.90
      };
    },

    // Fallback 2: Basic coordinate fallback
    async () => {
      return {
        display_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        address: {},
        source: 'coordinates',
        confidence: 0.0
      };
    }
  ];

  for (const service of geocodingServices) {
    try {
      const data = await service();

      const locationInfo: LocationInfo = {
        latitude,
        longitude,
        timestamp: Date.now(),
        source: data.source,
        confidence: data.confidence,
        accuracyLevel: getLocationAccuracyLevel({
          latitude,
          longitude,
          houseNumber: data.address?.house_number,
          street: data.address?.road || data.address?.highway,
          amenity: data.address?.amenity,
          shop: data.address?.shop,
          neighbourhood: data.address?.neighbourhood || data.address?.suburb,
          city: data.address?.city || data.address?.town || data.address?.village,
        }),

        // Enhanced address details
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country,
        displayName: data.display_name,

        // Detailed street information
        street: data.address?.road || data.address?.highway || data.address?.pedestrian || data.address?.residential,
        neighbourhood: data.address?.neighbourhood || data.address?.suburb || data.address?.locality,
        suburb: data.address?.suburb || data.address?.city_district,
        county: data.address?.county || data.address?.district,
        postcode: data.address?.postcode,

        // Granular details
        houseNumber: data.address?.house_number,
        amenity: data.address?.amenity,
        shop: data.address?.shop,
        tourism: data.address?.tourism,
        place: data.address?.place,
        locality: data.address?.locality,
        district: data.address?.city_district || data.address?.district,
        region: data.address?.region || data.address?.state_district,

        // OSM metadata (if available)
        osmType: data.osm_type,
        osmId: data.osm_id,
        category: data.category,
        type: data.type
      };

      return locationInfo;

    } catch (error) {
      console.warn(`Geocoding service failed:`, error);
      continue;
    }
  }

  // Final fallback
  return {
    latitude,
    longitude,
    displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    timestamp: Date.now(),
    source: 'fallback',
    confidence: 0.0,
    accuracyLevel: 'Coordinates Only'
  };
}

/**
 * Get a hyper-detailed location display string with maximum accuracy
 */
export function getLocationDisplay(location: LocationInfo): string {
  // Ultra-detailed - house number + street + area + city
  if (location.houseNumber && location.street && location.neighbourhood && location.city) {
    return `${location.houseNumber} ${location.street}, ${location.neighbourhood}, ${location.city}`;
  }

  // Very detailed - house number + street + city
  if (location.houseNumber && location.street && location.city) {
    return `${location.houseNumber} ${location.street}, ${location.city}`;
  }

  // Detailed - street + neighborhood + city
  if (location.street && location.neighbourhood && location.city) {
    return `${location.street}, ${location.neighbourhood}, ${location.city}`;
  }

  // Landmark/Amenity level (most specific for businesses/places)
  if (location.amenity && location.city) {
    return `${location.amenity}, ${location.city}`;
  }

  if (location.shop && location.city) {
    return `${location.shop}, ${location.city}`;
  }

  if (location.tourism && location.city) {
    return `${location.tourism}, ${location.city}`;
  }

  // Street level with city (very good detail)
  if (location.street && location.city) {
    return `${location.street}, ${location.city}`;
  }

  // Locality/Neighborhood level (good detail)
  if (location.locality && location.city) {
    return `${location.locality}, ${location.city}`;
  }

  if (location.neighbourhood && location.city) {
    return `${location.neighbourhood}, ${location.city}`;
  }

  // District/Suburb level
  if (location.district && location.city) {
    return `${location.district}, ${location.city}`;
  }

  if (location.suburb && location.city) {
    return `${location.suburb}, ${location.city}`;
  }

  // City and state level
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }

  // City only
  if (location.city) {
    return location.city;
  }

  // State or county level
  if (location.state) {
    return location.state;
  }

  if (location.county) {
    return location.county;
  }

  if (location.region) {
    return location.region;
  }

  // Country level
  if (location.country) {
    return location.country;
  }

  // If we have a proper address from geocoding but no specific components
  if (location.displayName && location.displayName !== `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`) {
    // Try to extract the most specific parts
    const addressParts = location.displayName.split(',');
    if (addressParts.length >= 3) {
      return `${addressParts[0].trim()}, ${addressParts[1].trim()}, ${addressParts[2].trim()}`;
    } else if (addressParts.length >= 2) {
      return `${addressParts[0].trim()}, ${addressParts[1].trim()}`;
    }
    return location.displayName.split(',')[0].trim();
  }

  // Fallback to coordinates
  return formatCoordinates(location.latitude, location.longitude);
}

/**
 * Get an ultra-detailed location display for admin views with maximum granularity
 */
export function getDetailedLocationDisplay(location: LocationInfo): string {
  const parts = [];

  // Start with house number for maximum specificity
  if (location.houseNumber) {
    parts.push(`${location.houseNumber}`);
  }

  // Add street/area details with high priority
  if (location.street) {
    parts.push(location.street);
  } else if (location.road || location.highway) {
    parts.push(location.road || location.highway);
  }

  // Add specific location identifiers
  if (location.amenity) {
    parts.push(`${location.amenity}`);
  } else if (location.shop) {
    parts.push(`${location.shop}`);
  } else if (location.tourism) {
    parts.push(`${location.tourism}`);
  } else if (location.place) {
    parts.push(`${location.place}`);
  }

  // Add neighborhood/locality details
  if (location.neighbourhood) {
    parts.push(location.neighbourhood);
  } else if (location.locality) {
    parts.push(location.locality);
  }

  // Add district/suburb information
  if (location.district) {
    parts.push(location.district);
  } else if (location.suburb) {
    parts.push(location.suburb);
  }

  // Add city
  if (location.city) {
    parts.push(location.city);
  }

  // Add state/region
  if (location.state) {
    parts.push(location.state);
  } else if (location.region) {
    parts.push(location.region);
  }

  // Add county if different from state
  if (location.county && location.county !== location.state) {
    parts.push(location.county);
  }

  // Add postcode for complete address
  if (location.postcode) {
    parts.push(location.postcode);
  }

  // Add country (usually at the end)
  if (location.country) {
    parts.push(location.country);
  }

  // If we have detailed parts, join them with proper formatting
  if (parts.length > 0) {
    // For very detailed addresses, limit to most relevant parts
    if (parts.length > 4) {
      const essential = parts.slice(0, 4); // House, Street, Area, City
      const additional = parts.slice(4, 6); // State, Postcode
      const location = essential.join(', ') + (additional.length > 0 ? ', ' + additional.join(', ') : '');
      return location;
    }
    return parts.join(', ');
  }

  // Fallback to regular display
  return getLocationDisplay(location);
}

/**
 * Get location accuracy level for display
 */
export function getLocationAccuracyLevel(location: LocationInfo): string {
  if (location.houseNumber && location.street) {
    return 'Address Level (Highest)';
  } else if (location.amenity || location.shop || location.tourism) {
    return 'Landmark Level (Very High)';
  } else if (location.street) {
    return 'Street Level (High)';
  } else if (location.neighbourhood || location.locality) {
    return 'Area Level (Good)';
  } else if (location.district || location.suburb) {
    return 'District Level (Moderate)';
  } else if (location.city) {
    return 'City Level (Basic)';
  } else if (location.state || location.region) {
    return 'State Level (Low)';
  } else {
    return 'Country Level (Minimal)';
  }
}

/**
 * Check if location coordinates are valid
 */
export function isValidLocation(latitude: number, longitude: number): boolean {
  return (
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    latitude !== 0 && longitude !== 0
  );
}

/**
 * Get location permission status
 */
export async function getLocationPermissionStatus(): Promise<string> {
  if (!navigator.permissions) {
    console.log('ℹ️ Permissions API not supported');
    return 'unknown';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    console.log('ℹ️ Permission status:', result.state);
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    console.log('ℹ️ Permission query failed:', error);
    return 'unknown';
  }
}

/**
 * Check for permissions policy violations
 */
export function checkPermissionsPolicy(): {
  hasPermissionsPolicy: boolean;
  isGeolocationBlocked: boolean;
  details: string;
} {
  // Try to detect permissions policy by attempting a minimal geolocation call
  let hasPermissionsPolicy = false;
  let isGeolocationBlocked = false;
  let details = 'Permissions policy check completed';

  if (navigator.geolocation) {
    try {
      // Try to get current position with minimal options
      navigator.geolocation.getCurrentPosition(
        () => {
          console.log('✅ Permissions policy check passed');
        },
        (error) => {
          if (error.message && (
            error.message.includes('permissions policy') ||
            error.message.includes('blocked because of a permissions policy') ||
            error.message.includes('Geolocation has been disabled')
          )) {
            hasPermissionsPolicy = true;
            isGeolocationBlocked = true;
            details = `Permissions policy violation detected: ${error.message}`;
            console.warn('🚫 Permissions policy blocking geolocation:', error.message);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 5000, // Quick check
          maximumAge: 0
        }
      );
    } catch (error) {
      console.log('ℹ️ Permissions policy check completed with error:', error);
    }
  }

  return {
    hasPermissionsPolicy,
    isGeolocationBlocked,
    details
  };
}

/**
 * Diagnostic function to identify GPS issues
 */
export function diagnoseGPSIssues(): {
  isSupported: boolean;
  isSecureContext: boolean;
  protocol: string;
  hostname: string;
  userAgent: string;
  permissionsPolicyCheck: ReturnType<typeof checkPermissionsPolicy>;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  const isSupported = !!navigator.geolocation;
  const isSecureContext = window.isSecureContext;
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const userAgent = navigator.userAgent;
  const permissionsPolicyCheck = checkPermissionsPolicy();

  console.log('🔍 GPS Diagnostics:');
  console.log('  - Geolocation supported:', isSupported);
  console.log('  - Secure context:', isSecureContext);
  console.log('  - Protocol:', protocol);
  console.log('  - Hostname:', hostname);
  console.log('  - Permissions policy issue:', permissionsPolicyCheck.hasPermissionsPolicy);
  console.log('  - User Agent:', userAgent.substring(0, 100) + '...');

  if (!isSupported) {
    recommendations.push('Geolocation is not supported by this browser');
  }

  if (!isSecureContext) {
    recommendations.push('Geolocation requires a secure context (HTTPS or localhost)');
  }

  if (protocol !== 'https:' && hostname !== 'localhost') {
    recommendations.push('Geolocation requires HTTPS (except localhost)');
  }

  if (permissionsPolicyCheck.hasPermissionsPolicy) {
    recommendations.push('Geolocation is blocked by browser permissions policy - contact system administrator');
  }

  return {
    isSupported,
    isSecureContext,
    protocol,
    hostname,
    userAgent,
    permissionsPolicyCheck,
    recommendations
  };
}

/**
 * IP-based geolocation fallback service
 */
export async function getIPBasedLocation(): Promise<LocationInfo> {
  const services = [
    // Primary: ipapi.co (free, reliable)
    async () => {
      const response = await fetch('https://ipapi.co/json/', {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) throw new Error('ipapi.co service error');

      const data = await response.json();

      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        state: data.region,
        country: data.country_name,
        postalCode: data.postal,
        source: 'ipapi.co',
        confidence: 0.6,
        accuracyLevel: 'City Level (IP-based)',
        locationProvider: 'IP Geolocation',
        address: `${data.city}, ${data.region}, ${data.country_name}`,
        displayName: `${data.city}, ${data.region}, ${data.country_name}`,
        timestamp: Date.now(),
        isValidLocation: true,
        locationSource: 'IP-based'
      };
    },

    // Fallback 1: ipify + ip-api.com
    async () => {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      if (!ipResponse.ok) throw new Error('Failed to get IP address');

      const ipData = await ipResponse.json();
      const ip = ipData.ip;

      const locationResponse = await fetch(`http://ip-api.com/json/${ip}`);
      if (!locationResponse.ok) throw new Error('ip-api.com service error');

      const data = await locationResponse.json();

      return {
        latitude: data.lat,
        longitude: data.lon,
        city: data.city,
        state: data.regionName,
        country: data.country,
        postalCode: data.zip,
        source: 'ip-api.com',
        confidence: 0.55,
        accuracyLevel: 'City Level (IP-based)',
        locationProvider: 'IP Geolocation',
        address: `${data.city}, ${data.regionName}, ${data.country}`,
        displayName: `${data.city}, ${data.regionName}, ${data.country}`,
        timestamp: Date.now(),
        isValidLocation: true,
        locationSource: 'IP-based'
      };
    },

    // Fallback 2: freegeoip.app
    async () => {
      const response = await fetch('https://freegeoip.app/json/', {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) throw new Error('freegeoip.app service error');

      const data = await response.json();

      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        state: data.region_name,
        country: data.country_name,
        postalCode: data.zip_code,
        source: 'freegeoip.app',
        confidence: 0.5,
        accuracyLevel: 'City Level (IP-based)',
        locationProvider: 'IP Geolocation',
        address: `${data.city}, ${data.region_name}, ${data.country_name}`,
        displayName: `${data.city}, ${data.region_name}, ${data.country_name}`,
        timestamp: Date.now(),
        isValidLocation: true,
        locationSource: 'IP-based'
      };
    }
  ];

  for (const service of services) {
    try {
      const locationInfo = await service();
      console.log(`✅ IP-based geolocation successful via ${locationInfo.source}`);
      return locationInfo;
    } catch (error) {
      console.warn(`❌ IP geolocation service failed:`, error);
      continue;
    }
  }

  // Final fallback
  throw new Error('All IP-based geolocation services failed');
}

/**
 * Enhanced geolocation with comprehensive fallback system
 */
export async function getEnhancedLocationWithFallback(options: GeolocationOptions = {}): Promise<{
  location: LocationInfo;
  method: 'GPS' | 'IP' | 'Fallback';
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Try GPS first - always attempt if geolocation is supported
  if (navigator.geolocation) {
    try {
      console.log('📍 Attempting GPS geolocation...');

      // Always try GPS first - this will trigger permission dialog if needed
      const gpsLocation = await getEnhancedLocation({
        enableHighAccuracy: false, // Start with low accuracy for better compatibility
        timeout: 30000, // Longer timeout for better GPS acquisition
        maximumAge: 600000, // Accept cached location for 10 minutes
        ...options
      });

      console.log('✅ GPS geolocation successful');
      return {
        location: gpsLocation,
        method: 'GPS',
        warnings: []
      };

    } catch (error) {
      // Handle specific GPS errors
      if (error && typeof error === 'object' && 'code' in error) {
        const geoError = error as GeolocationPositionError;

        if (geoError.message && geoError.message.includes('permissions policy')) {
          warnings.push('GPS blocked by browser permissions policy');
          console.log('ℹ️ GPS blocked by permissions policy');
        } else if (geoError.code === 1) { // PERMISSION_DENIED
          warnings.push('GPS permission denied by user');
          console.log('ℹ️ GPS permission denied by user');
        } else if (geoError.code === 2) { // POSITION_UNAVAILABLE
          warnings.push('GPS position unavailable');
          console.log('ℹ️ GPS position unavailable');
        } else if (geoError.code === 3) { // TIMEOUT
          warnings.push('GPS request timed out');
          console.log('ℹ️ GPS request timed out');
        } else {
          warnings.push(`GPS error: ${geoError.code}`);
          console.log('ℹ️ GPS error:', geoError.code);
        }
      } else {
        warnings.push('GPS geolocation failed');
        console.log('ℹ️ GPS geolocation failed:', error);
      }
    }
  } else {
    warnings.push('GPS not supported by this browser');
    console.log('ℹ️ GPS not supported by this browser');
  }

  // Try IP-based fallback
  try {
    console.log('🌐 Attempting IP-based geolocation fallback...');
    const ipLocation = await getIPBasedLocation();

    warnings.push('Using IP-based location (less accurate than GPS)');
    console.log('✅ IP-based geolocation successful');

    return {
      location: ipLocation,
      method: 'IP',
      warnings
    };
  } catch (error) {
    warnings.push(`IP-based geolocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.warn('❌ IP-based geolocation failed:', error);
  }

  // Final fallback - use default coordinates
  console.log('🏠 Using fallback location...');
  warnings.push('Using fallback location - no geolocation available');

  const fallbackLocation: LocationInfo = {
    latitude: 20.5937, // Center of India
    longitude: 78.9629,
    displayName: 'India (Fallback)',
    country: 'India',
    source: 'fallback',
    confidence: 0.0,
    accuracyLevel: 'Country Level (Fallback)',
    locationProvider: 'Fallback',
    timestamp: Date.now(),
    isValidLocation: false,
    locationSource: 'Fallback',
    address: 'India (Fallback Location)'
  };

  return {
    location: fallbackLocation,
    method: 'Fallback',
    warnings
  };
}

/**
 * Get comprehensive location information with all available data
 */
export async function getComprehensiveLocation(): Promise<{
  location: LocationInfo;
  method: 'GPS' | 'IP' | 'Fallback';
  warnings: string[];
  metadata: {
    timestamp: number;
    userAgent: string;
    platform: string;
    language: string;
    timezone: string;
    screenResolution: string;
  };
}> {
  const result = await getEnhancedLocationWithFallback();

  // Add metadata
  const metadata = {
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${screen.width}x${screen.height}`
  };

  return {
    ...result,
    metadata
  };
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';

  return `${Math.abs(latitude).toFixed(4)}°${latDir}, ${Math.abs(longitude).toFixed(4)}°${lngDir}`;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Check if location is within office bounds
 */
export function isWithinOfficeBounds(
  latitude: number,
  longitude: number,
  officeLocations: Array<{ latitude: number; longitude: number; radius: number; name: string }>
): { isWithinBounds: boolean; nearestOffice: string; distance: number } {
  let nearestOffice = '';
  let minDistance = Infinity;
  let isWithinBounds = false;

  for (const office of officeLocations) {
    const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearestOffice = office.name;
    }
    if (distance <= office.radius) {
      isWithinBounds = true;
    }
  }

  return {
    isWithinBounds,
    nearestOffice,
    distance: minDistance
  };
}

/**
 * Enhanced geolocation with office validation and security features
 */
export async function getEnhancedLocation(options: GeolocationOptions = {}): Promise<LocationInfo> {
  const defaultOptions: GeolocationOptions = {
    enableHighAccuracy: false, // Start with false for better compatibility
    timeout: 30000, // Increased timeout to 30 seconds
    maximumAge: 600000, // Increased to 10 minutes
    validateOfficeLocation: false,
    officeLocations: []
  };

  const config = { ...defaultOptions, ...options };

  // If high accuracy is not explicitly requested, try low accuracy first, then high accuracy as fallback
  if (config.enableHighAccuracy === false) {
    try {
      console.log('🎯 Attempting GPS with low accuracy first...');
      return await getGPSLocationWithOptions({
        ...config,
        enableHighAccuracy: false
      });
    } catch (lowAccuracyError) {
      console.log('⚠️ Low accuracy GPS failed, trying high accuracy...');
      try {
        return await getGPSLocationWithOptions({
          ...config,
          enableHighAccuracy: true,
          timeout: 20000 // Shorter timeout for high accuracy attempt
        });
      } catch (highAccuracyError) {
        console.log('⚠️ High accuracy GPS also failed');
        throw highAccuracyError; // Throw the high accuracy error
      }
    }
  } else {
    // High accuracy was explicitly requested, use it directly
    return await getGPSLocationWithOptions(config);
  }
}

// Helper function to get GPS location with specific options
async function getGPSLocationWithOptions(config: GeolocationOptions): Promise<LocationInfo> {
  console.log('🚀 getGPSLocationWithOptions called with config:', config);

  return new Promise((resolve, reject) => {
    console.log('📡 Creating GPS promise...');

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    console.log('✅ Geolocation API available, setting up callbacks...');

    const success = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`✅ GPS successful: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (accuracy: ${Math.round(accuracy)}m)`);

        // Basic validation
        if (!isValidLocation(latitude, longitude)) {
          console.warn('⚠️ Invalid GPS coordinates received');
          reject(new Error('Invalid location coordinates received'));
          return;
        }

        // Get location info
        console.log('🌐 Reverse geocoding GPS coordinates...');
        const locationInfo = await reverseGeocode(latitude, longitude);

        // Enhanced location data
        locationInfo.accuracy = accuracy;
        locationInfo.timestamp = position.timestamp;
        locationInfo.isValidLocation = true;
        locationInfo.locationSource = 'GPS';

        // Office bounds validation
        if (config.validateOfficeLocation && config.officeLocations?.length) {
          const officeCheck = isWithinOfficeBounds(
            latitude,
            longitude,
            config.officeLocations
          );

          locationInfo.isWithinOfficeBounds = officeCheck.isWithinBounds;
          locationInfo.distanceFromOffice = officeCheck.distance;
        }

        console.log('✅ GPS location processing complete');
        resolve(locationInfo);
      } catch (error) {
        console.error('❌ Failed to process GPS location data:', error);
        reject(new Error(`Failed to process location data: ${error}`));
      }
    };

    const error = (err: GeolocationPositionError) => {
      try {
        console.log('❌ GPS error callback triggered');

        // Enhanced error logging to understand the empty object issue
        console.error('❌ GPS geolocation error - RAW ERROR:', err);
        console.error('Error type:', typeof err);
        console.error('Error constructor:', err?.constructor?.name);
        console.error('Error instanceof GeolocationPositionError:', err instanceof GeolocationPositionError);

        // Check all possible properties
        console.error('Error properties:', {
          code: err?.code,
          message: err?.message,
          toString: err?.toString?.(),
          prototype: err ? Object.getPrototypeOf(err) : 'null/undefined',
          keys: err ? Object.keys(err) : 'null/undefined',
          enumerableKeys: err ? Object.getOwnPropertyNames(err) : 'null/undefined'
        });

        // Try direct property access (sometimes console doesn't show them)
        const directCode = err.code;
        const directMessage = err.message;

        console.error('Direct property access - code:', directCode);
        console.error('Direct property access - message:', directMessage);
        console.error('Direct property access - message length:', directMessage?.length);

        // Better error logging with null checks
        const errorDetails = {
          code: err?.code,
          message: err?.message || 'Unknown error',
          hasMessage: !!err?.message,
          hasCode: !!err?.code,
          directCode: directCode,
          directMessage: directMessage
        };
        console.error('❌ GPS geolocation error - PROCESSED:', errorDetails);

      let errorMessage = 'Location access failed';
      let isPermissionsPolicyError = false;

      // Handle null/undefined error
      if (!err) {
        console.error('❌ GPS error callback received null/undefined error');
        errorMessage = 'GPS location request failed (no error details available)';
        reject(new Error(errorMessage));
        return;
      }

      // Check for permissions policy error (this is the most common issue)
      if (directMessage && (
        directMessage.includes('permissions policy') ||
        directMessage.includes('blocked because of a permissions policy') ||
        directMessage.includes('Geolocation has been disabled')
      )) {
        isPermissionsPolicyError = true;
        console.warn('🚫 Permissions policy violation detected via direct access');
        console.warn('🚫 Permissions policy message:', directMessage);
        errorMessage = 'Geolocation is blocked by browser permissions policy. This is a browser/server security setting.';
      }

      // Handle empty error object
      if (!directCode && !directMessage) {
        console.warn('⚠️ GPS error object properties are empty - likely permissions policy or browser issue');
        console.warn('⚠️ directCode:', directCode, 'directMessage:', directMessage);
        errorMessage = 'GPS location access failed. This may be due to browser security settings.';
        reject(new Error(errorMessage));
        return;
      }

      switch (directCode) {
        case 1: // PERMISSION_DENIED
          if (isPermissionsPolicyError) {
            console.warn('🚫 GPS blocked by permissions policy (not user permission)');
            errorMessage = 'Geolocation is blocked by browser permissions policy. Contact system administrator.';
          } else {
            console.warn('🚫 GPS permission denied by user');
            errorMessage = 'Location permission denied. Please enable location access in browser settings.';
          }
          break;
        case 2: // POSITION_UNAVAILABLE
          console.warn('📍 GPS position unavailable - device/network issue');
          errorMessage = 'Location information unavailable. Check GPS settings or move to an open area.';
          break;
        case 3: // TIMEOUT
          console.warn('⏰ GPS request timed out - weak signal or network issue');
          errorMessage = 'Location request timed out. GPS signal may be weak or device may be indoors.';
          break;
        default:
          console.warn('❓ Unknown GPS error:', directCode, directMessage);
          errorMessage = directMessage ? `GPS error: ${directMessage}` : 'GPS location request failed.';
      }

        reject(new Error(errorMessage));

      } catch (callbackError) {
        console.error('❌ Error in GPS error callback itself:', callbackError);
        reject(new Error('GPS error handling failed'));
      }
    };

    console.log('📡 Starting GPS request with options:', {
      enableHighAccuracy: config.enableHighAccuracy,
      timeout: config.timeout,
      maximumAge: config.maximumAge
    });

    console.log('🔄 Calling navigator.geolocation.getCurrentPosition...');

    try {
      navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: config.enableHighAccuracy,
        timeout: config.timeout,
        maximumAge: config.maximumAge
      });

      console.log('📡 getCurrentPosition call completed (callbacks will fire asynchronously)');
    } catch (syncError) {
      console.error('❌ Synchronous error in getCurrentPosition:', syncError);
      const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      reject(new Error(`GPS request failed: ${errorMessage}`));
    }
  });
}

/**
 * Validate location for attendance security
 */
export function validateLocationForAttendance(
  location: LocationInfo,
  officeLocations: Array<{ latitude: number; longitude: number; radius: number; name: string }>
): LocationValidation {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Office bounds check
  const officeCheck = isWithinOfficeBounds(
    location.latitude,
    location.longitude,
    officeLocations
  );

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  // Distance-based validation
  if (officeCheck.distance > 5000) { // More than 5km from office
    warnings.push(`Location is ${Math.round(officeCheck.distance / 1000)}km from nearest office`);
    riskLevel = 'CRITICAL';
    recommendations.push('Verify your location and try again');
  } else if (officeCheck.distance > 1000) { // More than 1km from office
    warnings.push(`Location is ${Math.round(officeCheck.distance / 1000)}km from nearest office`);
    riskLevel = 'HIGH';
    recommendations.push('Ensure you are at the correct office location');
  } else if (!officeCheck.isWithinBounds) {
    warnings.push('Location is outside office premises');
    riskLevel = 'MEDIUM';
    recommendations.push('Please ensure you are within office boundaries');
  }

  // Accuracy validation
  if (location.accuracy && location.accuracy > 100) {
    warnings.push(`Location accuracy is low (${Math.round(location.accuracy)}m)`);
    riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
    recommendations.push('Wait for better GPS accuracy or move to an open area');
  }

  // Time validation
  if (location.timestamp) {
    const age = Date.now() - location.timestamp;
    if (age > 300000) { // Older than 5 minutes
      warnings.push('Location data is stale');
      riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
      recommendations.push('Please refresh your location');
    }
  }

  return {
    isValid: riskLevel === 'LOW',
    warnings,
    recommendations,
    security: {
      isWithinOfficeBounds: officeCheck.isWithinBounds,
      distanceFromOffice: officeCheck.distance,
      riskLevel
    }
  };
}

/**
 * Continuous location monitoring for enhanced security
 */
export class LocationMonitor {
  private watchId: number | null = null;
  private officeLocations: Array<{ latitude: number; longitude: number; radius: number; name: string }> = [];
  private callbacks: Array<(location: LocationInfo, validation: LocationValidation) => void> = [];
  private lastLocation: LocationInfo | null = null;

  constructor(officeLocations: Array<{ latitude: number; longitude: number; radius: number; name: string }> = []) {
    this.officeLocations = officeLocations;
  }

  startMonitoring(options: GeolocationOptions = {}): void {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
      ...options
    };

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const locationInfo = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          );

          locationInfo.accuracy = position.coords.accuracy;
          locationInfo.timestamp = position.timestamp;

          // Validate location
          const validation = validateLocationForAttendance(locationInfo, this.officeLocations);

          // Check for significant location changes
          if (this.lastLocation) {
            const distance = calculateDistance(
              locationInfo.latitude,
              locationInfo.longitude,
              this.lastLocation.latitude,
              this.lastLocation.longitude
            );

            if (distance > 1000) { // Moved more than 1km
              console.log(`📍 Location changed by ${Math.round(distance)}m`);
            }
          }

          this.lastLocation = locationInfo;

          // Notify callbacks
          this.callbacks.forEach(callback => callback(locationInfo, validation));

        } catch (error) {
          console.error('Location monitoring error:', error);
        }
      },
      (error) => {
        console.error('Location monitoring failed:', error);
      },
      watchOptions
    );
  }

  stopMonitoring(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  onLocationUpdate(callback: (location: LocationInfo, validation: LocationValidation) => void): void {
    this.callbacks.push(callback);
  }

  removeCallback(callback: (location: LocationInfo, validation: LocationValidation) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }
}

/**
 * Test enhanced location accuracy with sample coordinates
 * This demonstrates the improved granularity
 */
export async function testEnhancedLocationAccuracy(): Promise<void> {
  console.log('🧪 Testing Enhanced Location Accuracy...');

  // Test coordinates for different types of locations
  const testLocations = [
    { lat: 19.0760, lng: 72.8777, name: 'Mumbai Central' },
    { lat: 28.6139, lng: 77.2090, name: 'New Delhi' },
    { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
    { lat: 22.5726, lng: 88.3639, name: 'Kolkata' }
  ];

  // Test office locations
  const testOffices = [
    { latitude: 19.0760, longitude: 72.8777, radius: 1000, name: 'Mumbai Office' },
    { latitude: 28.6139, longitude: 77.2090, radius: 1500, name: 'Delhi Office' }
  ];

  for (const test of testLocations) {
    try {
      console.log(`\n📍 Testing: ${test.name}`);
      console.log(`Coordinates: ${formatCoordinates(test.lat, test.lng)}`);

      const locationInfo = await reverseGeocode(test.lat, test.lng);
      const basicDisplay = getLocationDisplay(locationInfo);
      const detailedDisplay = getDetailedLocationDisplay(locationInfo);
      const accuracyLevel = getLocationAccuracyLevel(locationInfo);

      console.log(`Basic Display: ${basicDisplay}`);
      console.log(`Detailed Display: ${detailedDisplay}`);
      console.log(`Accuracy Level: ${accuracyLevel}`);
      console.log(`Source: ${locationInfo.source}`);
      console.log(`Confidence: ${locationInfo.confidence}`);

      if (locationInfo.houseNumber) console.log(`🏠 House Number: ${locationInfo.houseNumber}`);
      if (locationInfo.street) console.log(`🛣️ Street: ${locationInfo.street}`);
      if (locationInfo.neighbourhood) console.log(`🏘️ Neighbourhood: ${locationInfo.neighbourhood}`);
      if (locationInfo.city) console.log(`🏙️ City: ${locationInfo.city}`);

      // Test office validation
      const officeCheck = isWithinOfficeBounds(test.lat, test.lng, testOffices);
      console.log(`📍 Office Check: ${officeCheck.isWithinBounds ? '✅ Within' : '❌ Outside'} ${officeCheck.nearestOffice}`);
      console.log(`📍 Distance to office: ${Math.round(officeCheck.distance)}m`);

      // Test location validation
      const validation = validateLocationForAttendance(locationInfo, testOffices);
      console.log(`🔒 Security Validation: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`🚨 Risk Level: ${validation.security.riskLevel}`);

      if (validation.warnings.length > 0) {
        console.log(`⚠️ Warnings:`, validation.warnings);
      }

    } catch (error) {
      console.error(`❌ Error testing ${test.name}:`, error);
    }
  }

  console.log('\n✅ Enhanced Location Testing Complete!');
}

/**
 * Test the complete enhanced geolocation workflow
 */
export async function testCompleteGeolocationWorkflow(): Promise<void> {
  console.log('🚀 Testing Complete Enhanced Geolocation Workflow...\n');

  try {
    // Test enhanced location
    console.log('1️⃣ Testing Enhanced Location...');
    const locationInfo = await getEnhancedLocation({
      enableHighAccuracy: true,
      timeout: 10000,
      validateOfficeLocation: true,
      officeLocations: [
        { latitude: 19.0760, longitude: 72.8777, radius: 1000, name: 'Test Office' }
      ]
    });

    console.log('✅ Enhanced Location Success!');
    console.log(`📍 Location: ${getLocationDisplay(locationInfo)}`);
    console.log(`🎯 Accuracy: ${locationInfo.accuracy}m`);
    console.log(`🏢 Within Office Bounds: ${locationInfo.isWithinOfficeBounds}`);
    if (locationInfo.distanceFromOffice) {
      console.log(`📏 Distance from Office: ${Math.round(locationInfo.distanceFromOffice)}m`);
    }

    // Test location monitoring
    console.log('\n2️⃣ Testing Location Monitoring...');
    const monitor = new LocationMonitor([
      { latitude: 19.0760, longitude: 72.8777, radius: 1000, name: 'Test Office' }
    ]);

    let updateCount = 0;
    monitor.onLocationUpdate((location, validation) => {
      updateCount++;
      console.log(`📡 Location Update #${updateCount}`);
      console.log(`📍 ${getLocationDisplay(location)}`);
      console.log(`🔒 Risk Level: ${validation.security.riskLevel}`);

      if (updateCount >= 3) {
        monitor.stopMonitoring();
        console.log('✅ Location Monitoring Test Complete!');
      }
    });

    monitor.startMonitoring({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 10000
    });

    // Stop monitoring after 15 seconds
    setTimeout(() => {
      monitor.stopMonitoring();
      console.log('✅ Complete Geolocation Workflow Test Finished!');
    }, 15000);

  } catch (error) {
    console.error('❌ Enhanced Geolocation Workflow Test Failed:', error);
  }
}
