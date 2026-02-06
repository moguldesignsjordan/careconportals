// src/components/InvoiceView.tsx
// Invoice Detail View with Embedded Square Payment

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  User as UserIcon,
  Briefcase,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Download,
  Send,
  Loader2,
} from 'lucide-react';
import { Invoice, InvoiceStatus, PaymentMethod } from '../types/invoice';
import { User, Project } from '../types';
import { recordPayment } from '../services/invoices';

interface InvoiceViewProps {
  invoice: Invoice;
  currentUser: User;
  users: User[];
  projects: Project[];
  onClose: () => void;
  onPaymentComplete?: () => void;
}

// Format currency
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Status config
const getStatusConfig = (status: InvoiceStatus) => {
  const configs: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: any }> = {
    [InvoiceStatus.DRAFT]: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100', icon: FileText },
    [InvoiceStatus.SCHEDULED]: { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
    [InvoiceStatus.SENT]: { label: 'Awaiting Payment', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
    [InvoiceStatus.PARTIALLY_PAID]: { label: 'Partially Paid', color: 'text-orange-600', bg: 'bg-orange-100', icon: DollarSign },
    [InvoiceStatus.PAID]: { label: 'Paid', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
    [InvoiceStatus.OVERDUE]: { label: 'Overdue', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
    [InvoiceStatus.CANCELED]: { label: 'Canceled', color: 'text-gray-400', bg: 'bg-gray-50', icon: X },
    [InvoiceStatus.REFUNDED]: { label: 'Refunded', color: 'text-purple-600', bg: 'bg-purple-100', icon: DollarSign },
  };
  return configs[status] || configs[InvoiceStatus.DRAFT];
};

const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoice,
  currentUser,
  users,
  projects,
  onClose,
  onPaymentComplete,
}) => {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Get client and project info
  const client = users.find((u) => u.id === invoice.clientId);
  const project = invoice.projectId ? projects.find((p) => p.id === invoice.projectId) : null;

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  const canPay = [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status);
  const isClient = currentUser.id === invoice.clientId;

  // Square Web Payments SDK integration
  useEffect(() => {
    if (!showPayment) return;

    // Load Square Web Payments SDK
    const script = document.createElement('script');
    script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use 'https://web.squarecdn.com/v1/square.js' for production
    script.async = true;
    script.onload = initializeSquare;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [showPayment]);

  const initializeSquare = async () => {
    // @ts-ignore - Square is loaded via script
    if (!window.Square) {
      console.error('Square SDK not loaded');
      return;
    }

    try {
      // @ts-ignore
      const payments = window.Square.payments(
        import.meta.env.VITE_SQUARE_APP_ID || 'sandbox-sq0idb-XXXX', // Replace with your app ID
        import.meta.env.VITE_SQUARE_LOCATION_ID || 'LXXXX' // Replace with your location ID
      );

      const card = await payments.card();
      await card.attach('#card-container');

      // Store card instance for payment
      // @ts-ignore
      window.squareCard = card;
    } catch (error) {
      console.error('Error initializing Square:', error);
      setPaymentError('Failed to load payment form. Please try again.');
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      // @ts-ignore
      const card = window.squareCard;
      if (!card) {
        throw new Error('Payment form not ready');
      }

      // Tokenize the card
      const result = await card.tokenize();

      if (result.status === 'OK') {
        // In production, send this token to your backend to process payment
        // For now, we'll simulate a successful payment
        console.log('Payment token:', result.token);

        // Record the payment in Firebase
        await recordPayment(
          invoice.id,
          {
            amount: invoice.amountDue,
            method: PaymentMethod.CREDIT_CARD,
            transactionId: result.token,
            note: 'Paid via Square',
          },
          currentUser.id
        );

        setPaymentSuccess(true);
        onPaymentComplete?.();

        // Close after delay
        setTimeout(() => {
          setShowPayment(false);
          onClose();
        }, 2000);
      } else {
        throw new Error(result.errors?.[0]?.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
              <FileText className="text-care-orange" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">{invoice.invoiceNumber}</h2>
              <p className="text-xs text-gray-500">{invoice.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
              <StatusIcon size={12} />
              {statusConfig.label}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Client & Project Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <UserIcon size={12} />
                <span className="uppercase tracking-wider font-bold">Bill To</span>
              </div>
              <p className="font-bold text-gray-900">{client?.name || 'Unknown Client'}</p>
              <p className="text-sm text-gray-500">{client?.email}</p>
            </div>
            {project && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Briefcase size={12} />
                  <span className="uppercase tracking-wider font-bold">Project</span>
                </div>
                <p className="font-bold text-gray-900">{project.title}</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="flex gap-4">
            {invoice.issueDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-gray-500">Issued:</span>
                <span className="font-medium">{formatDate(invoice.issueDate)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className={invoice.status === InvoiceStatus.OVERDUE ? 'text-red-500' : 'text-gray-400'} />
              <span className="text-gray-500">Due:</span>
              <span className={`font-medium ${invoice.status === InvoiceStatus.OVERDUE ? 'text-red-600' : ''}`}>
                {formatDate(invoice.dueDate)}
              </span>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-black text-gray-400 uppercase">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-black text-gray-400 uppercase w-20">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-black text-gray-400 uppercase w-28">Price</th>
                  <th className="text-right px-4 py-3 text-xs font-black text-gray-400 uppercase w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({(invoice.taxRate * 100).toFixed(2)}%)</span>
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
              <span className="font-black text-gray-900">Total</span>
              <span className="font-black text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Amount Paid</span>
                  <span className="font-medium">-{formatCurrency(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-gray-200">
                  <span className="font-black text-care-orange">Amount Due</span>
                  <span className="font-black text-care-orange">{formatCurrency(invoice.amountDue)}</span>
                </div>
              </>
            )}
          </div>

          {/* Customer Notes */}
          {invoice.customerNotes && (
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Note</p>
              <p className="text-sm text-blue-800">{invoice.customerNotes}</p>
            </div>
          )}

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Payment History</h3>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-500" size={16} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(payment.paidAt)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 uppercase">{payment.method}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Square Payment Form */}
          {showPayment && (
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-care-orange">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-care-orange" />
                Pay with Card
              </h3>

              {paymentSuccess ? (
                <div className="p-4 bg-green-100 rounded-lg flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={24} />
                  <div>
                    <p className="font-bold text-green-800">Payment Successful!</p>
                    <p className="text-sm text-green-600">Thank you for your payment.</p>
                  </div>
                </div>
              ) : (
                <>
                  {paymentError && (
                    <div className="p-3 bg-red-100 rounded-lg mb-4 flex items-center gap-2">
                      <AlertCircle className="text-red-500" size={16} />
                      <span className="text-sm text-red-700">{paymentError}</span>
                    </div>
                  )}

                  {/* Square Card Element Container */}
                  <div id="card-container" className="mb-4 min-h-[100px] bg-white rounded-lg p-4 border border-gray-200" />

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black text-gray-900">
                      Pay: <span className="text-care-orange">{formatCurrency(invoice.amountDue)}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPayment(false)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePayment}
                        disabled={paymentLoading}
                        className="px-6 py-2 bg-care-orange text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        {paymentLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CreditCard size={16} />
                        )}
                        Pay Now
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Payments are securely processed by Square
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>

          <div className="flex gap-2">
            {canPay && isClient && !showPayment && (
              <button
                onClick={() => setShowPayment(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all"
              >
                <CreditCard size={16} />
                Pay {formatCurrency(invoice.amountDue)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
