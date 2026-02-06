// src/services/square.ts
// Square Payment Integration Service
// Documentation: https://developer.squareup.com/docs

import { Invoice, InvoicePayment } from '../types';

// ============ CONFIGURATION ============
// These should be set via environment variables
const SQUARE_CONFIG = {
  // For production, use: 'https://connect.squareup.com'
  // For sandbox, use: 'https://connect.squareupsandbox.com'
  baseUrl: import.meta.env.VITE_SQUARE_BASE_URL || 'https://connect.squareupsandbox.com',
  
  // Access token from Square Developer Dashboard
  accessToken: import.meta.env.VITE_SQUARE_ACCESS_TOKEN || '',
  
  // Location ID from Square Dashboard
  locationId: import.meta.env.VITE_SQUARE_LOCATION_ID || '',
  
  // Application ID
  applicationId: import.meta.env.VITE_SQUARE_APP_ID || '',
};

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

// ============ HELPER FUNCTIONS ============

/**
 * Check if Square is properly configured
 */
export const isSquareConfigured = (): boolean => {
  return !!(
    SQUARE_CONFIG.accessToken &&
    SQUARE_CONFIG.locationId &&
    SQUARE_CONFIG.applicationId
  );
};

/**
 * Get Square configuration status for debugging
 */
export const getSquareConfigStatus = () => ({
  isConfigured: isSquareConfigured(),
  hasAccessToken: !!SQUARE_CONFIG.accessToken,
  hasLocationId: !!SQUARE_CONFIG.locationId,
  hasApplicationId: !!SQUARE_CONFIG.applicationId,
  environment: SQUARE_CONFIG.baseUrl.includes('sandbox') ? 'sandbox' : 'production',
});

/**
 * Make authenticated request to Square API
 */
const squareRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  if (!isSquareConfigured()) {
    throw new Error('Square is not configured. Please set environment variables.');
  }

  const response = await fetch(`${SQUARE_CONFIG.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${SQUARE_CONFIG.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.errors?.[0]?.detail || 'Square API error';
    throw new Error(errorMessage);
  }

  return data;
};

/**
 * Generate idempotency key for Square API requests
 */
const generateIdempotencyKey = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

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
 */
export const createPaymentLink = async (
  invoice: Invoice
): Promise<SquarePaymentLink> => {
  try {
    // Build order line items from invoice line items
    const lineItems = invoice.lineItems.map((item) => ({
      name: item.description,
      quantity: item.quantity.toString(),
      base_price_money: {
        amount: dollarsToCents(item.unitPrice),
        currency: 'USD',
      },
    }));

    // Add tax as a line item if present
    if (invoice.taxAmount && invoice.taxAmount > 0) {
      lineItems.push({
        name: `Tax (${invoice.taxRate}%)`,
        quantity: '1',
        base_price_money: {
          amount: dollarsToCents(invoice.taxAmount),
          currency: 'USD',
        },
      });
    }

    // Create the payment link
    const response = await squareRequest('/v2/online-checkout/payment-links', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: generateIdempotencyKey(),
        quick_pay: {
          name: invoice.title,
          price_money: {
            amount: dollarsToCents(invoice.total),
            currency: 'USD',
          },
          location_id: SQUARE_CONFIG.locationId,
        },
        checkout_options: {
          redirect_url: `${window.location.origin}/invoices/${invoice.id}/payment-complete`,
          ask_for_shipping_address: false,
          accepted_payment_methods: {
            apple_pay: true,
            google_pay: true,
            cash_app_pay: true,
          },
        },
        pre_populated_data: {
          buyer_email: invoice.clientEmail,
        },
        payment_note: `Invoice: ${invoice.invoiceNumber}`,
      }),
    });

    return {
      id: response.payment_link.id,
      url: response.payment_link.url,
      createdAt: response.payment_link.created_at,
      orderId: response.payment_link.order_id,
    };
  } catch (error: any) {
    console.error('Error creating Square payment link:', error);
    throw new Error(`Failed to create payment link: ${error.message}`);
  }
};

/**
 * Get payment link status
 */
export const getPaymentLinkStatus = async (
  paymentLinkId: string
): Promise<any> => {
  try {
    const response = await squareRequest(`/v2/online-checkout/payment-links/${paymentLinkId}`);
    return response.payment_link;
  } catch (error: any) {
    console.error('Error getting payment link status:', error);
    throw error;
  }
};

/**
 * Delete/cancel a payment link
 */
export const deletePaymentLink = async (paymentLinkId: string): Promise<void> => {
  try {
    await squareRequest(`/v2/online-checkout/payment-links/${paymentLinkId}`, {
      method: 'DELETE',
    });
  } catch (error: any) {
    console.error('Error deleting payment link:', error);
    throw error;
  }
};

// ============ INVOICE FUNCTIONS (Square Invoices API) ============

/**
 * Create a Square invoice (more formal than payment link)
 */
export const createSquareInvoice = async (
  invoice: Invoice
): Promise<SquareInvoice> => {
  try {
    // First, create a customer if needed
    const customerId = await getOrCreateCustomer(
      invoice.clientEmail,
      invoice.clientName
    );

    // Create an order for the invoice
    const orderResponse = await squareRequest('/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: generateIdempotencyKey(),
        order: {
          location_id: SQUARE_CONFIG.locationId,
          customer_id: customerId,
          line_items: invoice.lineItems.map((item) => ({
            name: item.description,
            quantity: item.quantity.toString(),
            base_price_money: {
              amount: dollarsToCents(item.unitPrice),
              currency: 'USD',
            },
          })),
          taxes: invoice.taxRate
            ? [{
                name: 'Sales Tax',
                percentage: invoice.taxRate.toString(),
                scope: 'ORDER',
              }]
            : [],
          discounts: invoice.discount
            ? [{
                name: 'Discount',
                amount_money: {
                  amount: dollarsToCents(invoice.discount),
                  currency: 'USD',
                },
                scope: 'ORDER',
              }]
            : [],
        },
      }),
    });

    // Create the invoice
    const invoiceResponse = await squareRequest('/v2/invoices', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: generateIdempotencyKey(),
        invoice: {
          location_id: SQUARE_CONFIG.locationId,
          order_id: orderResponse.order.id,
          primary_recipient: {
            customer_id: customerId,
          },
          payment_requests: [{
            request_type: 'BALANCE',
            due_date: invoice.dueDate,
            tipping_enabled: false,
            automatic_payment_source: 'NONE',
            reminders: [
              { relative_scheduled_days: -7, message: 'Invoice due in 7 days' },
              { relative_scheduled_days: 0, message: 'Invoice due today' },
              { relative_scheduled_days: 7, message: 'Invoice overdue' },
            ],
          }],
          delivery_method: 'EMAIL',
          invoice_number: invoice.invoiceNumber,
          title: invoice.title,
          description: invoice.notes || '',
          scheduled_at: new Date().toISOString(),
          accepted_payment_methods: {
            card: true,
            square_gift_card: false,
            bank_account: true,
            buy_now_pay_later: false,
          },
        },
      }),
    });

    // Publish the invoice (sends it to the customer)
    const publishResponse = await squareRequest(
      `/v2/invoices/${invoiceResponse.invoice.id}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({
          idempotency_key: generateIdempotencyKey(),
          version: invoiceResponse.invoice.version,
        }),
      }
    );

    return {
      id: publishResponse.invoice.id,
      invoiceNumber: publishResponse.invoice.invoice_number,
      publicUrl: publishResponse.invoice.public_url,
      status: publishResponse.invoice.status,
    };
  } catch (error: any) {
    console.error('Error creating Square invoice:', error);
    throw new Error(`Failed to create Square invoice: ${error.message}`);
  }
};

