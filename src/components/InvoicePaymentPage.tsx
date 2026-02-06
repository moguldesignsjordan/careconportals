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
  DollarSign,
  Hash,
  Receipt,
  Building2,
  Banknote,
  MapPin,
  Printer,
  Download,
  Send,
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

// Short date format
const formatShortDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Status badge config
const getStatusConfig = (status: InvoiceStatus) => {
  const configs: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    [InvoiceStatus.DRAFT]: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100', icon: FileText },
    [InvoiceStatus.SCHEDULED]: { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
    [InvoiceStatus.SENT]: { label: 'Awaiting Payment', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Send },
    [InvoiceStatus.PARTIALLY_PAID]: { label: 'Partially Paid', color: 'text-orange-600', bg: 'bg-orange-100', icon: DollarSign },
    [InvoiceStatus.PAID]: { label: 'Paid', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
    [InvoiceStatus.OVERDUE]: { label: 'Overdue', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
    [InvoiceStatus.CANCELED]: { label: 'Canceled', color: 'text-gray-400', bg: 'bg-gray-50', icon: AlertCircle },
    [InvoiceStatus.REFUNDED]: { label: 'Refunded', color: 'text-purple-600', bg: 'bg-purple-100', icon: RefreshCw },
  };
  return configs[status] || configs[InvoiceStatus.DRAFT];
};

// Get payment method label
const getPaymentMethodLabel = (method: PaymentMethod) => {
  switch (method) {
    case PaymentMethod.SQUARE_ONLINE: return 'Square Online';
    case PaymentMethod.CARD_ON_FILE: return 'Card on File';
    case PaymentMethod.CASH: return 'Cash';
    case PaymentMethod.CHECK: return 'Check';
    case PaymentMethod.BANK_TRANSFER: return 'Bank Transfer';
    case PaymentMethod.CREDIT_CARD: return 'Credit Card';
    case PaymentMethod.OTHER: return 'Other';
    default: return method;
  }
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
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [manualPaymentNote, setManualPaymentNote] = useState('');

  const client = users.find((u) => u.id === invoice.clientId);
  const project = invoice.projectId ? projects.find((p) => p.id === invoice.projectId) : null;
  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  const canPay = [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status);
  const isOverdue = invoice.status === InvoiceStatus.OVERDUE || 
    (invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && new Date(invoice.dueDate) < new Date());
  const isAdmin = currentUser.role === 'ADMIN';
  const isClient = currentUser.id === invoice.clientId;

  // Get Firebase Functions instance
  const functions = getFunctions();

  // Update payment URL when invoice changes
  useEffect(() => {
    setPaymentUrl(invoice.squarePaymentUrl || null);
  }, [invoice.squarePaymentUrl]);

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

      const data = result.data as { success: boolean; paymentUrl: string; paymentLinkId: string };

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
          note: manualPaymentNote || `Manually recorded by ${currentUser.name}`,
        },
        currentUser.id
      );
      onPaymentSuccess?.();
      setShowManualPayment(false);
      setManualPaymentNote('');
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Print invoice
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-care-orange transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Invoices
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Print Invoice"
              >
                <Printer size={18} />
              </button>
              {paymentUrl && (
                <button
                  onClick={copyPaymentLink}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy Payment Link"
                >
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Invoice Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Status Banner */}
              <div className={`px-6 py-3 ${statusConfig.bg} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <StatusIcon size={16} className={statusConfig.color} />
                  <span className={`text-sm font-bold ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
                {isOverdue && invoice.status !== InvoiceStatus.OVERDUE && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    Past Due
                  </span>
                )}
              </div>

              <div className="p-6">
                {/* Invoice Number & Title */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Hash size={14} className="text-gray-400" />
                      <span className="text-sm font-mono text-gray-500">{invoice.invoiceNumber}</span>
                    </div>
                    <h1 className="text-2xl font-black text-[#111827]">{invoice.title}</h1>
                    {invoice.description && (
                      <p className="text-gray-600 mt-2">{invoice.description}</p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-care-orange/10 flex items-center justify-center flex-shrink-0">
                    <Receipt className="text-care-orange" size={24} />
                  </div>
                </div>

                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Issue Date</p>
                    <p className="font-bold text-[#111827]">{formatShortDate(invoice.issueDate)}</p>
                  </div>
                  <div className={`rounded-xl p-4 ${isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <p className={`text-xs uppercase tracking-wider mb-1 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                      Due Date
                    </p>
                    <p className={`font-bold ${isOverdue ? 'text-red-700' : 'text-[#111827]'}`}>
                      {formatShortDate(invoice.dueDate)}
                    </p>
                  </div>
                </div>

                {/* Client & Project Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Info */}
                  {client && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Bill To</p>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-care-orange/10 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="text-care-orange" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#111827]">{client.name}</p>
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                              <Mail size={12} />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                              <Phone size={12} />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Project Info */}
                  {project && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Project</p>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="text-blue-600" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#111827]">{project.title}</p>
                          {project.location && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                              <MapPin size={12} />
                              <span className="truncate">{project.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-[#111827]">Line Items</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {invoice.lineItems.map((item, index) => (
                  <div key={item.id || index} className="px-6 py-4 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#111827]">{item.description}</p>
                      {item.quantity > 1 && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-[#111827]">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="px-6 py-4 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({invoice.taxRate?.toFixed(1)}%)</span>
                    <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-green-600">-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <hr className="border-gray-200 my-2" />
                <div className="flex justify-between">
                  <span className="font-bold text-[#111827]">Total</span>
                  <span className="text-xl font-black text-[#111827]">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Paid</span>
                      <span className="font-medium">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    {invoice.amountDue > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Balance Due</span>
                        <span className="font-bold text-care-orange">{formatCurrency(invoice.amountDue)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-[#111827] flex items-center gap-2">
                    <CreditCard size={16} className="text-gray-400" />
                    Payment History
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle size={18} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-[#111827]">
                            {getPaymentMethodLabel(payment.method)}
                          </p>
                          <p className="text-sm text-gray-500">{formatShortDate(payment.paidAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">{formatCurrency(payment.amount)}</p>
                        {payment.note && (
                          <p className="text-xs text-gray-500 max-w-[150px] truncate">{payment.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {(invoice.customerNotes || (isAdmin && invoice.internalNotes)) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-[#111827]">Notes</h2>
                </div>
                <div className="p-6 space-y-4">
                  {invoice.customerNotes && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer Notes</p>
                      <p className="text-gray-700 bg-gray-50 rounded-xl p-4">{invoice.customerNotes}</p>
                    </div>
                  )}
                  {isAdmin && invoice.internalNotes && (
                    <div>
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Internal Notes (Admin Only)</p>
                      <p className="text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-4">{invoice.internalNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              {invoice.status === InvoiceStatus.PAID ? (
                /* Paid State */
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-emerald-600" size={40} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Paid in Full</h3>
                  <p className="text-gray-600 mb-4">
                    Thank you for your payment!
                  </p>
                  {invoice.paidAt && (
                    <p className="text-sm text-gray-500">
                      Paid on {formatDate(invoice.paidAt)}
                    </p>
                  )}
                </div>
              ) : invoice.status === InvoiceStatus.CANCELED ? (
                /* Canceled State */
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-gray-400" size={40} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Invoice Canceled</h3>
                  <p className="text-gray-600">This invoice has been canceled and is no longer valid.</p>
                </div>
              ) : invoice.status === InvoiceStatus.DRAFT ? (
                /* Draft State */
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="text-gray-400" size={40} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Draft Invoice</h3>
                  <p className="text-gray-600">This invoice has not been sent yet.</p>
                </div>
              ) : (
                /* Payment Options */
                <div className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-500 mb-1">Amount Due</p>
                    <p className="text-3xl font-black text-care-orange">{formatCurrency(invoice.amountDue)}</p>
                    {isOverdue && (
                      <p className="text-sm text-red-600 mt-2 flex items-center justify-center gap-1">
                        <AlertCircle size={14} />
                        Past Due - Please pay immediately
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
                      
                      {!showManualPayment ? (
                        <button
                          onClick={() => setShowManualPayment(true)}
                          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-600 transition-all"
                        >
                          + Record Payment Received
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleRecordManualPayment(PaymentMethod.CASH)}
                              disabled={recordingPayment}
                              className="py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Banknote size={14} />
                              Cash
                            </button>
                            <button
                              onClick={() => handleRecordManualPayment(PaymentMethod.CHECK)}
                              disabled={recordingPayment}
                              className="py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <FileText size={14} />
                              Check
                            </button>
                            <button
                              onClick={() => handleRecordManualPayment(PaymentMethod.BANK_TRANSFER)}
                              disabled={recordingPayment}
                              className="py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Building2 size={14} />
                              Transfer
                            </button>
                            <button
                              onClick={() => handleRecordManualPayment(PaymentMethod.OTHER)}
                              disabled={recordingPayment}
                              className="py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <DollarSign size={14} />
                              Other
                            </button>
                          </div>
                          
                          <textarea
                            value={manualPaymentNote}
                            onChange={(e) => setManualPaymentNote(e.target.value)}
                            placeholder="Add a note (optional)"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-care-orange/20 focus:border-care-orange resize-none"
                            rows={2}
                          />
                          
                          <button
                            onClick={() => setShowManualPayment(false)}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                          
                          {recordingPayment && (
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                              <Loader2 size={14} className="animate-spin" />
                              Recording payment...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Info */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Invoice #{invoice.invoiceNumber}</p>
                  <p>Created {formatShortDate(invoice.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePaymentPage;