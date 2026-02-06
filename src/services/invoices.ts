// src/services/invoices.ts
// Invoice Service - Firebase Operations

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
import { User, UserRole } from '../types';

// ============ UTILITY FUNCTIONS ============

export const dollarsToCents = (dollars: number): number => Math.round(dollars * 100);
export const centsToDollars = (cents: number): number => cents / 100;

export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

export const generateInvoiceNumber = async (): Promise<string> => {
  const invoicesRef = collection(db, 'invoices');
  const snapshot = await getDocs(invoicesRef);
  const count = snapshot.size + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count).padStart(4, '0')}`;
};

const calculateInvoiceTotals = (
  lineItems: { quantity: number; unitPrice: number }[],
  taxRate: number,
  discountAmount: number
) => {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const total = Math.max(0, subtotal + taxAmount - discountAmount);
  return { subtotal, taxAmount, totalAmount: total };
};

export const getInvoiceStatusColor = (status: InvoiceStatus): string => {
  const colors: Record<InvoiceStatus, string> = {
    [InvoiceStatus.DRAFT]: 'bg-gray-100 text-gray-700',
    [InvoiceStatus.SCHEDULED]: 'bg-blue-100 text-blue-700',
    [InvoiceStatus.SENT]: 'bg-yellow-100 text-yellow-700',
    [InvoiceStatus.PARTIALLY_PAID]: 'bg-orange-100 text-orange-700',
    [InvoiceStatus.PAID]: 'bg-green-100 text-green-700',
    [InvoiceStatus.OVERDUE]: 'bg-red-100 text-red-700',
    [InvoiceStatus.CANCELED]: 'bg-gray-100 text-gray-500',
    [InvoiceStatus.REFUNDED]: 'bg-purple-100 text-purple-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

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
      .filter((i) => ![InvoiceStatus.PAID, InvoiceStatus.CANCELED, InvoiceStatus.DRAFT].includes(i.status))
      .reduce((sum, i) => sum + i.amountDue, 0),
  };
};

// ============ SUBSCRIBE TO INVOICES ============

export const subscribeToInvoices = (
  user: User,
  callback: (invoices: Invoice[]) => void
) => {
  let q;

  if (user.role === UserRole.ADMIN) {
    q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  } else if (user.role === UserRole.CLIENT) {
    q = query(
      collection(db, 'invoices'),
      where('clientId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
  } else {
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

      // Filter out drafts for clients
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

// ============ CREATE INVOICE ============

export const createInvoice = async (
  data: CreateInvoiceData,
  creatorId: string,
  publish: boolean = false
): Promise<string> => {
  try {
    const invoiceNumber = await generateInvoiceNumber();

    const lineItems: InvoiceLineItem[] = data.lineItems.map((item, index) => ({
      id: `item-${index + 1}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const totals = calculateInvoiceTotals(data.lineItems, data.taxRate, data.discountAmount);
    const now = new Date().toISOString();

    // Build invoice - ONLY include defined values (Firestore rejects undefined)
    const invoice: Record<string, any> = {
      invoiceNumber,
      title: data.title,
      clientId: data.clientId,
      status: publish ? InvoiceStatus.SENT : InvoiceStatus.DRAFT,
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
      dueDate: data.dueDate,
      payments: [],
      allowPartialPayments: data.allowPartialPayments,
      autoPayEnabled: data.autoPayEnabled,
      acceptedPaymentMethods: data.acceptedPaymentMethods,
      createdBy: creatorId,
    };

    // Only add optional fields if they exist
    if (data.description) invoice.description = data.description;
    if (data.projectId) invoice.projectId = data.projectId;
    if (data.customerNotes) invoice.customerNotes = data.customerNotes;
    if (data.internalNotes) invoice.internalNotes = data.internalNotes;
    if (publish) invoice.issueDate = now;

    const docRef = await addDoc(collection(db, 'invoices'), invoice);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    throw new Error(error.message || 'Failed to create invoice');
  }
};

// ============ PUBLISH INVOICE ============

export const publishInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) throw new Error('Invoice not found');

    const invoice = invoiceSnap.data() as Invoice;
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be published');
    }

    await updateDoc(invoiceRef, {
      status: InvoiceStatus.SENT,
      issueDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error publishing invoice:', error);
    throw new Error(error.message || 'Failed to publish invoice');
  }
};

// ============ RECORD PAYMENT ============

export const recordPayment = async (
  invoiceId: string,
  paymentData: RecordPaymentData,
  processedBy: string
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) throw new Error('Invoice not found');

    const invoice = invoiceSnap.data() as Invoice;

    if (paymentData.amount <= 0) throw new Error('Payment amount must be greater than zero');
    if (paymentData.amount > invoice.amountDue) throw new Error('Payment amount exceeds amount due');

    // Build payment - only include defined values
    const payment: Record<string, any> = {
      id: `payment-${Date.now()}`,
      amount: paymentData.amount,
      method: paymentData.method,
      paidAt: new Date().toISOString(),
      processedBy,
    };

    if (paymentData.note) payment.note = paymentData.note;
    if (paymentData.transactionId) payment.transactionId = paymentData.transactionId;

    const newAmountPaid = invoice.amountPaid + paymentData.amount;
    const newAmountDue = invoice.totalAmount - newAmountPaid;

    let newStatus = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = InvoiceStatus.PAID;
    } else if (newAmountPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    const updateData: Record<string, any> = {
      payments: arrayUnion(payment),
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === InvoiceStatus.PAID) {
      updateData.paidAt = new Date().toISOString();
    }

    await updateDoc(invoiceRef, updateData);
  } catch (error: any) {
    console.error('Error recording payment:', error);
    throw new Error(error.message || 'Failed to record payment');
  }
};

// ============ CANCEL / DELETE ============

export const cancelInvoice = async (invoiceId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'invoices', invoiceId), {
      status: InvoiceStatus.CANCELED,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error canceling invoice:', error);
    throw new Error('Failed to cancel invoice');
  }
};

export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) throw new Error('Invoice not found');

    const invoice = invoiceSnap.data() as Invoice;
    if (invoice.status === InvoiceStatus.DRAFT) {
      await deleteDoc(invoiceRef);
    } else {
      await updateDoc(invoiceRef, {
        status: InvoiceStatus.CANCELED,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    throw new Error('Failed to delete invoice');
  }
};

// ============ UPDATE OVERDUE ============

export const updateOverdueInvoices = async (): Promise<number> => {
  try {
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID])
    );
    const snapshot = await getDocs(q);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
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
        count++;
      }
    });

    await Promise.all(updates);
    return count;
  } catch (error) {
    console.error('Error updating overdue invoices:', error);
    return 0;
  }
};

// ============ ALIASES (used by components that reference different names) ============

/** Alias used by InvoiceDetailModal */
export const recordManualPayment = recordPayment;

// ============ SUBSCRIBE TO PROJECT INVOICES ============

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

// ============ UPDATE INVOICE STATUS ============

export const updateInvoiceStatus = async (
  invoiceId: string,
  status: InvoiceStatus
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'invoices', invoiceId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    throw new Error('Failed to update invoice status');
  }
};