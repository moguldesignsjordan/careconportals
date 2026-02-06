// src/components/ClientInvoicesTab.tsx
// Client-facing invoice view with payment links

import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Eye,
  Download,
  Filter,
  CreditCard,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Project } from '../types';
import { Invoice, InvoiceStatus } from '../types/invoice';
import { formatCurrency, getInvoiceStatusColor, getInvoiceStats } from '../services/invoices';

interface ClientInvoicesTabProps {
  invoices: Invoice[];
  projects: Project[];
  onViewInvoice: (invoice: Invoice) => void;
}

const ClientInvoicesTab: React.FC<ClientInvoicesTabProps> = ({
  invoices,
  projects,
  onViewInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

  const stats = useMemo(() => getInvoiceStats(invoices), [invoices]);

  const totalOwed = useMemo(() => {
    return invoices
      .filter(inv =>
        inv.status !== InvoiceStatus.PAID &&
        inv.status !== InvoiceStatus.CANCELED &&
        inv.status !== InvoiceStatus.DRAFT
      )
      .reduce((sum, inv) => sum + inv.amountDue, 0);
  }, [invoices]);

  const getProjectTitle = (projectId?: string) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.title || null;
  };

  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(inv => inv.status !== InvoiceStatus.DRAFT);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.title.toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'UNPAID') {
      result = result.filter(inv => inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELED);
    } else if (statusFilter === 'PAID') {
      result = result.filter(inv => inv.status === InvoiceStatus.PAID);
    }
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [invoices, searchQuery, statusFilter]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELED) return false;
    return new Date(invoice.dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
              <DollarSign size={20} className="text-care-orange" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Due</p>
          </div>
          <p className="text-2xl font-black text-gray-900">{formatCurrency(totalOwed)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.sent + stats.overdue}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid</p>
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.paid}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-care-orange focus:ring-0" />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['ALL', 'UNPAID', 'PAID'] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-12 text-center">
            <Receipt className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No invoices found</p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const overdue = isOverdue(invoice);
            const projectTitle = getProjectTitle(invoice.projectId);
            return (
              <div key={invoice.id} onClick={() => onViewInvoice(invoice)}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      invoice.status === InvoiceStatus.PAID ? 'bg-green-100' : overdue ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {invoice.status === InvoiceStatus.PAID ? <CheckCircle size={20} className="text-green-600" />
                        : overdue ? <AlertTriangle size={20} className="text-red-500" />
                        : <FileText size={20} className="text-gray-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{invoice.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getInvoiceStatusColor(invoice.status)}`}>
                          {invoice.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">{invoice.invoiceNumber}</span>
                        {projectTitle && <span className="text-xs text-gray-400">• {projectTitle}</span>}
                        <span className={`text-xs ${overdue ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                          Due {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-black text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                      {invoice.amountPaid > 0 && invoice.status !== InvoiceStatus.PAID && (
                        <p className="text-[10px] text-green-600 font-bold">{formatCurrency(invoice.amountPaid)} paid</p>
                      )}
                    </div>
                    {invoice.squarePaymentUrl && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && (
                      <a href={invoice.squarePaymentUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-md shadow-care-orange/20">
                        <CreditCard size={14} /> Pay Now
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ClientInvoicesTab;