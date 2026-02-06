// src/services/invoices.ts
// Complete Invoice Service with Firebase and Square Integration

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Invoice,
  InvoiceStatus,
  CreateInvoiceData,
  RecordPaymentData,
  PaymentMethod,
  InvoiceLineItem,
  InvoicePayment,
  InvoiceStats,
} from '../types/invoice';
import { User, UserRole, Project } from '../types';

// ============ UTILITY FUNCTIONS ============

/**
 * Convert dollars to cents
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 */
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

/**
 * Format currency for display
 */
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

/**
 * Format currency from dollars
 */
export const formatDollars = (dollars: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
};

/**
 * Generate invoice number (incrementing format)
 */
export const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  try {
    const q = query(
      collection(db, 'invoices'),
      where('invoiceNumber', '>=', prefix),
      where('invoiceNumber', '<', `INV-${year + 1}-`),
      orderBy('invoiceNumber', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return `${prefix}0001`;
    }
    
    const lastInvoice = snapshot.docs[0].data();
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0', 10);
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
    
    return `${prefix}${nextNumber}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    // Fallback to timestamp-based number
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }
};

/**
 * Calculate invoice totals
 */
export const calculateInvoiceTotals = (
  lineItems: { quantity: number; unitPrice: number }[],
  taxRate: number,
  discountAmount: number
) => {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  const taxAmount = Math.round(subtotal * taxRate);
  const total = Math.max(0, subtotal + taxAmount - discountAmount);

  return {
    subtotal,
    taxAmount,
    totalAmount: total,
  };
};

/**
 * Get status display configuration
 */
export const getInvoiceStatusConfig = (status: InvoiceStatus): {
  label: string;
  color: string;
  bg: string;
} => {
  const configs: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
    [InvoiceStatus.DRAFT]: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
    [InvoiceStatus.SCHEDULED]: { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-100' },
    [InvoiceStatus.SENT]: { label: 'Sent', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    [InvoiceStatus.PARTIALLY_PAID]: { label: 'Partial', color: 'text-orange-600', bg: 'bg-orange-100' },
    [InvoiceStatus.PAID]: { label: 'Paid', color: 'text-green-600', bg: 'bg-green-100' },
    [InvoiceStatus.OVERDUE]: { label: 'Overdue', color: 'text-red-600', bg: 'bg-red-100' },
    [InvoiceStatus.CANCELED]: { label: 'Canceled', color: 'text-gray-400', bg: 'bg-gray-50' },
    [InvoiceStatus.REFUNDED]: { label: 'Refunded', color: 'text-purple-600', bg: 'bg-purple-100' },
  };
  return configs[status] || configs[InvoiceStatus.DRAFT];
};

/**
 * Calculate invoice statistics
 */
export const getInvoiceStats = (invoices: Invoice[]): InvoiceStats => {
  return {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === InvoiceStatus.DRAFT).length,
    sent: invoices.filter((i) => i.status === InvoiceStatus.SENT).length,
    paid: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
    overdue: invoices.filter((i) => i.status === InvoiceStatus.OVERDUE).length,
    partiallyPaid: invoices.filter((i) => i.status === InvoiceStatus.PARTIALLY_PAID).length,
    totalRevenue: invoices
      .filter((i) => i.status === InvoiceStatus.PAID || i.status === InvoiceStatus.PARTIALLY_PAID)
      .reduce((sum, i) => sum + i.amountPaid, 0),
    outstandingBalance: invoices
      .filter(
        (i) =>
          i.status !== InvoiceStatus.PAID &&
          i.status !== InvoiceStatus.CANCELED &&
          i.status !== InvoiceStatus.DRAFT
      )
      .reduce((sum, i) => sum + i.amountDue, 0),
  };
};

// ============ FIREBASE CRUD OPERATIONS ============

/**
 * Subscribe to invoices based on user role
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
    // Clients see their own non-draft invoices
    q = query(
      collection(db, 'invoices'),
      where('clientId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
  } else {
    // Contractors don't see invoices by default
    callback([]);
    return () => {};
  }

  return onSnapshot(
    q,
    (snapshot) => {
      let invoices = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Invoice[];

      // Filter out drafts for non-admin users
      if (user.role !== UserRole.ADMIN) {
        invoices = invoices.filter((inv) => inv.status !== InvoiceStatus.DRAFT);
      }

      callback(invoices);
    },
    (error) => {
      console.error('Error subscribing to invoices:', error);
      callback([]);
    }
  );
};

/**
 * Subscribe to invoices for a specific client
 */
export const subscribeToClientInvoices = (
  clientId: string,
  callback: (invoices: Invoice[]) => void
) => {
  const q = query(
    collection(db, 'invoices'),
    where('clientId', '==', clientId),
    where('status', '!=', InvoiceStatus.DRAFT),
    orderBy('status'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const invoices = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Invoice[];

      callback(invoices);
    },
    (error) => {
      console.error('Error subscribing to client invoices:', error);
      callback([]);
    }
  );
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

  return onSnapshot(
    q,
    (snapshot) => {
      const invoices = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Invoice[];

      callback(invoices);
    },
    (error) => {
      console.error('Error subscribing to project invoices:', error);
      callback([]);
    }
  );
};

/**
 * Create a new invoice
 */
export const createInvoice = async (
  data: CreateInvoiceData,
  creatorId: string,
  publish: boolean = false
): Promise<string> => {
  try {
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Process line items
    const lineItems: InvoiceLineItem[] = data.lineItems.map((item, index) => ({
      id: `item-${Date.now()}-${index}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    }));

    // Calculate totals
    const totals = calculateInvoiceTotals(
      data.lineItems,
      data.taxRate,
      data.discountAmount
    );

    // Determine initial status
    let status = InvoiceStatus.DRAFT;
    if (publish) {
      if (data.scheduledSendDate) {
        const scheduledDate = new Date(data.scheduledSendDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        status = scheduledDate > today ? InvoiceStatus.SCHEDULED : InvoiceStatus.SENT;
      } else {
        status = InvoiceStatus.SENT;
      }
    }

    // Create invoice object
    const now = new Date().toISOString();
    const invoice: Omit<Invoice, 'id'> = {
      invoiceNumber,
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      clientId: data.clientId,
      status,
      lineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: data.discountAmount,
      totalAmount: totals.totalAmount,
      amountPaid: 0,
      amountDue: totals.totalAmount,
      taxRate: data.taxRate,
      createdAt: now,
      updatedAt: now,
      issueDate: publish ? now : undefined,
      dueDate: data.dueDate,
      scheduledSendDate: data.scheduledSendDate,
      payments: [],
      allowPartialPayments: data.allowPartialPayments,
      autoPayEnabled: data.autoPayEnabled,
      acceptedPaymentMethods: data.acceptedPaymentMethods,
      customerNotes: data.customerNotes,
      internalNotes: data.internalNotes,
      createdBy: creatorId,
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'invoices'), invoice);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    throw new Error(error.message || 'Failed to create invoice');
  }
};

