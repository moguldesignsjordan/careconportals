import React, { useState } from 'react';
import { User, UserRole, Invoice, InvoiceStatus } from '../types';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  Eye,
} from 'lucide-react';

interface InvoicesPageProps {
  currentUser: User;
  invoices?: Invoice[];
  onCreateInvoice?: () => void;
  onViewInvoice?: (invoice: Invoice) => void;
}

const InvoicesPage: React.FC<InvoicesPageProps> = ({
  currentUser,
  invoices = [],
  onCreateInvoice,
  onViewInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');

  // Helper function to format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Helper function to get status badge styling
  const getStatusBadge = (status: InvoiceStatus) => {
    const styles = {
      [InvoiceStatus.DRAFT]: 'bg-gray-100 text-gray-700',
      [InvoiceStatus.SCHEDULED]: 'bg-blue-100 text-blue-700',
      [InvoiceStatus.SENT]: 'bg-yellow-100 text-yellow-700',
      [InvoiceStatus.PARTIALLY_PAID]: 'bg-orange-100 text-orange-700',
      [InvoiceStatus.PAID]: 'bg-green-100 text-green-700',
      [InvoiceStatus.OVERDUE]: 'bg-red-100 text-red-700',
      [InvoiceStatus.CANCELED]: 'bg-gray-100 text-gray-500',
      [InvoiceStatus.REFUNDED]: 'bg-purple-100 text-purple-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
    overdue: invoices.filter((i) => i.status === InvoiceStatus.OVERDUE).length,
    pending: invoices.filter((i) => i.status === InvoiceStatus.SENT).length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    paidAmount: invoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
  };

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isContractor = currentUser.role === UserRole.CONTRACTOR;
  const canCreateInvoice = isAdmin || isContractor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Invoices
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage invoices and track payments
          </p>
        </div>

        {canCreateInvoice && (
          <button
            onClick={onCreateInvoice}
            className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all shadow-lg shadow-care-orange/20"
          >
            <Plus size={16} />
            New Invoice
          </button>
        )}
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
              <Receipt size={18} className="text-care-orange" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
                Total Invoices
              </p>
              <p className="text-lg font-black text-[#111827]">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
                Paid
              </p>
              <p className="text-lg font-black text-[#111827]">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Clock size={18} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
                Pending
              </p>
              <p className="text-lg font-black text-[#111827]">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
                Overdue
              </p>
              <p className="text-lg font-black text-[#111827]">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-care-orange/20 focus:border-care-orange"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as InvoiceStatus | 'ALL')
              }
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-care-orange/20 focus:border-care-orange appearance-none bg-white min-w-[180px]"
            >
              <option value="ALL">All Status</option>
              <option value={InvoiceStatus.DRAFT}>Draft</option>
              <option value={InvoiceStatus.SCHEDULED}>Scheduled</option>
              <option value={InvoiceStatus.SENT}>Sent</option>
              <option value={InvoiceStatus.PARTIALLY_PAID}>Partially Paid</option>
              <option value={InvoiceStatus.PAID}>Paid</option>
              <option value={InvoiceStatus.OVERDUE}>Overdue</option>
              <option value={InvoiceStatus.CANCELED}>Canceled</option>
              <option value={InvoiceStatus.REFUNDED}>Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No invoices found
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Create your first invoice to get started'}
            </p>
            {canCreateInvoice && !searchTerm && statusFilter === 'ALL' && (
              <button
                onClick={onCreateInvoice}
                className="inline-flex items-center gap-2 px-4 py-2 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all"
              >
                <Plus size={16} />
                Create Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {invoice.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {invoice.title}
                      </span>
                      {invoice.projectTitle && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {invoice.projectTitle}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {invoice.clientId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </span>
                        {invoice.amountPaid > 0 && (
                          <p className="text-xs text-green-600">
                            Paid: {formatCurrency(invoice.amountPaid)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadge(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => onViewInvoice?.(invoice)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-care-orange hover:bg-care-orange/10 rounded-lg transition-colors"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;