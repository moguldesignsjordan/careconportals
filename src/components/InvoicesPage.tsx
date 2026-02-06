// src/components/InvoicesPage.tsx
// Invoice List and Management Page

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Send,
  Eye,
  MoreVertical,
  Trash2,
  XCircle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { User, UserRole, Project } from '../types';
import { Invoice, InvoiceStatus } from '../types/invoice';

interface InvoicesPageProps {
  invoices: Invoice[];
  currentUser: User;
  users: User[];
  projects: Project[];
  onCreateInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onSendInvoice: (invoiceId: string) => Promise<void>;
  onCancelInvoice: (invoiceId: string) => Promise<void>;
  onDeleteInvoice: (invoiceId: string) => Promise<void>;
  onRefreshOverdue: () => Promise<void>;
}

// Status configuration
const getStatusConfig = (status: InvoiceStatus) => {
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

// Format currency (cents to dollars)
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const InvoicesPage: React.FC<InvoicesPageProps> = ({
  invoices,
  currentUser,
  users,
  projects,
  onCreateInvoice,
  onViewInvoice,
  onSendInvoice,
  onCancelInvoice,
  onDeleteInvoice,
  onRefreshOverdue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Get client name
  const getClientName = (clientId: string): string => {
    const client = users.find((u) => u.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Get project title
  const getProjectTitle = (projectId?: string): string => {
    if (!projectId) return '';
    const project = projects.find((p) => p.id === projectId);
    return project?.title || '';
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paid = invoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + inv.amountPaid, 0);
    const outstanding = invoices
      .filter((inv) => ![InvoiceStatus.PAID, InvoiceStatus.CANCELED, InvoiceStatus.DRAFT].includes(inv.status))
      .reduce((sum, inv) => sum + inv.amountDue, 0);
    const overdueCount = invoices.filter((inv) => inv.status === InvoiceStatus.OVERDUE).length;

    return { total, paid, outstanding, overdueCount };
  }, [invoices]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getClientName(inv.clientId).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, filterStatus, users]);

  // Handle actions
  const handleAction = async (action: string, invoiceId: string) => {
    setActiveMenu(null);
    setLoading(invoiceId);
    try {
      switch (action) {
        case 'send':
          await onSendInvoice(invoiceId);
          break;
        case 'cancel':
          await onCancelInvoice(invoiceId);
          break;
        case 'delete':
          await onDeleteInvoice(invoiceId);
          break;
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleRefresh = async () => {
    setLoading('refresh');
    try {
      await onRefreshOverdue();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
            Financial
          </p>
          <h1 className="text-2xl font-black text-gray-900">Invoices</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading === 'refresh'}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            <RefreshCw size={14} className={loading === 'refresh' ? 'animate-spin' : ''} />
            Update Status
          </button>
          {currentUser.role === UserRole.ADMIN && (
            <button
              onClick={onCreateInvoice}
              className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all"
            >
              <Plus size={16} />
              Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <DollarSign className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-black text-gray-900">{formatCurrency(stats.total)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Collected</p>
              <p className="text-lg font-black text-green-600">{formatCurrency(stats.paid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-lg font-black text-yellow-600">{formatCurrency(stats.outstanding)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Overdue</p>
              <p className="text-lg font-black text-red-600">{stats.overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0 transition-all"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | 'all')}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium min-w-[150px]"
        >
          <option value="all">All Statuses</option>
          {Object.values(InvoiceStatus).map((status) => (
            <option key={status} value={status}>
              {getStatusConfig(status).label}
            </option>
          ))}
        </select>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => {
                  const statusConfig = getStatusConfig(invoice.status);
                  const isOverdue =
                    invoice.status !== InvoiceStatus.PAID &&
                    invoice.status !== InvoiceStatus.CANCELED &&
                    new Date(invoice.dueDate) < new Date();

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onViewInvoice(invoice)}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{invoice.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {getClientName(invoice.clientId)}
                        </p>
                        {invoice.projectId && (
                          <p className="text-xs text-gray-500">{getProjectTitle(invoice.projectId)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </p>
                        {invoice.amountPaid > 0 && invoice.amountPaid < invoice.totalAmount && (
                          <p className="text-xs text-green-600">
                            {formatCurrency(invoice.amountPaid)} paid
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                          <span className={`text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                            {formatDate(invoice.dueDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onViewInvoice(invoice)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye size={16} className="text-gray-400" />
                          </button>

                          {invoice.status === InvoiceStatus.DRAFT && (
                            <button
                              onClick={() => handleAction('send', invoice.id)}
                              disabled={loading === invoice.id}
                              className="p-2 hover:bg-care-orange/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Send"
                            >
                              <Send size={16} className="text-care-orange" />
                            </button>
                          )}

                          {invoice.squarePaymentUrl && (
                            <a
                              href={invoice.squarePaymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Payment Link"
                            >
                              <ExternalLink size={16} className="text-blue-500" />
                            </a>
                          )}

                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(activeMenu === invoice.id ? null : invoice.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={16} className="text-gray-400" />
                            </button>

                            {activeMenu === invoice.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-[140px]">
                                {invoice.status !== InvoiceStatus.CANCELED &&
                                  invoice.status !== InvoiceStatus.PAID && (
                                    <button
                                      onClick={() => handleAction('cancel', invoice.id)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                                    >
                                      <XCircle size={14} />
                                      Cancel
                                    </button>
                                  )}

                                {invoice.status === InvoiceStatus.DRAFT && (
                                  <button
                                    onClick={() => handleAction('delete', invoice.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first invoice to get started'}
            </p>
            {currentUser.role === UserRole.ADMIN && !searchQuery && filterStatus === 'all' && (
              <button
                onClick={onCreateInvoice}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all"
              >
                <Plus size={16} />
                Create Invoice
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </p>
          <p>
            Total:{' '}
            <span className="font-bold text-gray-900">
              {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
            </span>
          </p>
        </div>
      )}

      {/* Click outside to close menu */}
      {activeMenu && <div className="fixed inset-0 z-0" onClick={() => setActiveMenu(null)} />}
    </div>
  );
};

export default InvoicesPage;