// src/components/InvoicePaymentPage.tsx
// Invoice View with Square Payment Links via Cloud Function

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ArrowLeft,
  FileText,
  Calendar,
  User as UserIcon,
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Loader2,
  ExternalLink,
  Mail,
  Phone,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Invoice, InvoiceStatus, PaymentMethod } from '../types/invoice';
import { User, Project } from '../types';
import { recordPayment } from '../services/invoices';

interface InvoicePaymentPageProps {
  invoice: Invoice;
  currentUser: User;
  users: User[];
  projects: Project[];
  onBack: () => void;
  onPaymentSuccess?: () => void;
}

// Format currency (cents to dollars)
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Status badge config
const getStatusConfig = (status: InvoiceStatus) => {
  const configs: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
    [InvoiceStatus.DRAFT]: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
    [InvoiceStatus.SCHEDULED]: { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-100' },
    [InvoiceStatus.SENT]: { label: 'Awaiting Payment', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    [InvoiceStatus.PARTIALLY_PAID]: { label: 'Partially Paid', color: 'text-orange-600', bg: 'bg-orange-100' },
    [InvoiceStatus.PAID]: { label: 'Paid', color: 'text-green-600', bg: 'bg-green-100' },
    [InvoiceStatus.OVERDUE]: { label: 'Overdue', color: 'text-red-600', bg: 'bg-red-100' },
    [InvoiceStatus.CANCELED]: { label: 'Canceled', color: 'text-gray-400', bg: 'bg-gray-50' },
    [InvoiceStatus.REFUNDED]: { label: 'Refunded', color: 'text-purple-600', bg: 'bg-purple-100' },
  };
  return configs[status] || configs[InvoiceStatus.DRAFT];
};

const InvoicePaymentPage: React.FC<InvoicePaymentPageProps> = ({
  invoice,
  currentUser,
  users,
  projects,
  onBack,
  onPaymentSuccess,
}) => {
  const [creatingLink, setCreatingLink] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(invoice.squarePaymentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  const client = users.find((u) => u.id === invoice.clientId);
  const project = invoice.projectId ? projects.find((p) => p.id === invoice.projectId) : null;
  const statusConfig = getStatusConfig(invoice.status);

  const canPay = [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status);
  const isOverdue = invoice.status === InvoiceStatus.OVERDUE || 
    (invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && new Date(invoice.dueDate) < new Date());
  const isAdmin = currentUser.role === 'ADMIN';
  const isClient = currentUser.id === invoice.clientId;

  // Get Firebase Functions instance
  const functions = getFunctions();

  // Create Square Payment Link via Cloud Function
  const createPaymentLink = async () => {
    setCreatingLink(true);
    setError(null);

    try {
      const createSquarePaymentLink = httpsCallable(functions, 'createSquarePaymentLink');
      
      const result = await createSquarePaymentLink({
        invoiceId: invoice.id,
        title: invoice.title,
        amountCents: invoice.amountDue,
        customerEmail: client?.email,
        invoiceNumber: invoice.invoiceNumber,
      });

      const data = result.data as { success: boolean; paymentUrl: string };

      if (data.success && data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (err: any) {
      console.error('Error creating payment link:', err);
      setError(err.message || 'Failed to create payment link');
    } finally {
      setCreatingLink(false);
    }
  };

  // Check payment status via Cloud Function
  const checkPaymentStatus = async () => {
    setCheckingStatus(true);
    setError(null);

    try {
      const checkStatus = httpsCallable(functions, 'checkPaymentStatus');
      
      const result = await checkStatus({ invoiceId: invoice.id });
      const data = result.data as { status: string; paid: boolean };

      if (data.paid) {
        onPaymentSuccess?.();
      }
    } catch (err: any) {
      console.error('Error checking payment status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Copy payment link to clipboard
  const copyPaymentLink = async () => {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Manual payment recording (for admin when client pays outside system)
  const handleRecordManualPayment = async (method: PaymentMethod) => {
    setRecordingPayment(true);
    setError(null);
    try {
      await recordPayment(
        invoice.id,
        {
          amount: invoice.amountDue,
          method,
          note: `Manually recorded by ${currentUser.name}`,
        },
        currentUser.id
      );
      onPaymentSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Invoices</span>
          </button>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusConfig.bg} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Invoice Details - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Invoice</p>
                  <h1 className="text-2xl font-black text-gray-900">{invoice.invoiceNumber}</h1>
                  <p className="text-gray-600 mt-1">{invoice.title}</p>
                </div>
                <div className="text-right">
                  <img src="/care.png" alt="Care Construction" className="h-10 mb-2" />
                  <p className="text-xs text-gray-500">Care General Construction</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Bill To */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-care-orange/10 flex items-center justify-center">
                      <UserIcon size={18} className="text-care-orange" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{client?.name || 'Client'}</p>
                      {client?.email && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail size={12} /> {client.email}
                        </p>
                      )}
                      {client?.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone size={12} /> {client.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Project */}
                {project && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project</p>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Briefcase size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{project.title}</p>
                        <p className="text-sm text-gray-500">{project.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100">
                {invoice.issueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Issue Date</p>
                      <p className="text-sm font-medium">{formatDate(invoice.issueDate)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={16} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                  <div>
                    <p className="text-xs text-gray-400">Due Date</p>
                    <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Invoice Items</h2>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase w-20">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase w-28">Price</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-gray-400 uppercase w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 text-right">{item.quantity}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Totals */}
              <div className="px-6 py-4 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({(invoice.taxRate * 100).toFixed(1)}%)</span>
                    <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-green-600">-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-black text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Amount Paid</span>
                      <span className="font-medium">-{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-xl pt-2 border-t border-gray-200">
                      <span className="font-black text-care-orange">Amount Due</span>
                      <span className="font-black text-care-orange">{formatCurrency(invoice.amountDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.customerNotes && (
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Note from Care Construction</p>
                <p className="text-blue-800">{invoice.customerNotes}</p>
              </div>
            )}

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Payment History</h3>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-500" size={20} />
                        <div>
                          <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-gray-500">{formatDate(payment.paidAt)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase bg-white px-2 py-1 rounded">
                        {payment.method}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Panel - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-24">
              {invoice.status === InvoiceStatus.PAID ? (
                /* Already Paid State */
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-green-500" size={32} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Invoice Paid</h3>
                  <p className="text-gray-600">This invoice has been paid in full.</p>
                  {invoice.paidAt && (
                    <p className="text-sm text-gray-500 mt-2">Paid on {formatDate(invoice.paidAt)}</p>
                  )}
                </div>
              ) : invoice.status === InvoiceStatus.CANCELED ? (
                /* Canceled State */
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-gray-400" size={32} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Invoice Canceled</h3>
                  <p className="text-gray-600">This invoice has been canceled.</p>
                </div>
              ) : (
                /* Payment Options */
                <div className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-500 mb-1">Amount Due</p>
                    <p className="text-3xl font-black text-care-orange">{formatCurrency(invoice.amountDue)}</p>
                    {isOverdue && (
                      <p className="text-sm text-red-600 mt-1 flex items-center justify-center gap-1">
                        <AlertCircle size={14} />
                        Past Due
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4 flex items-start gap-2">
                      <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Square Payment Link */}
                  {canPay && (isClient || isAdmin) && (
                    <div className="space-y-3">
                      {paymentUrl ? (
                        <>
                          {/* Payment link ready - show pay button */}
                          <a
                            href={paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-care-orange text-white rounded-xl font-black uppercase tracking-wider hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                          >
                            <CreditCard size={20} />
                            Pay Now
                            <ExternalLink size={16} />
                          </a>

                          {/* Copy link option */}
                          <button
                            onClick={copyPaymentLink}
                            className="w-full py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                          >
                            {copied ? (
                              <>
                                <Check size={16} className="text-green-500" />
                                Link Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={16} />
                                Copy Payment Link
                              </>
                            )}
                          </button>

                          {/* Check payment status */}
                          <button
                            onClick={checkPaymentStatus}
                            disabled={checkingStatus}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
                          >
                            <RefreshCw size={14} className={checkingStatus ? 'animate-spin' : ''} />
                            {checkingStatus ? 'Checking...' : 'Check Payment Status'}
                          </button>
                        </>
                      ) : (
                        /* No payment link yet - create one */
                        <button
                          onClick={createPaymentLink}
                          disabled={creatingLink}
                          className="w-full py-4 bg-care-orange text-white rounded-xl font-black uppercase tracking-wider hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                          {creatingLink ? (
                            <>
                              <Loader2 size={20} className="animate-spin" />
                              Creating Link...
                            </>
                          ) : (
                            <>
                              <CreditCard size={20} />
                              Pay with Card
                            </>
                          )}
                        </button>
                      )}

                      <p className="text-xs text-gray-400 text-center">
                        Secure payment powered by Square
                      </p>
                    </div>
                  )}

                  {/* Admin: Record Manual Payment */}
                  {isAdmin && canPay && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Record Manual Payment
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRecordManualPayment(PaymentMethod.CHECK)}
                          disabled={recordingPayment}
                          className="py-2 px-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Check
                        </button>
                        <button
                          onClick={() => handleRecordManualPayment(PaymentMethod.CASH)}
                          disabled={recordingPayment}
                          className="py-2 px-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cash
                        </button>
                        <button
                          onClick={() => handleRecordManualPayment(PaymentMethod.BANK_TRANSFER)}
                          disabled={recordingPayment}
                          className="py-2 px-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Bank Transfer
                        </button>
                        <button
                          onClick={() => handleRecordManualPayment(PaymentMethod.OTHER)}
                          disabled={recordingPayment}
                          className="py-2 px-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Other
                        </button>
                      </div>
                      {recordingPayment && (
                        <div className="flex items-center justify-center mt-3 text-gray-400">
                          <Loader2 size={16} className="animate-spin mr-2" />
                          Recording...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePaymentPage;