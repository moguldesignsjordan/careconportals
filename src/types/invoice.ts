// src/types/invoice.ts

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

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  note?: string;
  transactionId?: string;
  processedBy?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  description?: string;
  projectId?: string;
  clientId: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  taxRate: number;
  createdAt: string;
  updatedAt: string;
  issueDate?: string;
  dueDate: string;
  paidAt?: string;
  payments: InvoicePayment[];
  allowPartialPayments: boolean;
  autoPayEnabled: boolean;
  acceptedPaymentMethods: PaymentMethod[];
  customerNotes?: string;
  internalNotes?: string;
  squarePaymentUrl?: string;
  createdBy: string;
}

export interface CreateInvoiceData {
  title: string;
  description?: string;
  projectId?: string;
  clientId: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
  taxRate: number;
  discountAmount: number;
  dueDate: string;
  allowPartialPayments: boolean;
  autoPayEnabled: boolean;
  acceptedPaymentMethods: PaymentMethod[];
  customerNotes?: string;
  internalNotes?: string;
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