/**
 * Get a single invoice by ID
 */
export const getInvoice = async (invoiceId: string): Promise<Invoice | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'invoices', invoiceId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Invoice;
    }
    return null;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
};

/**
 * Update an invoice
 */
export const updateInvoice = async (
  invoiceId: string,
  updates: Partial<Invoice>
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    throw new Error(error.message || 'Failed to update invoice');
  }
};

/**
 * Update invoice status
 */
export const updateInvoiceStatus = async (
  invoiceId: string,
  status: InvoiceStatus
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    throw new Error('Failed to update invoice status');
  }
};

/**
 * Publish a draft invoice
 */
export const publishInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceSnap.data() as Invoice;

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be published');
    }

    const now = new Date().toISOString();
    await updateDoc(invoiceRef, {
      status: InvoiceStatus.SENT,
      issueDate: now,
      updatedAt: now,
    });
  } catch (error: any) {
    console.error('Error publishing invoice:', error);
    throw new Error(error.message || 'Failed to publish invoice');
  }
};

/**
 * Record a payment on an invoice
 */
export const recordPayment = async (
  invoiceId: string,
  paymentData: RecordPaymentData,
  processedBy: string
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceSnap.data() as Invoice;

    // Validate payment amount
    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    if (paymentData.amount > invoice.amountDue) {
      throw new Error('Payment amount exceeds amount due');
    }

    // Create payment record
    const payment: InvoicePayment = {
      id: `payment-${Date.now()}`,
      amount: paymentData.amount,
      method: paymentData.method,
      paidAt: new Date().toISOString(),
      note: paymentData.note,
      transactionId: paymentData.transactionId,
      processedBy,
    };

    // Calculate new amounts
    const newAmountPaid = invoice.amountPaid + paymentData.amount;
    const newAmountDue = invoice.totalAmount - newAmountPaid;

    // Determine new status
    let newStatus: InvoiceStatus;
    if (newAmountDue <= 0) {
      newStatus = InvoiceStatus.PAID;
    } else if (newAmountPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    } else {
      newStatus = invoice.status;
    }

    // Update invoice
    await updateDoc(invoiceRef, {
      payments: arrayUnion(payment),
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
      status: newStatus,
      paidAt: newStatus === InvoiceStatus.PAID ? new Date().toISOString() : invoice.paidAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    throw new Error(error.message || 'Failed to record payment');
  }
};

/**
 * Cancel an invoice
 */
export const cancelInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      status: InvoiceStatus.CANCELED,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error canceling invoice:', error);
    throw new Error('Failed to cancel invoice');
  }
};

/**
 * Delete an invoice (only drafts can be deleted)
 */
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceSnap.data() as Invoice;

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be deleted. Cancel the invoice instead.');
    }

    await deleteDoc(invoiceRef);
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    throw new Error(error.message || 'Failed to delete invoice');
  }
};

/**
 * Check and update overdue invoices
 */
export const updateOverdueInvoices = async (): Promise<number> => {
  try {
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID])
    );
    const snapshot = await getDocs(q);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updatedCount = 0;
    const updates: Promise<void>[] = [];

    snapshot.docs.forEach((docSnap) => {
      const invoice = docSnap.data() as Invoice;
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today && invoice.amountDue > 0) {
        updates.push(
          updateDoc(doc(db, 'invoices', docSnap.id), {
            status: InvoiceStatus.OVERDUE,
            updatedAt: new Date().toISOString(),
          })
        );
        updatedCount++;
      }
    });

    await Promise.all(updates);
    return updatedCount;
  } catch (error: any) {
    console.error('Error updating overdue invoices:', error);
    return 0;
  }
};

/**
 * Get invoices for a project
 */
export const getProjectInvoices = async (projectId: string): Promise<Invoice[]> => {
  try {
    const q = query(
      collection(db, 'invoices'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Invoice[];
  } catch (error) {
    console.error('Error fetching project invoices:', error);
    throw error;
  }
};

/**
 * Get client's total outstanding balance
 */
export const getClientOutstandingBalance = async (clientId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, 'invoices'),
      where('clientId', '==', clientId),
      where('status', 'in', [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.reduce((sum, docSnap) => {
      const invoice = docSnap.data() as Invoice;
      return sum + invoice.amountDue;
    }, 0);
  } catch (error) {
    console.error('Error fetching client balance:', error);
    return 0;
  }
};