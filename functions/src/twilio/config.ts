import * as twilio from "twilio";
 
// ── Lazy client initialization ───────────────────────────────────────
// Don't instantiate at top level to avoid issues with module loading
let twilioClient: twilio.Twilio | null = null;
 
/**
 * Get Twilio client (lazy initialization)
 */
export const getTwilioClient = (): twilio.Twilio => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
 
    if (!accountSid || !authToken) {
      throw new Error(
        "Twilio credentials not configured. " +
        "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in functions/.env"
      );
    }
 
    twilioClient = twilio.default(accountSid, authToken);
  }
 
  return twilioClient;
};
 
/**
 * Get Twilio configuration values
 */
export const getTwilioConfig = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || "",
  authToken: process.env.TWILIO_AUTH_TOKEN || "",
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  portalUrl: process.env.PORTAL_URL || "https://your-portal.vercel.app",
});
 
/**
 * Validate webhook signature from Twilio
 * Use this to verify inbound requests are actually from Twilio
 */
export const validateTwilioSignature = (
  signature: string,
  url: string,
  params: Record<string, string>
): boolean => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;
 
  return twilio.validateRequest(authToken, signature, url, params);
};
 
/**
 * Format phone number to E.164 format
 * Ensures consistent storage format
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");
 
  // If no country code, assume US (+1)
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+1" + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      cleaned = "+" + cleaned;
    }
  }
 
  return cleaned;
};
 
/**
 * Mask phone number for display (privacy)
 * +1234567890 → +1••••••7890
 */
export const maskPhoneNumber = (phone: string): string => {
  if (phone.length < 6) return phone;
  const visible = 4;
  const start = phone.slice(0, 2);
  const end = phone.slice(-visible);
  const masked = "•".repeat(phone.length - 2 - visible);
  return `${start}${masked}${end}`;
};