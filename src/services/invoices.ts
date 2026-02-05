// src/services/invoices.ts
// Invoice management service - Firestore operations + Square API calls

import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  orderBy,
  getDoc,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { 
  Invoice, 
  InvoiceStatus, 
  InvoicePayment,
  PaymentMethod,
  CreateInvoiceData,
  InvoiceLineItem,
} from '../types';
import { User, UserRole } from '../types';

// ============ INVOICE NUMBER GENERATION ============

/**
 * Generate next invoice number (INV-0001, INV-0002, etc.)
 */
export const generateInvoiceNumber = async (): Promise<string> => {
  const invoicesRef = collection(db, 'invoices');
  const q = query(invoicesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  let maxNumber = 0;
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.invoiceNumber) {
      const match = data.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  });
  
  const nextNumber = maxNumber + 1;
  return `INV-${nextNumber.toString().padStart(4, '0')}`;
};

// ============ SUBSCRIBE TO INVOICES ============

/**
 * Subscribe to invoices based on user role
 * - ADMIN: sees all invoices
 * - CLIENT: sees invoices where they are the recipient
 * - CONTRACTOR: sees invoices for projects they're assigned to
 */
export const subscribeToInvoices = (
  user: User, 
  callback: (invoices: Invoice[]) => void
) => {
  let q;
  
  if (user.role === UserRole.ADMIN) {
    // Admin sees all invoices
    q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  } else if (user.role === UserRole.CLIENT) {
    // Client sees their invoices
    q = query(
      collection(db, 'invoices'), 
      where('clientIds', 'array-contains', user.id),
      orderBy('createdAt', 'desc')
    );
  } else {
    // Contractors see invoices for their projects (read-only)
    // This requires a composite index on projectId + createdAt
    q = query(
      collection(db, 'invoices'),
      orderBy('createdAt', 'desc')
    );
  }

  return onSnapshot(q, (snapshot) => {
    let invoices = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Invoice));
    
    // For contractors, filter to only their projects client-side
    // (Firestore can't do complex queries across arrays)
    if (user.role === UserRole.CONTRACTOR) {
      // This would need access to the user's project IDs
      // For now, contractors don't see invoices
      invoices = [];
    }
    
    callback(invoices);
  }, (error) => {
    console.error("Error fetching invoices:", error);
    callback([]);
  });
};

/**
 * Subscribe to invoices for a specific project
 */
export const subscribeToProjectInvoices = (
  projectId: string,
  callback: (invoices: Invoice[]) => void
) => {
  const q = query(
    collection(db, 'invoices'),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Invoice));
    callback(invoices);
  }, (error) => {
    console.error("Error fetching project invoices:", error);
    callback([]);
  });
};

// ============ CREATE INVOICE ============

/**
 * Calculate invoice totals from line items
 */
const calculateInvoiceTotals = (
  lineItems: InvoiceLineItem[],
  taxRate: number = 0,
  discountAmount: number = 0
) => {
  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const totalAmount = subtotal + taxAmount - discountAmount;
  
  return {
    subtotal,
    taxAmount,
    totalAmount,
    amountDue: totalAmount,
    amountPaid: 0,
  };
};

/**
 * Create a new invoice (local only - doesn't create in Square yet)
 * Call publishInvoice to send to Square and customer
 */
