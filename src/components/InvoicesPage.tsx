// src/components/InvoicesPage.tsx
// Complete Invoice List and Management Page

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
} from 'lucide-react';
import { User, UserRole, Project } from '../types';
import { Invoice, InvoiceStatus } from '../types/invoice';
import { 
  getInvoiceStats, 
  getInvoiceStatusConfig, 
  formatCurrency,
} from '../services/invoices';

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
  const [filterClient, setFilterClient] = useState<string>('all');
  const [sortField, setSortField] = useState<'createdAt' | 'dueDate' | 'totalAmount'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const clients = useMemo(() => users.filter((u) => u.role === UserRole.CLIENT), [users]);
  const stats = useMemo(() => getInvoiceStats(invoices), [invoices]);

  const getClientName = (clientId: string): string => {
    return users.find((u) => u.id === clientId)?.name || 'Unknown Client';
  };

  const getProjectTitle = (projectId?: string): string => {
    if (!projectId) return 'No Project';
    return projects.find((p) => p.id === projectId)?.title || 'Unknown Project';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const isOverdue = (invoice: Invoice): boolean => {
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELED) return false;
    return new Date(invoice.dueDate) < new Date();
  };

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((inv) =>
        inv.title.toLowerCase().includes(query) ||
        inv.invoiceNumber.toLowerCase().includes(query) ||
        getClientName(inv.clientId).toLowerCase().includes(query)
      );
    }
    if (filterStatus !== 'all') result = result.filter((inv) => inv.status === filterStatus);
    if (filterClient !== 'all') result = result.filter((inv) => inv.clientId === filterClient);
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'createdAt': comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'dueDate': comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); break;
        case 'totalAmount': comparison = a.totalAmount - b.totalAmount; break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [invoices, searchQuery, filterStatus, filterClient, sortField, sortDirection]);

  const handleAction = async (action: string, invoiceId: string) => {
    setActiveMenu(null);
    setLoading(invoiceId);
    try {
      if (action === 'send') await onSendInvoice(invoiceId);
      else if (action === 'cancel') await onCancelInvoice(invoiceId);
      else if (action === 'delete') await onDeleteInvoice(invoiceId);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleRefreshOverdue = async () => {
    setLoading('refresh');
    try { await onRefreshOverdue(); } finally { setLoading(null); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">Financial</p>
          <h1 className="text-2xl font-black text-gray-900">Invoices</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefreshOverdue} disabled={loading === 'refresh'}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={14} className={loading === 'refresh' ? 'animate-spin' : ''} />
            Update Overdue
          </button>
          {currentUser.role === UserRole.ADMIN && (
            <button onClick={onCreateInvoice}
              className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600">
              <Plus size={16} /> Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<DollarSign className="text-gray-600" size={20} />} label="Total Invoiced"
          value={formatCurrency(stats.totalRevenue + stats.outstandingBalance)} bg="bg-gray-100" />
        <StatCard icon={<CheckCircle className="text-green-600" size={20} />} label="Collected"
          value={formatCurrency(stats.totalRevenue)} bg="bg-green-100" valueColor="text-green-600" />
        <StatCard icon={<Clock className="text-yellow-600" size={20} />} label="Outstanding"
          value={formatCurrency(stats.outstandingBalance)} bg="bg-yellow-100" valueColor="text-yellow-600" />
        <StatCard icon={<AlertCircle className="text-red-600" size={20} />} label="Overdue"
          value={stats.overdue.toString()} subValue={`${stats.overdue} invoices`} bg="bg-red-100" valueColor="text-red-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search invoices..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | 'all')}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium min-w-[150px]">
          <option value="all">All Statuses</option>
          {Object.values(InvoiceStatus).map((status) => (
            <option key={status} value={status}>{getInvoiceStatusConfig(status).label}</option>
          ))}
        </select>
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium min-w-[150px]">
          <option value="all">All Clients</option>
          {clients.map((client) => (<option key={client.id} value={client.id}>{client.name}</option>))}
        </select>
        <select value={`${sortField}-${sortDirection}`}
          onChange={(e) => { const [field, dir] = e.target.value.split('-'); setSortField(field as any); setSortDirection(dir as any); }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium">
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="dueDate-asc">Due Date (Soon)</option>
          <option value="totalAmount-desc">Amount (High)</option>
        </select>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => {
                  const statusConfig = getInvoiceStatusConfig(invoice.status);
                  const overdue = isOverdue(invoice);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewInvoice(invoice)}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{invoice.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{getClientName(invoice.clientId)}</p>
                        {invoice.projectId && <p className="text-xs text-gray-500">{getProjectTitle(invoice.projectId)}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                        {invoice.amountPaid > 0 && invoice.amountPaid < invoice.totalAmount && (
                          <p className="text-xs text-green-600">{formatCurrency(invoice.amountPaid)} paid</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm ${overdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>{formatDate(invoice.dueDate)}</p>
                        {overdue && invoice.status !== InvoiceStatus.OVERDUE && <p className="text-xs text-red-500">Overdue</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => onViewInvoice(invoice)} className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                            <Eye size={16} className="text-gray-400" />
                          </button>
                          {invoice.status === InvoiceStatus.DRAFT && (
                            <button onClick={() => handleAction('send', invoice.id)} disabled={loading === invoice.id}
                              className="p-2 hover:bg-care-orange/10 rounded-lg disabled:opacity-50" title="Send">
                              <Send size={16} className="text-care-orange" />
                            </button>
                          )}
                          {invoice.squarePaymentUrl && (
                            <a href={invoice.squarePaymentUrl} target="_blank" rel="noopener noreferrer"
                              className="p-2 hover:bg-blue-50 rounded-lg" title="Payment Link">
                              <ExternalLink size={16} className="text-blue-500" />
                            </a>
                          )}
                          <div className="relative">
                            <button onClick={() => setActiveMenu(activeMenu === invoice.id ? null : invoice.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg">
                              <MoreVertical size={16} className="text-gray-400" />
                            </button>
                            {activeMenu === invoice.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border py-1 z-10 min-w-[140px]">
                                <button onClick={() => onViewInvoice(invoice)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                  <Eye size={14} /> View Details
                                </button>
                                {invoice.status !== InvoiceStatus.CANCELED && invoice.status !== InvoiceStatus.PAID && (
                                  <button onClick={() => handleAction('cancel', invoice.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600">
                                    <XCircle size={14} /> Cancel
                                  </button>
                                )}
                                {invoice.status === InvoiceStatus.DRAFT && (
                                  <button onClick={() => handleAction('delete', invoice.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600">
                                    <Trash2 size={14} /> Delete
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
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No invoices found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || filterStatus !== 'all' || filterClient !== 'all' ? 'Try adjusting your filters' : 'Create your first invoice'}
            </p>
          </div>
        )}
      </div>

      {filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>Showing {filteredInvoices.length} of {invoices.length} invoices</p>
          <p>Total: <span className="font-bold text-gray-900">{formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}</span></p>
        </div>
      )}

      {activeMenu && <div className="fixed inset-0 z-0" onClick={() => setActiveMenu(null)} />}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  bg: string;
  valueColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, bg, valueColor = 'text-gray-900' }) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-100">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-lg font-black ${valueColor}`}>{value}</p>
        {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
      </div>
    </div>
  </div>
);

export default InvoicesPage;