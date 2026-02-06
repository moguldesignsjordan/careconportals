// src/types/invoice.ts
// UNIFIED invoice types - single source of truth for all invoice-related types

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

// UNIFIED PaymentMethod - includes ALL values used across InvoiceDetailModal, 
// InvoicePaymentPage, InvoiceView, and services/invoices.ts
export enum PaymentMethod {
  SQUARE_ONLINE = 'SQUARE_ONLINE',      // Client pays via Square hosted page
  CARD_ON_FILE = 'CARD_ON_FILE',        // Auto-charge saved card
  CREDIT_CARD = 'CREDIT_CARD',          // Generic credit card payment
  CASH = 'CASH',                         // Manual: cash payment
  CHECK = 'CHECK',                       // Manual: check payment
  BANK_TRANSFER = 'BANK_TRANSFER',       // Manual: bank transfer
  SQUARE = 'SQUARE',                     // Square payment (generic)
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
  recordedBy?: string;        // User ID who recorded this (for manual payments)
  processedBy?: string;       // Alternative field name for recorder
}

export interface Invoice {
  id: string;
  
  // Square Integration
  squareInvoiceId?: string;
  squareOrderId?: string;
  squarePaymentUrl?: string;
  
  // Invoice Details
  invoiceNumber: string;
  title: string;
  description?: string;
  
  // Relationships
  projectId?: string;
  projectTitle?: string;
  clientId: string;
  clientIds?: string[];
  
  // Line Items
  lineItems: InvoiceLineItem[];
  
  // Financials (all in cents)
  subtotal: number;
  taxRate?: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  
  // Payment Settings
  acceptedPaymentMethods: PaymentMethod[] | {
    card: boolean;
    bankAccount: boolean;
    squareGiftCard: boolean;
    cashAppPay: boolean;
  };
  allowPartialPayments: boolean;
  autoPayEnabled: boolean;
  cardOnFileId?: string;
  
  // Dates
  issueDate?: string;
  dueDate: string;
  scheduledSendDate?: string;
  paidAt?: string;
  
  // Payments History
  payments: InvoicePayment[];
  
  // Status
  status: InvoiceStatus;
  
  // Reminders
  remindersSent?: number;
  lastReminderAt?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Notes
  internalNotes?: string;
  customerNotes?: string;
}

// For creating invoices
export interface CreateInvoiceData {
  title: string;
  description?: string;
  projectId?: string;
  clientId: string;
  lineItems: Omit<InvoiceLineItem, 'id' | 'totalPrice'>[] | { description: string; quantity: number; unitPrice: number }[];
  taxRate?: number;
  discountAmount?: number;
  dueDate: string;
  scheduledSendDate?: string;
  allowPartialPayments: boolean;
  autoPayEnabled: boolean;
  cardOnFileId?: string;
  customerNotes?: string;
  internalNotes?: string;
  acceptedPaymentMethods?: PaymentMethod[] | {
    card: boolean;
    bankAccount: boolean;
    squareGiftCard: boolean;
    cashAppPay: boolean;
  };
}

export interface RecordPaymentData {
  amount: number;
  method: PaymentMethod;
  note?: string;
  transactionId?: string;
}

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  partiallyPaid: number;
  totalRevenue: number;
  outstandingBalance: number;
}

// Square webhook event types
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