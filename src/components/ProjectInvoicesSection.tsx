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
import { Project, User, UserRole } from '../types';
import { Invoice, InvoiceStatus } from '../types/invoice';
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

  useEffect(() => {
    const unsubscribe = subscribeToProjectInvoices(project.id, (data: Invoice[]) => {
      const filtered = isAdmin
        ? data
        : data.filter((inv) => inv.status !== InvoiceStatus.DRAFT);
      setInvoices(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [project.id, isAdmin]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELED) return false;
    return new Date(invoice.dueDate) < new Date();
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidAmount = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const unpaidCount = invoices.filter(
    (inv) => inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELED && inv.status !== InvoiceStatus.DRAFT
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-care-orange/10 flex items-center justify-center">
            <Receipt size={18} className="text-care-orange" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Invoices</h3>
            <p className="text-[10px] text-gray-500">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} • {formatCurrency(totalAmount)} total
            </p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => onCreateInvoice(project.id)}
            className="flex items-center gap-1.5 px-3 py-2 bg-care-orange text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors">
            <Plus size={14} /> New Invoice
          </button>
        )}
      </div>

      <div>
        {loading ? (
          <div className="px-5 py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-care-orange mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Receipt className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-sm text-gray-500">No invoices yet</p>
            {isAdmin && (
              <button onClick={() => onCreateInvoice(project.id)}
                className="mt-3 text-xs text-care-orange font-bold hover:underline">
                Create first invoice →
              </button>
            )}
          </div>
        ) : (
          <>
            {unpaidCount > 0 && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">
                    {unpaidCount} unpaid invoice{unpaidCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-xs font-bold text-amber-700">
                  {formatCurrency(totalAmount - paidAmount)} outstanding
                </span>
              </div>
            )}

            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} onClick={() => onViewInvoice(invoice)}
                className="px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      invoice.status === InvoiceStatus.PAID ? 'bg-emerald-100'
                        : isOverdue(invoice) ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {invoice.status === InvoiceStatus.PAID ? <CheckCircle size={16} className="text-emerald-600" />
                        : isOverdue(invoice) ? <AlertTriangle size={16} className="text-red-500" />
                        : <Clock size={16} className="text-gray-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#111827]">{invoice.invoiceNumber}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getInvoiceStatusColor(invoice.status)}`}>
                          {invoice.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Due {formatDate(invoice.dueDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#111827]">{formatCurrency(invoice.totalAmount)}</p>
                      {invoice.status !== InvoiceStatus.PAID && invoice.amountPaid > 0 && (
                        <p className="text-[10px] text-emerald-600">{formatCurrency(invoice.amountPaid)} paid</p>
                      )}
                    </div>
                    {isClient && invoice.squarePaymentUrl && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED && (
                      <a href={invoice.squarePaymentUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-care-orange text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors">
                        Pay <ExternalLink size={12} />
                      </a>
                    )}
                    <Eye size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            ))}

            {invoices.length > 5 && (
              <button onClick={onViewAllInvoices}
                className="w-full px-5 py-3 text-sm text-care-orange font-medium hover:bg-gray-50 flex items-center justify-center gap-1">
                View all {invoices.length} invoices <ChevronRight size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectInvoicesSection;