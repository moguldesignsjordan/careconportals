// src/components/CreateInvoiceModal.tsx
// Modal for creating new invoices with line items

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Receipt,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  Save,
  Send,
  AlertCircle,
  CreditCard,
  Landmark,
  Wallet,
} from 'lucide-react';
import { User, UserRole, Project, CreateInvoiceData } from '../types';
import { formatCurrency, dollarsToCents } from '../services/invoices';

interface LineItemInput {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // In dollars for input
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvoiceData, publish: boolean) => Promise<void>;
  clients: User[];
  projects: Project[];
  preselectedProjectId?: string;
  preselectedClientId?: string;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  clients,
  projects,
  preselectedProjectId,
  preselectedClientId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(preselectedProjectId || '');
  const [clientId, setClientId] = useState(preselectedClientId || '');
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default to 30 days from now
    return date.toISOString().split('T')[0];
  });
  const [scheduledSendDate, setScheduledSendDate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [allowPartialPayments, setAllowPartialPayments] = useState(true);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  
  // Payment methods
  const [acceptCard, setAcceptCard] = useState(true);
  const [acceptBank, setAcceptBank] = useState(false);
  const [acceptCashApp, setAcceptCashApp] = useState(true);
  
  // Line items
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 },
  ]);

  // Auto-fill client when project is selected
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === projectId);
  }, [projectId, projects]);

  // Update client when project changes
  React.useEffect(() => {
    if (selectedProject?.clientId && !clientId) {
      setClientId(selectedProject.clientId);
    }
  }, [selectedProject, clientId]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discountAmount;
    
    return {
      subtotal,
      taxAmount,
      discountAmount,
      total: Math.max(0, total),
    };
  }, [lineItems, taxRate, discountAmount]);

  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Update line item
  const updateLineItem = (id: string, field: keyof LineItemInput, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!title.trim()) return 'Invoice title is required';
    if (!clientId) return 'Please select a client';
    if (!dueDate) return 'Due date is required';
    
    const hasValidItems = lineItems.some(item => 
      item.description.trim() && item.quantity > 0 && item.unitPrice > 0
    );
    
    if (!hasValidItems) return 'Add at least one line item with description and amount';
    
    return null;
  };

  // Handle submit
  const handleSubmit = async (publish: boolean) => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const invoiceData: CreateInvoiceData = {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        clientId,
        lineItems: lineItems
          .filter(item => item.description.trim() && item.quantity > 0 && item.unitPrice > 0)
          .map(item => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: dollarsToCents(item.unitPrice),
          })),
        taxRate: taxRate / 100, // Convert percentage to decimal
        discountAmount: dollarsToCents(discountAmount),
        dueDate,
        scheduledSendDate: scheduledSendDate || undefined,
        allowPartialPayments,
        autoPayEnabled,
        customerNotes: customerNotes.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        acceptedPaymentMethods: {
          card: acceptCard,
          bankAccount: acceptBank,
          squareGiftCard: false,
          cashAppPay: acceptCashApp,
        },
      };
      
      await onSubmit(invoiceData, publish);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
              <Receipt className="text-care-orange" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111827]">Create Invoice</h2>
              <p className="text-xs text-gray-500">Fill in the details below</p>
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
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Invoice Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Kitchen Renovation - Phase 1"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-care-orange focus:ring-2 focus:ring-care-orange/10"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                <Building2 size={12} className="inline mr-1" />
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-care-orange focus:ring-2 focus:ring-care-orange/10"
              >
                <option value="">Select client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                <Briefcase size={12} className="inline mr-1" />
                Project (Optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-care-orange focus:ring-2 focus:ring-care-orange/10"
              >
                <option value="">Standalone invoice</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Line Items
              </label>
              <button
                onClick={addLineItem}
                className="flex items-center gap-1 text-xs font-bold text-care-orange hover:text-orange-600"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                    />
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right py-2 font-medium text-sm">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tax & Discount */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Tax Rate %
                  </label>
                  <input
                    type="number"
                    value={taxRate || ''}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Discount $
                  </label>
                  <input
                    type="number"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  <Calendar size={12} className="inline mr-1" />
                  Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Schedule Send (Optional)
                </label>
                <input
                  type="date"
                  value={scheduledSendDate}
                  onChange={(e) => setScheduledSendDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10"
                />
                <p className="text-xs text-gray-400 mt-1">Leave empty to send immediately</p>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({taxRate}%)</span>
                  <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-medium text-green-600">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <hr className="border-gray-200" />
              <div className="flex justify-between">
                <span className="font-bold text-[#111827]">Total</span>
                <span className="text-xl font-black text-care-orange">${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Payment Methods
            </label>
            <div className="flex flex-wrap gap-3">
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${acceptCard ? 'border-care-orange bg-care-orange/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={acceptCard}
                  onChange={(e) => setAcceptCard(e.target.checked)}
                  className="sr-only"
                />
                <CreditCard size={16} className={acceptCard ? 'text-care-orange' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${acceptCard ? 'text-care-orange' : 'text-gray-600'}`}>Card</span>
              </label>
              
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${acceptBank ? 'border-care-orange bg-care-orange/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={acceptBank}
                  onChange={(e) => setAcceptBank(e.target.checked)}
                  className="sr-only"
                />
                <Landmark size={16} className={acceptBank ? 'text-care-orange' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${acceptBank ? 'text-care-orange' : 'text-gray-600'}`}>Bank</span>
              </label>
              
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${acceptCashApp ? 'border-care-orange bg-care-orange/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={acceptCashApp}
                  onChange={(e) => setAcceptCashApp(e.target.checked)}
                  className="sr-only"
                />
                <Wallet size={16} className={acceptCashApp ? 'text-care-orange' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${acceptCashApp ? 'text-care-orange' : 'text-gray-600'}`}>Cash App</span>
              </label>
            </div>
            
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPartialPayments}
                  onChange={(e) => setAllowPartialPayments(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-care-orange focus:ring-care-orange"
                />
                <span className="text-sm text-gray-700">Allow partial payments</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                <FileText size={12} className="inline mr-1" />
                Customer Notes
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Visible to customer..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Internal Notes
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Private notes (not visible to customer)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-1 focus:ring-care-orange/10 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-care-orange/20 disabled:opacity-50"
            >
              <Send size={16} />
              {loading ? 'Sending...' : 'Send Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
