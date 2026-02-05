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
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  client,
  currentUser,
  isAdmin,
  onClose,
  showToast,
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

  // Check if overdue
  const isOverdue = invoice.status !== InvoiceStatus.PAID && 
                   invoice.status !== InvoiceStatus.CANCELED && 
                   new Date(invoice.dueDate) < new Date();

  // Handle record payment
  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
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
      case PaymentMethod.OTHER: return 'Other';
      default: return method;
    }
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Alert for overdue */}
          {isOverdue && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="text-red-500" size={20} />
              <div>
                <p className="font-bold text-red-700">This invoice is overdue</p>
                <p className="text-sm text-red-600">
                  Due date was {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          )}

          {/* Client & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                <Building2 size={14} />
                Bill To
              </h3>
              {client ? (
                <div className="space-y-2">
                  <p className="font-bold text-[#111827]">{client.name}</p>
                  {client.email && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Mail size={14} className="text-gray-400" />
                      {client.email}
                    </p>
                  )}
                  {client.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      {client.phone}
                    </p>
                  )}
                  {client.location && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      {client.location}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Client not found</p>
              )}
            </div>

            {/* Dates */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                <Calendar size={14} />
                Dates
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Issue Date</span>
                  <span className="font-medium">{formatDate(invoice.issueDate || invoice.createdAt)}</span>
                </div>
                <div className={`flex justify-between text-sm ${isOverdue ? 'text-red-600' : ''}`}>
                  <span className={isOverdue ? 'text-red-500' : 'text-gray-500'}>Due Date</span>
                  <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Paid On</span>
                    <span className="font-medium">{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
              </div>
              
              {invoice.projectTitle && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Project</p>
                  <p className="text-sm font-medium text-[#111827] flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />
                    {invoice.projectTitle}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Line Items
            </h3>
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 w-20">
                      Qty
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 w-28">
                      Unit Price
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 w-28">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 text-sm text-[#111827]">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-[#111827]">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({((invoice.taxRate || 0) * 100).toFixed(1)}%)</span>
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
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                <CreditCard size={14} />
                Payment History
              </h3>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle size={16} className="text-emerald-600" />
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
                        <p className="text-xs text-gray-500">{payment.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Record Manual Payment (Admin only) */}
          {isAdmin && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && (
            <div>
              {!showPaymentForm ? (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="flex items-center gap-2 text-sm font-bold text-care-orange hover:text-orange-600"
                >
                  <Plus size={16} />
                  Record Manual Payment
                </button>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-bold text-[#111827]">Record Payment</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Amount *
                      </label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          max={(invoice.amountDue / 100)}
                          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Method *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                      >
                        <option value={PaymentMethod.CASH}>Cash</option>
                        <option value={PaymentMethod.CHECK}>Check</option>
                        <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                        <option value={PaymentMethod.OTHER}>Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="e.g., Check #1234"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRecordPayment}
                      disabled={recording}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Banknote size={16} />
                      {recording ? 'Recording...' : 'Record Payment'}
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
