// ============ INVOICE TYPES ============
// Add these to your existing src/types.ts file

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  SQUARE_ONLINE = 'SQUARE_ONLINE',      // Client pays via Square hosted page
  CARD_ON_FILE = 'CARD_ON_FILE',        // Auto-charge saved card
  CASH = 'CASH',                         // Manual: cash payment
  CHECK = 'CHECK',                       // Manual: check payment
  BANK_TRANSFER = 'BANK_TRANSFER',       // Manual: bank transfer
  OTHER = 'OTHER',                       // Manual: other method
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;          // In cents
  totalPrice: number;         // quantity * unitPrice (in cents)
  milestoneId?: string;       // Optional link to project milestone
}

export interface InvoicePayment {
  id: string;
  amount: number;             // In cents
  method: PaymentMethod;
  transactionId?: string;     // Square transaction ID if applicable
  paidAt: string;             // ISO timestamp
  note?: string;
  recordedBy: string;         // User ID who recorded this (for manual payments)
}

export interface Invoice {
  id: string;
  
  // Square Integration
  squareInvoiceId?: string;   // Square's invoice ID
  squareOrderId?: string;     // Square's order ID
  squarePaymentUrl?: string;  // URL to Square's hosted payment page
  
  // Invoice Details
  invoiceNumber: string;      // Human-readable invoice number (e.g., "INV-0001")
  title: string;
  description?: string;
  
  // Relationships
  projectId?: string;         // Optional - can be standalone
  projectTitle?: string;      // Denormalized for display
  clientId: string;           // Primary client
  clientIds?: string[];       // All clients who can view/pay
  
  // Line Items
  lineItems: InvoiceLineItem[];
  
  // Financials (all in cents)
  subtotal: number;
  taxRate?: number;           // As decimal (e.g., 0.08 for 8%)
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  
  // Payment Settings
  acceptedPaymentMethods: {
    card: boolean;
    bankAccount: boolean;
    squareGiftCard: boolean;
    cashAppPay: boolean;
  };
  allowPartialPayments: boolean;
  autoPayEnabled: boolean;    // If true, charges card on file on due date
  cardOnFileId?: string;      // Square card ID for auto-pay
  
  // Dates
  issueDate: string;          // ISO date string
  dueDate: string;            // ISO date string
  scheduledSendDate?: string; // If scheduled for future send
  paidAt?: string;            // When fully paid
  
  // Payments History
  payments: InvoicePayment[];
  
  // Status
  status: InvoiceStatus;
  
  // Reminders
  remindersSent: number;
  lastReminderAt?: string;
  
  // Metadata
  createdBy: string;          // Admin/user who created
  createdAt: string;
  updatedAt: string;
  
  // Notes
  internalNotes?: string;     // Admin-only notes
  customerNotes?: string;     // Notes visible to customer
}

// For creating invoices
export interface CreateInvoiceData {
  title: string;
  description?: string;
  projectId?: string;
  clientId: string;
  lineItems: Omit<InvoiceLineItem, 'id' | 'totalPrice'>[];
  taxRate?: number;
  discountAmount?: number;
  dueDate: string;
  scheduledSendDate?: string;
  allowPartialPayments: boolean;
  autoPayEnabled: boolean;
  cardOnFileId?: string;
  customerNotes?: string;
  internalNotes?: string;
  acceptedPaymentMethods?: {
    card: boolean;
    bankAccount: boolean;
    squareGiftCard: boolean;
    cashAppPay: boolean;
  };
}

// Square webhook event types we care about
export type SquareWebhookEventType = 
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.published'
  | 'invoice.scheduled_charge_failed'
  | 'invoice.payment_made'
  | 'invoice.canceled'
  | 'invoice.refunded';

export interface SquareWebhookEvent {
  merchant_id: string;
  type: SquareWebhookEventType;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: {
      invoice?: any;
      payment?: any;
    };
  };
}