export const createInvoice = async (
  data: CreateInvoiceData,
  createdBy: string,
  projectTitle?: string
): Promise<string> => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    
    // Generate IDs for line items and calculate totals
    const lineItems: InvoiceLineItem[] = data.lineItems.map((item, index) => ({
      id: `item-${Date.now()}-${index}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      milestoneId: item.milestoneId,
    }));
    
    const totals = calculateInvoiceTotals(
      lineItems,
      data.taxRate || 0,
      data.discountAmount || 0
    );
    
    const invoice: Omit<Invoice, 'id'> = {
      invoiceNumber,
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      projectTitle: projectTitle,
      clientId: data.clientId,
      clientIds: [data.clientId],
      lineItems,
      ...totals,
      taxRate: data.taxRate || 0,
      discountAmount: data.discountAmount || 0,
      acceptedPaymentMethods: data.acceptedPaymentMethods || {
        card: true,
        bankAccount: false,
        squareGiftCard: false,
        cashAppPay: true,
      },
      allowPartialPayments: data.allowPartialPayments,
      autoPayEnabled: data.autoPayEnabled,
      cardOnFileId: data.cardOnFileId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: data.dueDate,
      scheduledSendDate: data.scheduledSendDate,
      payments: [],
      status: InvoiceStatus.DRAFT,
      remindersSent: 0,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      internalNotes: data.internalNotes,
      customerNotes: data.customerNotes,
    };
    
    const docRef = await addDoc(collection(db, 'invoices'), invoice);
    return docRef.id;
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw error;
  }
};

// ============ PUBLISH INVOICE (SEND TO SQUARE) ============

/**
 * Publish invoice - creates order in Square, creates invoice, sends to customer
 * This calls a Firebase Cloud Function that handles the Square API securely
 */
export const publishInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const publishInvoiceFn = httpsCallable(functions, 'publishInvoice');
    const result = await publishInvoiceFn({ invoiceId });
    
    // The cloud function updates the invoice document with Square IDs
    console.log('Invoice published:', result.data);
  } catch (error: any) {
    console.error("Error publishing invoice:", error);
    throw new Error(error.message || 'Failed to publish invoice');
  }
};

// ============ UPDATE INVOICE ============

/**
 * Update a draft invoice (can't update published invoices)
 */
export const updateInvoice = async (
  invoiceId: string,
  updates: Partial<CreateInvoiceData>
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }
    
    const currentInvoice = invoiceDoc.data() as Invoice;
    
    if (currentInvoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Cannot edit a published invoice');
    }
    
    const updateData: any = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // Recalculate totals if line items changed
    if (updates.lineItems) {
      const lineItems: InvoiceLineItem[] = updates.lineItems.map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        milestoneId: item.milestoneId,
      }));
      
      const totals = calculateInvoiceTotals(
        lineItems,
        updates.taxRate ?? currentInvoice.taxRate ?? 0,
        updates.discountAmount ?? currentInvoice.discountAmount ?? 0
      );
      
      Object.assign(updateData, { lineItems, ...totals });
    }
    
    await updateDoc(invoiceRef, updateData);
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw error;
  }
};

// ============ CANCEL INVOICE ============

/**
 * Cancel an invoice (also cancels in Square if published)
 */
export const cancelInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceDoc.data() as Invoice;
    
    // If published to Square, cancel there too
    if (invoice.squareInvoiceId) {
      const cancelInvoiceFn = httpsCallable(functions, 'cancelInvoice');
      await cancelInvoiceFn({ invoiceId });
    } else {
      // Just update local status
      await updateDoc(invoiceRef, {
        status: InvoiceStatus.CANCELED,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error canceling invoice:", error);
    throw error;
  }
};

// ============ DELETE INVOICE ============

/**
 * Delete a draft invoice (can't delete published invoices)
 */
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceDoc.data() as Invoice;
    
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Cannot delete a published invoice. Cancel it instead.');
    }
    
    await deleteDoc(invoiceRef);
  } catch (error) {
    console.error("Error deleting invoice:", error);
    throw error;
  }
};

// ============ RECORD MANUAL PAYMENT ============

/**
 * Record a manual payment (cash, check, bank transfer)
 */
export const recordManualPayment = async (
  invoiceId: string,
  payment: {
    amount: number;
    method: PaymentMethod;
    note?: string;
  },
  recordedBy: string
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceDoc.data() as Invoice;
    
    if (invoice.status === InvoiceStatus.CANCELED) {
      throw new Error('Cannot record payment on a canceled invoice');
    }
    
    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Invoice is already fully paid');
    }
    
    const newPayment: InvoicePayment = {
      id: `payment-${Date.now()}`,
      amount: payment.amount,
      method: payment.method,
      paidAt: new Date().toISOString(),
      note: payment.note,
      recordedBy,
    };
    
    const payments = [...(invoice.payments || []), newPayment];
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const amountDue = invoice.totalAmount - amountPaid;
    
    let status = invoice.status;
    let paidAt = invoice.paidAt;
    
    if (amountDue <= 0) {
      status = InvoiceStatus.PAID;
      paidAt = new Date().toISOString();
    } else if (amountPaid > 0) {
      status = InvoiceStatus.PARTIALLY_PAID;
    }
    
    await updateDoc(invoiceRef, {
      payments,
      amountPaid,
      amountDue: Math.max(0, amountDue),
      status,
      paidAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    throw error;
  }
};

// ============ SEND REMINDER ============

/**
 * Send a payment reminder (via Square)
 */
export const sendInvoiceReminder = async (invoiceId: string): Promise<void> => {
  try {
    const sendReminderFn = httpsCallable(functions, 'sendInvoiceReminder');
    await sendReminderFn({ invoiceId });
  } catch (error: any) {
    console.error("Error sending reminder:", error);
    throw new Error(error.message || 'Failed to send reminder');
  }
};

// ============ GET INVOICE STATS ============

/**
 * Get invoice statistics for dashboard
 */
export const getInvoiceStats = (invoices: Invoice[]) => {
  const stats = {
    total: invoices.length,
    draft: 0,
    sent: 0,
    overdue: 0,
    paid: 0,
    partiallyPaid: 0,
    canceled: 0,
    totalRevenue: 0,        // Sum of paid amounts
    outstandingAmount: 0,   // Sum of unpaid amounts
    overdueAmount: 0,       // Sum of overdue amounts
  };
  
  const today = new Date().toISOString().split('T')[0];
  
  invoices.forEach(invoice => {
    switch (invoice.status) {
      case InvoiceStatus.DRAFT:
        stats.draft++;
        break;
      case InvoiceStatus.SENT:
      case InvoiceStatus.SCHEDULED:
        stats.sent++;
        if (invoice.dueDate < today) {
          stats.overdue++;
          stats.overdueAmount += invoice.amountDue;
        } else {
          stats.outstandingAmount += invoice.amountDue;
        }
        break;
      case InvoiceStatus.OVERDUE:
        stats.overdue++;
        stats.overdueAmount += invoice.amountDue;
        break;
      case InvoiceStatus.PARTIALLY_PAID:
        stats.partiallyPaid++;
        stats.totalRevenue += invoice.amountPaid;
        if (invoice.dueDate < today) {
          stats.overdueAmount += invoice.amountDue;
        } else {
          stats.outstandingAmount += invoice.amountDue;
        }
        break;
      case InvoiceStatus.PAID:
        stats.paid++;
        stats.totalRevenue += invoice.amountPaid;
        break;
      case InvoiceStatus.CANCELED:
        stats.canceled++;
        break;
    }
  });
  
  return stats;
};

// ============ FORMAT HELPERS ============

/**
 * Format cents to dollars string
 */
export const formatCurrency = (cents: number): string => {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

/**
 * Parse dollars to cents
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Get status badge color
 */
export const getInvoiceStatusColor = (status: InvoiceStatus): string => {
  switch (status) {
    case InvoiceStatus.DRAFT:
      return 'bg-gray-100 text-gray-700';
    case InvoiceStatus.SCHEDULED:
      return 'bg-blue-100 text-blue-700';
    case InvoiceStatus.SENT:
      return 'bg-amber-100 text-amber-700';
    case InvoiceStatus.PARTIALLY_PAID:
      return 'bg-violet-100 text-violet-700';
    case InvoiceStatus.PAID:
      return 'bg-emerald-100 text-emerald-700';
    case InvoiceStatus.OVERDUE:
      return 'bg-red-100 text-red-700';
    case InvoiceStatus.CANCELED:
      return 'bg-gray-100 text-gray-500';
    case InvoiceStatus.REFUNDED:
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};
