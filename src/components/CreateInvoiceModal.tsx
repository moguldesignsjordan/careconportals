// src/components/CreateInvoiceModal.tsx
// Complete Invoice Creation Modal with Square Integration

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  DollarSign,
  Calendar,
  User as UserIcon,
  Briefcase,
  Plus,
  Trash2,
  Loader2,
  CreditCard,
  Send,
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { User, UserRole, Project } from '../types';
import { 
  InvoiceStatus, 
  PaymentMethod, 
  CreateInvoiceData,
  CreateInvoiceLineItem 
} from '../types/invoice';
import { dollarsToCents, centsToDollars } from '../services/invoices';
import { isSquareConfigured, getSquareConfigStatus } from '../services/square';

// ============ PROPS ============

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  projects: Project[];
  onCreateInvoice: (data: CreateInvoiceData, publish: boolean) => Promise<void>;
  preselectedProjectId?: string;
  preselectedClientId?: string;
}

// ============ INTERNAL TYPES ============

interface LineItemForm {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // In dollars for display
}

// ============ COMPONENT ============

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  projects,
  onCreateInvoice,
  preselectedProjectId,
  preselectedClientId,
}) => {
  // ============ STATE ============
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState(preselectedClientId || '');
  const [projectId, setProjectId] = useState(preselectedProjectId || '');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(0); // Percentage (e.g., 8.25)
  const [discountAmount, setDiscountAmount] = useState(0); // In dollars
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [allowPartialPayments, setAllowPartialPayments] = useState(true);
  const [enableSquare, setEnableSquare] = useState(true);

  // Line items (in dollars for display)
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 },
  ]);

  // ============ DERIVED DATA ============

  // Get clients from users list
  const clients = useMemo(() => {
    const clientList = users.filter((u) => u.role === UserRole.CLIENT);
    console.log('Available clients:', clientList.length, clientList.map(c => ({ id: c.id, name: c.name, role: c.role })));
    return clientList;
  }, [users]);

  // Get accessible projects
  const accessibleProjects = useMemo(() => {
    if (currentUser.role === UserRole.ADMIN) {
      return projects;
    }
    return projects.filter((project) => {
      const clientIds = project.clientIds || (project.clientId ? [project.clientId] : []);
      const contractorIds = project.contractorIds || (project.contractorId ? [project.contractorId] : []);
      return clientIds.includes(currentUser.id) || contractorIds.includes(currentUser.id);
    });
  }, [projects, currentUser]);

  // Get selected client details
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === clientId);
  }, [clients, clientId]);

  // Get selected project details
  const selectedProject = useMemo(() => {
    return accessibleProjects.find((p) => p.id === projectId);
  }, [accessibleProjects, projectId]);

  // Filter projects by selected client
  const clientProjects = useMemo(() => {
    if (!clientId) return accessibleProjects;
    return accessibleProjects.filter((project) => {
      const projectClientIds = project.clientIds || (project.clientId ? [project.clientId] : []);
      return projectClientIds.includes(clientId);
    });
  }, [accessibleProjects, clientId]);

  // Square config status
  const squareStatus = useMemo(() => getSquareConfigStatus(), []);

  // Calculate totals (in dollars for display)
  const calculations = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = Math.max(0, subtotal + taxAmount - discountAmount);

    return {
      subtotal,
      taxAmount,
      discountAmount,
      total,
    };
  }, [lineItems, taxRate, discountAmount]);

  // ============ EFFECTS ============

  // Set default due date (30 days from today)
  useEffect(() => {
    if (!dueDate) {
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setDueDate(defaultDue.toISOString().split('T')[0]);
    }
  }, [dueDate]);

  // Update preselected values
  useEffect(() => {
    if (preselectedClientId) setClientId(preselectedClientId);
    if (preselectedProjectId) setProjectId(preselectedProjectId);
  }, [preselectedClientId, preselectedProjectId]);

  // Auto-select project if client has only one
  useEffect(() => {
    if (clientId && clientProjects.length === 1 && !projectId) {
      setProjectId(clientProjects[0].id);
    }
  }, [clientId, clientProjects, projectId]);

  // Debug logging
  useEffect(() => {
    console.log('CreateInvoiceModal - Users:', users.length);
    console.log('CreateInvoiceModal - Clients:', clients.length);
    console.log('CreateInvoiceModal - Projects:', projects.length);
    console.log('CreateInvoiceModal - Accessible Projects:', accessibleProjects.length);
  }, [users, clients, projects, accessibleProjects]);

  // ============ HANDLERS ============

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleLineItemChange = (
    id: string,
    field: keyof LineItemForm,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const validateForm = (): boolean => {
    if (!clientId) {
      setError('Please select a client');
      return false;
    }
    if (!title.trim()) {
      setError('Please enter an invoice title');
      return false;
    }
    if (!dueDate) {
      setError('Please select a due date');
      return false;
    }
    if (lineItems.every((item) => !item.description.trim())) {
      setError('Please add at least one line item with a description');
      return false;
    }
    if (calculations.total <= 0) {
      setError('Invoice total must be greater than zero');
      return false;
    }
    return true;
  };

  const handleSubmit = async (publish: boolean) => {
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Convert line items to cents for storage
      const lineItemsInCents: CreateInvoiceLineItem[] = lineItems
        .filter((item) => item.description.trim())
        .map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: dollarsToCents(item.unitPrice),
        }));

      // Build create data
      const createData: CreateInvoiceData = {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        clientId,
        lineItems: lineItemsInCents,
        taxRate: taxRate / 100, // Convert percentage to decimal
        discountAmount: dollarsToCents(discountAmount),
        dueDate,
        allowPartialPayments,
        autoPayEnabled: false,
        acceptedPaymentMethods: enableSquare
          ? [PaymentMethod.CREDIT_CARD, PaymentMethod.SQUARE]
          : [PaymentMethod.CHECK, PaymentMethod.BANK_TRANSFER],
        customerNotes: customerNotes.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      };

      await onCreateInvoice(createData, publish);
      setSuccess(true);
      
      // Close after short delay to show success
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setClientId(preselectedClientId || '');
    setProjectId(preselectedProjectId || '');
    setDueDate('');
    setTaxRate(0);
    setDiscountAmount(0);
    setCustomerNotes('');
    setInternalNotes('');
    setAllowPartialPayments(true);
    setEnableSquare(true);
    setLineItems([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
    setError(null);
    setSuccess(false);
  };

  // ============ RENDER ============

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
              <FileText className="text-care-orange" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Create Invoice</h2>
              <p className="text-xs text-gray-500">Generate a new client invoice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="text-green-500" size={20} />
              <span className="text-sm font-medium text-green-700">
                Invoice created successfully!
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <span className="text-sm font-medium text-red-700">{error}</span>
            </div>
          )}

          {/* Debug Info - Remove in production */}
          {clients.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <strong>Debug:</strong> No clients found in users array.
              Total users: {users.length}.
              User roles: {users.map(u => u.role).join(', ')}
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Client *
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId(''); // Reset project when client changes
                }}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold appearance-none cursor-pointer"
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Link to Project (Optional)
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold appearance-none cursor-pointer"
                disabled={!clientId && clientProjects.length === 0}
              >
                <option value="">No project linked</option>
                {(clientId ? clientProjects : accessibleProjects).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Title */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Invoice Title *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="e.g., Kitchen Renovation - Phase 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Additional details about this invoice..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium resize-none"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Due Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Line Items *
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="flex items-center gap-1.5 text-xs font-bold text-care-orange hover:text-orange-600 transition-colors"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100"
                >
                  <div className="flex gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Description (e.g., Labor - Electrical)"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:border-care-orange focus:ring-0"
                    />
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase mb-1">Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:border-care-orange focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase mb-1">Unit Price ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:border-care-orange focus:ring-0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase mb-1">Amount</label>
                      <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-bold text-gray-700">
                        ${(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax and Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="8.25"
                value={taxRate || ''}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Discount ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-bold"
                />
              </div>
            </div>
          </div>

          {/* Totals Display */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold">${calculations.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({taxRate}%)</span>
                <span className="font-bold">${calculations.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-bold text-green-600">-${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-lg pt-2 border-t border-gray-200">
              <span className="font-black text-gray-900">Total</span>
              <span className="font-black text-care-orange">${calculations.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={allowPartialPayments}
                onChange={(e) => setAllowPartialPayments(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-care-orange focus:ring-care-orange"
              />
              <div>
                <p className="text-sm font-bold text-gray-900">Allow Partial Payments</p>
                <p className="text-xs text-gray-500">Client can make multiple payments</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors border border-blue-100">
              <input
                type="checkbox"
                checked={enableSquare}
                onChange={(e) => setEnableSquare(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-care-orange focus:ring-care-orange"
              />
              <CreditCard className="text-blue-600" size={20} />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Enable Square Payments</p>
                <p className="text-xs text-gray-500">
                  {squareStatus.isConfigured 
                    ? `Connected (${squareStatus.environment})`
                    : 'Not configured - add Square credentials to .env'}
                </p>
              </div>
              {squareStatus.isConfigured && (
                <CheckCircle className="text-green-500" size={16} />
              )}
            </label>
          </div>

          {/* Customer Notes */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Customer Notes (visible to client)
            </label>
            <textarea
              rows={2}
              placeholder="Thank you for your business!"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium resize-none"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Internal Notes (not visible to client)
            </label>
            <textarea
              rows={2}
              placeholder="Private notes for your team..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-6 border-2 border-gray-200 rounded-xl font-black uppercase tracking-widest text-xs text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="flex-1 py-3 px-6 border-2 border-gray-200 rounded-xl font-black uppercase tracking-widest text-xs text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="flex-1 py-3 px-6 bg-care-orange text-white rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-care-orange/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Send Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;