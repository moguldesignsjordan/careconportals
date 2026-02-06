// Square Payment Integration Service
// All Square API calls route through Firebase Cloud Functions (keeps tokens server-side)
// Documentation: https://developer.squareup.com/docs

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { Invoice, InvoicePayment } from '../types';

// ============ TYPES ============

interface SquarePaymentLink {
  id: string;
  url: string;
  createdAt: string;
  orderId: string;
}

interface SquareInvoice {
  id: string;
  invoiceNumber: string;
  publicUrl: string;
  status: string;
}

interface SquarePaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  error?: string;
}

// ============ CLOUD FUNCTION REFERENCES ============

const createSquarePaymentLinkFn = httpsCallable<
  {
    invoiceId: string;
    title: string;
    amountCents: number;
    customerEmail?: string;
    invoiceNumber: string;
  },
  {
    success: boolean;
    paymentUrl: string;
    paymentLinkId: string;
  }
>(functions, 'createSquarePaymentLink');

const checkPaymentStatusFn = httpsCallable<
  { invoiceId: string },
  { status: string; paid: boolean }
>(functions, 'checkPaymentStatus');

// ============ CONFIGURATION / STATUS ============

/**
 * Check if Square is properly configured
 * Real validation happens server-side in Cloud Functions
 */
export const isSquareConfigured = (): boolean => {
  // Square credentials live server-side now — always return true
  // The Cloud Function will throw a proper error if not configured
  return true;
};

/**
 * Get Square configuration status for debugging
 */
export const getSquareConfigStatus = () => ({
  isConfigured: true,
  mode: 'cloud-functions',
  note: 'Square credentials are stored server-side in Firebase Cloud Functions',
});

// ============ HELPER FUNCTIONS ============

/**
 * Convert dollars to cents for Square API
 */
const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

// ============ PAYMENT LINK FUNCTIONS ============

/**
 * Create a Square payment link for an invoice
 * This allows clients to pay online without needing a Square account
 * Routes through createSquarePaymentLink Cloud Function
 */
export const createPaymentLink = async (
  invoice: Invoice
): Promise<SquarePaymentLink> => {
  try {
    const result = await createSquarePaymentLinkFn({
      invoiceId: invoice.id,
      title: invoice.title,
      amountCents: invoice.totalAmount, // Already in cents per types
      customerEmail: (invoice as any).clientEmail,
      invoiceNumber: invoice.invoiceNumber,
    });

    const data = result.data;

    if (!data.success || !data.paymentUrl) {
      throw new Error('Failed to create payment link');
    }

    return {
      id: data.paymentLinkId,
      url: data.paymentUrl,
      createdAt: new Date().toISOString(),
      orderId: '', // Saved to Firestore by the Cloud Function
    };
  } catch (error: any) {
    console.error('Error creating Square payment link:', error);
    // Extract meaningful message from Firebase HttpsError
    const message =
      error?.message ||
      error?.details ||
      'Failed to create payment link';
    throw new Error(message);
  }
};

/**
 * Get payment link status
 * Note: For now, use checkPaymentStatus which checks the order status
 */
export const getPaymentLinkStatus = async (
  paymentLinkId: string
): Promise<any> => {
  // Payment link status is tracked via the order/invoice in Firestore
  // The squareWebhook Cloud Function updates it automatically
  console.warn(
    'getPaymentLinkStatus: Use checkPaymentStatus(invoiceId) instead.',
    'Payment status is tracked server-side via webhooks.'
  );
  return { id: paymentLinkId, status: 'unknown' };
};

/**
 * Delete/cancel a payment link
 * TODO: Implement as a Cloud Function if needed
 */
export const deletePaymentLink = async (paymentLinkId: string): Promise<void> => {
  console.warn(
    'deletePaymentLink: Not yet implemented as a Cloud Function.',
    'Payment link ID:', paymentLinkId
  );
  // To implement: create a deleteSquarePaymentLink Cloud Function
};

// ============ INVOICE FUNCTIONS ============

/**
 * Create a Square invoice (more formal than payment link)
 * TODO: Implement as a Cloud Function for full invoice workflow
 */
export const createSquareInvoice = async (
  invoice: Invoice
): Promise<SquareInvoice> => {
  // For now, use payment links (createPaymentLink) which are simpler
  // Full Square Invoices API integration requires additional Cloud Functions
  throw new Error(
    'Square Invoices API not yet implemented as Cloud Function. ' +
    'Use createPaymentLink() for payment collection.'
  );
};

// ============ CUSTOMER FUNCTIONS ============
// Customer management is handled server-side by Cloud Functions
// No client-side implementation needed

// ============ PAYMENT VERIFICATION ============

/**
 * Verify a payment was completed
 * Routes through checkPaymentStatus Cloud Function
 */
export const verifyPayment = async (
  orderId: string
): Promise<SquarePaymentResult> => {
  // Note: This now works by invoiceId, not orderId
  // The Cloud Function checks the Square order and updates Firestore
  console.warn(
    'verifyPayment: Use checkPaymentStatus(invoiceId) instead.',
    'The Cloud Function handles order lookup internally.'
  );
  return {
    success: false,
    error: 'Use checkPaymentStatus(invoiceId) instead',
  };
};

/**
 * Check if a payment has been completed for an invoice
 * Routes through checkPaymentStatus Cloud Function
 */
export const checkPaymentStatus = async (
  invoiceId: string
): Promise<{ status: string; paid: boolean }> => {
  try {
    const result = await checkPaymentStatusFn({ invoiceId });
    return result.data;
  } catch (error: any) {
    console.error('Error checking payment status:', error);
    return { status: 'error', paid: false };
  }
};

/**
 * Get payment history for an order
 * Payment history is stored in the invoice document in Firestore
 */
export const getPaymentHistory = async (orderId: string): Promise<any[]> => {
  // Payment records are stored in the invoice's payments array in Firestore
  // Read them directly from Firestore instead of calling Square API
  console.warn(
    'getPaymentHistory: Read from Firestore invoice.payments instead.',
    'The webhook Cloud Function updates payment records automatically.'
  );
  return [];
};

// ============ REFUND FUNCTIONS ============

/**
 * Issue a refund for a payment
 * TODO: Implement as a Cloud Function
 */
export const issueRefund = async (
  paymentId: string,
  amountDollars: number,
  reason?: string
): Promise<{ success: boolean; refundId?: string; error?: string }> => {
  // To implement: create an issueSquareRefund Cloud Function
  console.warn(
    'issueRefund: Not yet implemented as a Cloud Function.',
    'Payment ID:', paymentId
  );
  return {
    success: false,
    error: 'Refunds via Cloud Function not yet implemented',
  };
};
