// src/components/InvoiceDetailModal.tsx
// Modal for viewing full invoice details and recording manual payments

import React, { useState } from 'react';
import {
  X,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Send,
  FileText,
  Printer,
  Download,
  Plus,
  Hash,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Invoice, InvoiceStatus, PaymentMethod, User as UserType } from '../types';
import { formatCurrency, getInvoiceStatusColor, recordManualPayment, dollarsToCents } from '../services/invoices';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  client: UserType | null;
  currentUser: UserType;
  isAdmin: boolean;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  project?: { id: string; name: string; address?: string } | null;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  client,
  currentUser,
  isAdmin,
  onClose,
  showToast,
  project,
}) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentNote, setPaymentNote] = useState('');
  const [recording, setRecording] = useState(false);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format short date
  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check if overdue
  const isOverdue = invoice.status !== InvoiceStatus.PAID && 
                   invoice.status !== InvoiceStatus.CANCELED && 
                   new Date(invoice.dueDate) < new Date();

  // Can record payment
  const canRecordPayment = invoice.status !== InvoiceStatus.PAID && 
                          invoice.status !== InvoiceStatus.CANCELED &&
                          invoice.status !== InvoiceStatus.DRAFT;

  // Handle record payment
  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (dollarsToCents(amount) > invoice.amountDue) {
      showToast('Payment amount exceeds balance due', 'error');
      return;
    }

    setRecording(true);
    try {
      await recordManualPayment(
        invoice.id,
        {
          amount: dollarsToCents(amount),
          method: paymentMethod,
          note: paymentNote || undefined,
        },
        currentUser.id
      );
      showToast('Payment recorded successfully!', 'success');
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (error: any) {
      showToast(error.message || 'Failed to record payment', 'error');
    } finally {
      setRecording(false);
    }
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

  // Get payment method icon
  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return Banknote;
      case PaymentMethod.CHECK: return FileText;
      case PaymentMethod.BANK_TRANSFER: return Building2;
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.SQUARE_ONLINE:
      case PaymentMethod.CARD_ON_FILE: return CreditCard;
      default: return DollarSign;
    }
  };

  // Print invoice
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
              <Receipt className="text-care-orange" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111827] flex items-center gap-2">
                {invoice.invoiceNumber}
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getInvoiceStatusColor(invoice.status)}`}>
                  {invoice.status.replace('_', ' ')}
                </span>
              </h2>
              <p className="text-sm text-gray-500">{invoice.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Print Invoice"
            >
              <Printer size={18} className="text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Overdue Warning */}
          {isOverdue && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
              <div>
                <p className="font-bold text-red-700">This invoice is overdue</p>
                <p className="text-sm text-red-600">
                  Was due on {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          )}

          {/* Client & Project Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client */}
            {client && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Bill To
                </h3>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-care-orange/10 flex items-center justify-center flex-shrink-0">
                    <User className="text-care-orange" size={18} />
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

            {/* Project */}
            {project && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Project
                </h3>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="text-blue-600" size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#111827]">{project.name}</p>
                    {project.address && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                        <MapPin size={12} />
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Issue Date</span>
              </div>
              <p className="font-medium text-[#111827]">{formatShortDate(invoice.issueDate)}</p>
            </div>
            <div className={`rounded-xl p-4 ${isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className={isOverdue ? 'text-red-400' : 'text-gray-400'} />
                <span className={`text-xs font-bold uppercase tracking-wider ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>Due Date</span>
              </div>
              <p className={`font-medium ${isOverdue ? 'text-red-700' : 'text-[#111827]'}`}>
                {formatShortDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          {/* Description */}
          {invoice.description && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Description
              </h3>
              <p className="text-gray-700">{invoice.description}</p>
            </div>
          )}

          {/* Line Items */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Line Items
            </h3>
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-200">
                {invoice.lineItems.map((item, index) => (
                  <div key={item.id || index} className="px-4 py-3 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#111827]">{item.description}</p>
                      {item.quantity > 1 && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-[#111827] ml-4">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
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
            <hr className="border-gray-200" />
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
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Balance Due</span>
                    <span className="font-bold text-care-orange">{formatCurrency(invoice.amountDue)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                <CreditCard size={14} />
                Payment History
              </h3>
              <div className="space-y-2">
                {invoice.payments.map((payment) => {
                  const PaymentIcon = getPaymentMethodIcon(payment.method);
                  return (
                    <div 
                      key={payment.id} 
                      className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <PaymentIcon size={16} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#111827]">
                            {getPaymentMethodLabel(payment.method)}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(payment.paidAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">{formatCurrency(payment.amount)}</p>
                        {payment.note && (
                          <p className="text-xs text-gray-500 max-w-[150px] truncate">{payment.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Record Manual Payment (Admin only) */}
          {isAdmin && canRecordPayment && (
            <div>
              {!showPaymentForm ? (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-care-orange hover:text-care-orange transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Record Manual Payment
                </button>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <DollarSign size={16} className="text-care-orange" />
                    Record Payment
                  </h3>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={`Max: ${(invoice.amountDue / 100).toFixed(2)}`}
                        className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-care-orange/20 focus:border-care-orange"
                        step="0.01"
                        min="0"
                        max={invoice.amountDue / 100}
                      />
                    </div>
                    <button
                      onClick={() => setPaymentAmount((invoice.amountDue / 100).toFixed(2))}
                      className="text-xs text-care-orange hover:underline mt-1"
                    >
                      Pay full balance ({formatCurrency(invoice.amountDue)})
                    </button>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { method: PaymentMethod.CASH, label: 'Cash', icon: Banknote },
                        { method: PaymentMethod.CHECK, label: 'Check', icon: FileText },
                        { method: PaymentMethod.BANK_TRANSFER, label: 'Transfer', icon: Building2 },
                      ].map(({ method, label, icon: Icon }) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            paymentMethod === method
                              ? 'bg-care-orange text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-care-orange'
                          }`}
                        >
                          <Icon size={14} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      Note (Optional)
                    </label>
                    <textarea
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="e.g., Check #1234, reference number, etc."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-care-orange/20 focus:border-care-orange resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setPaymentAmount('');
                        setPaymentNote('');
                      }}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRecordPayment}
                      disabled={recording || !paymentAmount}
                      className="flex-1 py-2.5 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {recording ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Record Payment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {(invoice.customerNotes || (isAdmin && invoice.internalNotes)) && (
            <div className="space-y-4">
              {invoice.customerNotes && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">
                    {invoice.customerNotes}
                  </p>
                </div>
              )}
              {isAdmin && invoice.internalNotes && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
                    Internal Notes (Admin Only)
                  </h3>
                  <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-4">
                    {invoice.internalNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <div className="text-xs text-gray-500">
            Created {formatDate(invoice.createdAt)}
            {invoice.updatedAt !== invoice.createdAt && (
              <span className="ml-2">• Updated {formatDate(invoice.updatedAt)}</span>
            )}
          </div>
          
          <div className="flex gap-2">
            {invoice.squarePaymentUrl && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && (
              <a
                href={invoice.squarePaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
              >
                <CreditCard size={16} />
                Pay Now
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;