// ============ CUSTOMER FUNCTIONS ============

/**
 * Get or create a Square customer
 */
const getOrCreateCustomer = async (
  email: string,
  name: string
): Promise<string> => {
  try {
    // Search for existing customer
    const searchResponse = await squareRequest('/v2/customers/search', {
      method: 'POST',
      body: JSON.stringify({
        query: {
          filter: {
            email_address: {
              exact: email,
            },
          },
        },
      }),
    });

    if (searchResponse.customers && searchResponse.customers.length > 0) {
      return searchResponse.customers[0].id;
    }

    // Create new customer
    const nameParts = name.split(' ');
    const createResponse = await squareRequest('/v2/customers', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: generateIdempotencyKey(),
        given_name: nameParts[0] || name,
        family_name: nameParts.slice(1).join(' ') || '',
        email_address: email,
      }),
    });

    return createResponse.customer.id;
  } catch (error: any) {
    console.error('Error managing customer:', error);
    throw error;
  }
};

// ============ PAYMENT VERIFICATION ============

/**
 * Verify a payment was completed (webhook alternative - poll based)
 */
export const verifyPayment = async (
  orderId: string
): Promise<SquarePaymentResult> => {
  try {
    const response = await squareRequest(`/v2/orders/${orderId}`);
    const order = response.order;

    if (order.state === 'COMPLETED') {
      // Get payment details
      const tenders = order.tenders || [];
      const payment = tenders[0];

      return {
        success: true,
        paymentId: payment?.id,
        transactionId: payment?.transaction_id,
      };
    }

    return {
      success: false,
      error: `Order state: ${order.state}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get payment history for an order
 */
export const getPaymentHistory = async (orderId: string): Promise<any[]> => {
  try {
    const response = await squareRequest('/v2/payments', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
      }),
    });

    return response.payments || [];
  } catch (error: any) {
    console.error('Error getting payment history:', error);
    return [];
  }
};

// ============ REFUND FUNCTIONS ============

/**
 * Issue a refund for a payment
 */
export const issueRefund = async (
  paymentId: string,
  amountDollars: number,
  reason?: string
): Promise<{ success: boolean; refundId?: string; error?: string }> => {
  try {
    const response = await squareRequest('/v2/refunds', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: generateIdempotencyKey(),
        payment_id: paymentId,
        amount_money: {
          amount: dollarsToCents(amountDollars),
          currency: 'USD',
        },
        reason: reason || 'Customer refund',
      }),
    });

    return {
      success: true,
      refundId: response.refund.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ============ EXPORT CONFIG FOR SETUP INSTRUCTIONS ============

export const getSquareSetupInstructions = () => `

${JSON.stringify(getSquareConfigStatus(), null, 2)}
`;