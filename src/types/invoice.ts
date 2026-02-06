// src/types/invoice.ts
// Complete Invoice Type Definitions

// ============ ENUMS ============

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
  CASH = 'CASH',
  CHECK = 'CHECK',
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  SQUARE = 'SQUARE',
  OTHER = 'OTHER',
}

// ============ LINE ITEMS ============

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  totalPrice: number; // quantity * unitPrice (in cents)
}

// ============ PAYMENTS ============

export interface InvoicePayment {
  id: string;
  amount: number; // in cents
  method: PaymentMethod;
  paidAt: string; // ISO date string
  note?: string;
  transactionId?: string; // Square transaction ID if applicable
  processedBy?: string; // User ID who recorded the payment
}

// ============ MAIN INVOICE ============

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g., "INV-2024-0001"
  
  // Title and description
  title: string;
  description?: string;
  
  // Linked entities
  projectId?: string;
  clientId: string;
  
  // Status
  status: InvoiceStatus;
  
  // Line items
  lineItems: InvoiceLineItem[];
  
  // Amounts (all in cents)
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  
  // Tax
  taxRate: number; // decimal (e.g., 0.0825 for 8.25%)
  
  // Dates
  createdAt: string;
  updatedAt: string;
  issueDate?: string;
  dueDate: string;
  scheduledSendDate?: string;
  paidAt?: string;
  
  // Payments
  payments: InvoicePayment[];
  
  // Payment options
  allowPartialPayments: boolean;
  autoPayEnabled: boolean;
  acceptedPaymentMethods: PaymentMethod[];
  
  // Notes
  customerNotes?: string;
  internalNotes?: string;
  
  // Square integration
  squareInvoiceId?: string;
  squarePaymentUrl?: string;
  
  // Metadata
  createdBy: string;
}

// ============ CREATE INVOICE DATA ============

export interface CreateInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
}

export interface CreateInvoiceData {
  title: string;
  description?: string;
  projectId?: string;
  clientId: string;
  
  lineItems: CreateInvoiceLineItem[];
  
  taxRate: number;
  discountAmount: number;
  
  dueDate: string;
  scheduledSendDate?: string;
  
  allowPartialPayments: boolean;
  autoPayEnabled: boolean;
  acceptedPaymentMethods: PaymentMethod[];
  
  customerNotes?: string;
  internalNotes?: string;
}

// ============ RECORD PAYMENT DATA ============

export interface RecordPaymentData {
  amount: number; // in cents
  method: PaymentMethod;
  note?: string;
  transactionId?: string;
}

// ============ INVOICE STATISTICS ============

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  partiallyPaid: number;
  totalRevenue: number; // in cents
  outstandingBalance: number; // in cents
}

// ============ HELPER TYPES ============

export interface InvoiceFilters {
  status?: InvoiceStatus | 'all';
  clientId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface InvoiceSortOptions {
  field: 'createdAt' | 'dueDate' | 'totalAmount' | 'invoiceNumber' | 'status';
  direction: 'asc' | 'desc';
}