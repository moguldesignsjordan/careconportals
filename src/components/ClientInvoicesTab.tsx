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
import { Invoice, InvoiceStatus, Project } from '../types';
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

  // Calculate stats
  const stats = useMemo(() => getInvoiceStats(invoices), [invoices]);
  
  // Total owed
  const totalOwed = useMemo(() => {
    return invoices
      .filter(inv => 
        inv.status !== InvoiceStatus.PAID && 
        inv.status !== InvoiceStatus.CANCELED &&
        inv.status !== InvoiceStatus.DRAFT
      )
      .reduce((sum, inv) => sum + inv.amountDue, 0);
  }, [invoices]);

  // Get project title
  const getProjectTitle = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.title || null;
  };

  // Filter invoices (exclude drafts from client view)
  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(inv => inv.status !== InvoiceStatus.DRAFT);

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.title.toLowerCase().includes(query) ||
        (inv.projectTitle && inv.projectTitle.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter === 'UNPAID') {
      result = result.filter(inv => 
        inv.status !== InvoiceStatus.PAID && 
        inv.status !== InvoiceStatus.CANCELED
      );
    } else if (statusFilter === 'PAID') {
      result = result.filter(inv => inv.status === InvoiceStatus.PAID);
    }

    // Sort by date, most recent first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [invoices, searchQuery, statusFilter]);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check if overdue
  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELED) {
      return false;
    }
    return new Date(invoice.dueDate) < new Date();
  };

  // Get urgency indicator
  const getUrgencyBadge = (invoice: Invoice) => {
    if (invoice.status === InvoiceStatus.PAID) return null;
    if (invoice.status === InvoiceStatus.CANCELED) return null;
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
          <AlertTriangle size={10} />
          Overdue
        </span>
      );
    } else if (daysUntilDue <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
          <Clock size={10} />
          Due Soon
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#111827] flex items-center gap-2">
            <Receipt className="text-care-orange" size={24} />
            My Invoices
          </h2>
          <p className="text-sm text-gray-500 mt-1">View and pay your invoices</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outstanding Balance */}
        <div className={`rounded-2xl p-5 ${totalOwed > 0 ? 'bg-gradient-to-br from-care-orange/10 to-orange-50 border border-care-orange/20' : 'bg-gray-50 border border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className={totalOwed > 0 ? 'text-care-orange' : 'text-gray-400'} />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Outstanding Balance
            </span>
          </div>
          <p className={`text-3xl font-black ${totalOwed > 0 ? 'text-care-orange' : 'text-gray-400'}`}>
            {formatCurrency(totalOwed)}
          </p>
          {totalOwed > 0 && stats.overdue > 0 && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              {stats.overdue} overdue invoice{stats.overdue > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Paid This Year */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Paid
            </span>
          </div>
          <p className="text-3xl font-black text-emerald-700">
            {formatCurrency(stats.totalRevenue)}
          </p>
          <p className="text-xs text-emerald-600 mt-2">
            {stats.paid} invoice{stats.paid !== 1 ? 's' : ''} paid
          </p>
        </div>

        {/* Quick Pay */}
        {totalOwed > 0 && filteredInvoices.some(inv => inv.squarePaymentUrl && inv.status !== InvoiceStatus.PAID) && (
          <div className="bg-gradient-to-br from-[#1A1A1A] to-gray-800 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                Quick Pay
              </span>
            </div>
            <p className="text-sm text-white/80 mb-3">
              Pay your outstanding invoices securely online
            </p>
            {filteredInvoices
              .filter(inv => inv.squarePaymentUrl && inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELED)
              .slice(0, 1)
              .map(inv => (
                <a
                  key={inv.id}
                  href={inv.squarePaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#1A1A1A] rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                >
                  <CreditCard size={16} />
                  Pay Now
                  <ArrowRight size={14} />
                </a>
              ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-2 focus:ring-care-orange/10"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === 'ALL' 
                ? 'bg-[#1A1A1A] text-white' 
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('UNPAID')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === 'UNPAID' 
                ? 'bg-care-orange text-white' 
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Unpaid
          </button>
          <button
            onClick={() => setStatusFilter('PAID')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === 'PAID' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Paid
          </button>
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <Receipt size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-gray-700">No invoices found</p>
            <p className="text-sm text-gray-500 mt-1">
              {statusFilter !== 'ALL' 
                ? `No ${statusFilter.toLowerCase()} invoices match your search`
                : 'Invoices will appear here when created'}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-md ${
                isOverdue(invoice) ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Invoice Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-[#111827]">{invoice.invoiceNumber}</span>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getInvoiceStatusColor(invoice.status)}`}>
                      {invoice.status.replace('_', ' ')}
                    </span>
                    {getUrgencyBadge(invoice)}
                  </div>
                  
                  <p className="text-sm text-gray-700 mt-1 font-medium">{invoice.title}</p>
                  
                  {invoice.projectTitle && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <FileText size={12} />
                      {invoice.projectTitle}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Issued: {formatDate(invoice.issueDate || invoice.createdAt)}
                    </span>
                    <span className={`flex items-center gap-1 ${isOverdue(invoice) ? 'text-red-600 font-medium' : ''}`}>
                      <Clock size={12} />
                      Due: {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-black text-[#111827]">
                      {formatCurrency(invoice.totalAmount)}
                    </p>
                    {invoice.status === InvoiceStatus.PARTIALLY_PAID && (
                      <p className="text-xs text-emerald-600">
                        {formatCurrency(invoice.amountPaid)} paid
                      </p>
                    )}
                    {invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && invoice.amountDue > 0 && (
                      <p className="text-xs text-gray-500">
                        {formatCurrency(invoice.amountDue)} due
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewInvoice(invoice)}
                      className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                      title="View Details"
                    >
                      <Eye size={18} className="text-gray-500" />
                    </button>
                    
                    {invoice.squarePaymentUrl && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && (
                      <a
                        href={invoice.squarePaymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-care-orange/20"
                      >
                        <CreditCard size={16} />
                        Pay Now
                        <ExternalLink size={14} />
                      </a>
                    )}
                    
                    {invoice.status === InvoiceStatus.PAID && (
                      <span className="flex items-center gap-1 px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold">
                        <CheckCircle size={16} />
                        Paid
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Line items preview */}
              {invoice.lineItems && invoice.lineItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500 space-y-1">
                    {invoice.lineItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.description}</span>
                        <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                    {invoice.lineItems.length > 3 && (
                      <p className="text-gray-400 italic">
                        +{invoice.lineItems.length - 3} more item{invoice.lineItems.length - 3 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientInvoicesTab;
