// src/services/invoices.ts
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
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { Invoice, InvoiceStatus, CreateInvoiceInput, UpdateInvoiceInput } from '../types/invoice';
import { UserRole } from '../types';

// ============ INVOICE SUBSCRIPTIONS ============

/**
 * Subscribe to invoices based on user role
 * - ADMIN: sees all invoices
 * - CONTRACTOR: sees invoices for projects they're assigned to
 * - CLIENT: sees invoices addressed to them
 */
export const subscribeToInvoices = (
  userId: string,
  userRole: UserRole,
  callback: (invoices: Invoice[]) => void
) => {
  let q;

  if (userRole === UserRole.ADMIN) {
    // Admin sees all invoices
    q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  } else if (userRole === UserRole.CLIENT) {
    // Client sees invoices where they are the recipient
    q = query(
      collection(db, 'invoices'),
      where('clientId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  } else {
    // Contractor sees invoices they created
    q = query(
      collection(db, 'invoices'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const invoices = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Invoice)
      );
      callback(invoices);
    },
    (error) => {
      console.error('Error fetching invoices:', error);
      callback([]);
    }
  );
};

// ============ INVOICE CRUD ============

/**
 * Generate the next invoice number
 */
const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  // Get the count of invoices this year
  const q = query(
    collection(db, 'invoices'),
    where('invoiceNumber', '>=', prefix),
    where('invoiceNumber', '<', prefix + '\uf8ff')
  );
  
  const snapshot = await getDocs(q);
  const nextNum = snapshot.size + 1;
  
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
};

/**
 * Create a new invoice
 */
export const createInvoice = async (
  invoiceData: CreateInvoiceInput
): Promise<Invoice> => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    const now = new Date().toISOString();

    const newInvoice = {
      ...invoiceData,
      invoiceNumber,
      payments: [],
      amountPaid: 0,
      amountDue: invoiceData.total,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, 'invoices'), newInvoice);

    return {
      id: docRef.id,
      ...newInvoice,
    } as Invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

/**
 * Update an existing invoice
 */
export const updateInvoice = async (
  invoiceId: string,
  updates: UpdateInvoiceInput
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

/**
 * Delete an invoice
 */
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'invoices', invoiceId));
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
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

// ============ INVOICE STATUS MANAGEMENT ============

/**
 * Send an invoice to the client
 */
export const sendInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      status: InvoiceStatus.SENT,
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    throw error;
  }
};

/**
 * Mark an invoice as paid
 */
export const markInvoiceAsPaid = async (
  invoiceId: string,
  paymentDetails?: {
    method: 'card' | 'cash' | 'check' | 'bank_transfer' | 'other';
    reference?: string;
    note?: string;
  }
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);

    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceDoc.data() as Invoice;
    const now = new Date().toISOString();

    const payment = {
      id: Math.random().toString(36).substr(2, 9),
      amount: invoice.amountDue,
      method: paymentDetails?.method || 'other',
      date: now,
      reference: paymentDetails?.reference,
      note: paymentDetails?.note,
    };

    await updateDoc(invoiceRef, {
      status: InvoiceStatus.PAID,
      amountPaid: invoice.total,
      amountDue: 0,
      paidDate: now,
      payments: [...(invoice.payments || []), payment],
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    throw error;
  }
};

/**
 * Record a partial payment on an invoice
 */
export const recordPartialPayment = async (
  invoiceId: string,
  amount: number,
  paymentDetails: {
    method: 'card' | 'cash' | 'check' | 'bank_transfer' | 'other';
    reference?: string;
    note?: string;
  }
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);

    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceDoc.data() as Invoice;
    const now = new Date().toISOString();

    const newAmountPaid = (invoice.amountPaid || 0) + amount;
    const newAmountDue = invoice.total - newAmountPaid;

    const payment = {
      id: Math.random().toString(36).substr(2, 9),
      amount,
      method: paymentDetails.method,
      date: now,
      reference: paymentDetails.reference,
      note: paymentDetails.note,
    };

    const newStatus: InvoiceStatus = newAmountDue <= 0 
      ? InvoiceStatus.PAID 
      : InvoiceStatus.PARTIALLY_PAID;

    await updateDoc(invoiceRef, {
      status: newStatus,
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
      paidDate: newAmountDue <= 0 ? now : null,
      payments: [...(invoice.payments || []), payment],
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error recording partial payment:', error);
    throw error;
  }
};

/**
 * Cancel an invoice
 */
export const cancelInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      status: InvoiceStatus.CANCELLED,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    throw error;
  }
};

/**
 * Check and update overdue invoices
 * This should be called periodically (e.g., via a cron job or cloud function)
 */
export const checkOverdueInvoices = async (): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all sent invoices that are past due
    const q = query(
      collection(db, 'invoices'),
      where('status', '==', InvoiceStatus.SENT),
      where('dueDate', '<', today)
    );

    const snapshot = await getDocs(q);
    let updatedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      await updateDoc(doc(db, 'invoices', docSnapshot.id), {
        status: InvoiceStatus.OVERDUE,
        updatedAt: new Date().toISOString(),
      });
      updatedCount++;
    }

    return updatedCount;
  } catch (error) {
    console.error('Error checking overdue invoices:', error);
    throw error;
  }
};

// ============ SQUARE INTEGRATION (Placeholder) ============

/**
 * Create a Square invoice and payment link
 * Note: This requires a Firebase Cloud Function to handle the Square API call
 */
export const createSquareInvoice = async (invoiceId: string): Promise<string> => {
  try {
    const createSquareInvoiceFunction = httpsCallable(functions, 'createSquareInvoice');
    const result = await createSquareInvoiceFunction({ invoiceId });
    const data = result.data as { paymentLinkUrl: string };
    return data.paymentLinkUrl;
  } catch (error) {
    console.error('Error creating Square invoice:', error);
    throw error;
  }
};

/**
 * Sync payment status from Square
 * Note: This requires a Firebase Cloud Function to handle the Square API call
 */
export const syncSquarePaymentStatus = async (invoiceId: string): Promise<void> => {
  try {
    const syncPaymentFunction = httpsCallable(functions, 'syncSquarePayment');
    await syncPaymentFunction({ invoiceId });
  } catch (error) {
    console.error('Error syncing Square payment:', error);
    throw error;
  }
};

// ============ INVOICE CALCULATIONS ============

/**
 * Calculate invoice totals from line items
 */
export const calculateInvoiceTotals = (
  lineItems: { quantity: number; unitPrice: number }[],
  taxRate: number = 0
): { subtotal: number; taxAmount: number; total: number } => {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

/**
 * Get invoice statistics for dashboard
 */
export const getInvoiceStats = async (userId: string, userRole: UserRole) => {
  try {
    let q;

    if (userRole === UserRole.ADMIN) {
      q = query(collection(db, 'invoices'));
    } else if (userRole === UserRole.CLIENT) {
      q = query(collection(db, 'invoices'), where('clientId', '==', userId));
    } else {
      q = query(collection(db, 'invoices'), where('createdBy', '==', userId));
    }

    const snapshot = await getDocs(q);
    const invoices = snapshot.docs.map((doc) => doc.data() as Invoice);

    const stats = {
      total: invoices.length,
      draft: invoices.filter((i) => i.status === InvoiceStatus.DRAFT).length,
      sent: invoices.filter((i) => i.status === InvoiceStatus.SENT).length,
      paid: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
      overdue: invoices.filter((i) => i.status === InvoiceStatus.OVERDUE).length,
      totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
      totalPaid: invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0),
      totalOutstanding: invoices.reduce((sum, i) => sum + (i.amountDue || 0), 0),
    };

    return stats;
  } catch (error) {
    console.error('Error getting invoice stats:', error);
    throw error;
  }
};