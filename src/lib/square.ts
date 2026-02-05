// src/lib/square.ts
// Square SDK Configuration
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://developer.squareup.com/ and sign in/create account
// 2. Create a new application in the Developer Dashboard
// 3. Copy your credentials:
//    - Sandbox: Use for testing (test credit cards, no real charges)
//    - Production: Use for live payments
// 4. Add credentials to your .env file (see below)
// 5. Get your Location ID from Square Dashboard > Locations
//
// ENVIRONMENT VARIABLES (add to .env):
// VITE_SQUARE_APP_ID=your_app_id
// VITE_SQUARE_ACCESS_TOKEN=your_access_token  
// VITE_SQUARE_LOCATION_ID=your_location_id
// VITE_SQUARE_ENVIRONMENT=sandbox  // or 'production'
//
// For Firebase Functions, add these to functions/.env or Firebase config:
// SQUARE_ACCESS_TOKEN=your_access_token
// SQUARE_LOCATION_ID=your_location_id
// SQUARE_ENVIRONMENT=sandbox

export const SQUARE_CONFIG = {
  // Frontend config (safe to expose)
  appId: import.meta.env.VITE_SQUARE_APP_ID || '',
  locationId: import.meta.env.VITE_SQUARE_LOCATION_ID || '',
  environment: (import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  
  // API base URLs
  get apiBaseUrl() {
    return this.environment === 'production' 
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
  },
  
  // Web SDK URLs
  get webSdkUrl() {
    return this.environment === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
  },
};

// Validate configuration
export const validateSquareConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!SQUARE_CONFIG.appId) {
    errors.push('VITE_SQUARE_APP_ID is not configured');
  }
  if (!SQUARE_CONFIG.locationId) {
    errors.push('VITE_SQUARE_LOCATION_ID is not configured');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Test credit cards for Sandbox
export const SQUARE_TEST_CARDS = {
  // Successful payments
  SUCCESS: {
    number: '4532 0123 4567 8910',
    cvv: '111',
    expiration: '12/25',
    postalCode: '12345',
  },
  // Declined cards for testing error handling
  DECLINED: {
    number: '4000 0000 0000 0002',
    cvv: '111', 
    expiration: '12/25',
    postalCode: '12345',
  },
  // Card requiring verification
  VERIFY: {
    number: '4000 0000 0000 3220',
    cvv: '111',
    expiration: '12/25',
    postalCode: '12345',
  },
};
