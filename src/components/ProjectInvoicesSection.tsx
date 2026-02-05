// src/components/ProjectInvoicesSection.tsx
// Section to display invoices for a specific project (embedded in ProjectDetails)

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { Invoice, InvoiceStatus, Project, User, UserRole } from '../types';
import { formatCurrency, getInvoiceStatusColor, subscribeToProjectInvoices } from '../services/invoices';

interface ProjectInvoicesSectionProps {
  project: Project;
  currentUser: User;
  onCreateInvoice: (projectId: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onViewAllInvoices: () => void;
}

const ProjectInvoicesSection: React.FC<ProjectInvoicesSectionProps> = ({
  project,
  currentUser,
  onCreateInvoice,
  onViewInvoice,
  onViewAllInvoices,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isClient = currentUser.role === UserRole.CLIENT;

  // Subscribe to project invoices
  useEffect(() => {
    const unsubscribe = subscribeToProjectInvoices(project.id, (data) => {
      // Filter out drafts for non-admins
      const filtered = isAdmin 
        ? data 
        : data.filter(inv => inv.status !== InvoiceStatus.DRAFT);
      setInvoices(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [project.id, isAdmin]);

  // Calculate stats
  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(inv => 
      inv.status !== InvoiceStatus.PAID && 
      inv.status !== InvoiceStatus.CANCELED &&
      inv.status !== InvoiceStatus.DRAFT
    ).length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    amountPaid: invoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
    amountDue: invoices.reduce((sum, inv) => {
      if (inv.status === InvoiceStatus.PAID || inv.status === InvoiceStatus.CANCELED) return sum;
      return sum + inv.amountDue;
    }, 0),
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if overdue
  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELED) {
      return false;
    }
    return new Date(invoice.dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-care-orange/10 flex items-center justify-center">
            <Receipt className="text-care-orange" size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#111827]">Invoices</h3>
            <p className="text-xs text-gray-500">{stats.total} invoice{stats.total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => onCreateInvoice(project.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-care-orange text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors"
          >
            <Plus size={14} />
            New Invoice
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {stats.total > 0 && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Invoiced</p>
            <p className="text-lg font-black text-[#111827]">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Paid</p>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(stats.amountPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Outstanding</p>
            <p className={`text-lg font-black ${stats.amountDue > 0 ? 'text-care-orange' : 'text-gray-400'}`}>
              {formatCurrency(stats.amountDue)}
            </p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="divide-y divide-gray-50">
        {invoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Receipt size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No invoices yet</p>
            {isAdmin && (
              <button
                onClick={() => onCreateInvoice(project.id)}
                className="mt-3 text-sm text-care-orange font-medium hover:underline"
              >
                Create first invoice
              </button>
            )}
          </div>
        ) : (
          <>
            {invoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onViewInvoice(invoice)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      invoice.status === InvoiceStatus.PAID
                        ? 'bg-emerald-100'
                        : isOverdue(invoice)
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}>
                      {invoice.status === InvoiceStatus.PAID ? (
                        <CheckCircle size={16} className="text-emerald-600" />
                      ) : isOverdue(invoice) ? (
                        <AlertTriangle size={16} className="text-red-500" />
                      ) : (
                        <Clock size={16} className="text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#111827]">{invoice.invoiceNumber}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getInvoiceStatusColor(invoice.status)}`}>
                          {invoice.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Due {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#111827]">{formatCurrency(invoice.totalAmount)}</p>
                      {invoice.status !== InvoiceStatus.PAID && invoice.amountPaid > 0 && (
                        <p className="text-[10px] text-emerald-600">{formatCurrency(invoice.amountPaid)} paid</p>
                      )}
                    </div>
                    
                    {/* Quick pay button for clients */}
                    {isClient && invoice.squarePaymentUrl && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && (
                      <a
                        href={invoice.squarePaymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-care-orange text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors"
                      >
                        Pay
                        <ExternalLink size={12} />
                      </a>
                    )}
                    
                    <Eye size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
            
            {/* View All Link */}
            {invoices.length > 5 && (
              <button
                onClick={onViewAllInvoices}
                className="w-full px-5 py-3 text-sm text-care-orange font-medium hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                View all {invoices.length} invoices
                <ChevronRight size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectInvoicesSection;
