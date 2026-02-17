import React, { useState, useMemo } from 'react';
import { Project, User, UserRole } from '../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calculator,
  BarChart3,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Edit3,
  X,
  Save,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

// ── Types ──

export type BudgetCategory =
  | 'Materials'
  | 'Labor'
  | 'Permits'
  | 'Equipment'
  | 'Subcontractor'
  | 'Overhead'
  | 'Contingency'
  | 'Other';

export interface BudgetLineItem {
  id: string;
  projectId: string;
  category: BudgetCategory;
  description: string;
  estimatedCost: number;
  actualCost: number;
  date: string;
  notes?: string;
}

interface BudgetCalculatorProps {
  projects: Project[];
  users: User[];
  currentUser: User;
}

// ── Constants ──

const CATEGORIES: BudgetCategory[] = [
  'Materials',
  'Labor',
  'Permits',
  'Equipment',
  'Subcontractor',
  'Overhead',
  'Contingency',
  'Other',
];

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  Materials: '#F15A2B',
  Labor: '#3B82F6',
  Permits: '#8B5CF6',
  Equipment: '#10B981',
  Subcontractor: '#F59E0B',
  Overhead: '#6366F1',
  Contingency: '#EC4899',
  Other: '#6B7280',
};

const CATEGORY_BG: Record<BudgetCategory, string> = {
  Materials: 'bg-[#F15A2B]/10 text-[#F15A2B]',
  Labor: 'bg-blue-50 text-blue-600',
  Permits: 'bg-violet-50 text-violet-600',
  Equipment: 'bg-emerald-50 text-emerald-600',
  Subcontractor: 'bg-amber-50 text-amber-600',
  Overhead: 'bg-indigo-50 text-indigo-600',
  Contingency: 'bg-pink-50 text-pink-600',
  Other: 'bg-gray-100 text-gray-600',
};

// ── Helper: generate unique ID ──
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Helper: currency formatter ──
const fmt = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

// ── Custom Tooltip ──
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-bold text-gray-900 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs text-gray-600">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
};

// ── Main Component ──

const BudgetCalculator: React.FC<BudgetCalculatorProps> = ({
  projects,
  users,
  currentUser,
}) => {
  // ── State ──
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<BudgetCategory | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    category: 'Materials' as BudgetCategory,
    description: '',
    estimatedCost: '',
    actualCost: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // ── Derived Data ──
  const filteredItems = useMemo(() => {
    let items = lineItems;
    if (selectedProjectId !== 'all') {
      items = items.filter((i) => i.projectId === selectedProjectId);
    }
    if (categoryFilter !== 'all') {
      items = items.filter((i) => i.category === categoryFilter);
    }
    return items;
  }, [lineItems, selectedProjectId, categoryFilter]);

  const activeProjects = projects.filter(
    (p) => String(p.status) !== 'Completed' && String(p.status) !== 'On Hold'
  );

  // ── Summary Stats ──
  const stats = useMemo(() => {
    const relevantProjects =
      selectedProjectId === 'all'
        ? projects
        : projects.filter((p) => p.id === selectedProjectId);

    const totalBudget = relevantProjects.reduce((s, p) => s + (p.budget || 0), 0);
    const totalSpent = relevantProjects.reduce((s, p) => s + (p.spent || 0), 0);
    const totalEstimated = filteredItems.reduce((s, i) => s + i.estimatedCost, 0);
    const totalActual = filteredItems.reduce((s, i) => s + i.actualCost, 0);
    const variance = totalEstimated - totalActual;
    const utilizationPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return { totalBudget, totalSpent, totalEstimated, totalActual, variance, utilizationPct };
  }, [projects, filteredItems, selectedProjectId]);

  // ── Chart Data ──

  // Budget vs Spent per project (bar chart)
  const barChartData = useMemo(() => {
    const relevantProjects =
      selectedProjectId === 'all'
        ? projects.slice(0, 8)
        : projects.filter((p) => p.id === selectedProjectId);

    return relevantProjects.map((p) => ({
      name: p.title.length > 18 ? p.title.slice(0, 18) + '…' : p.title,
      Budget: p.budget || 0,
      Spent: p.spent || 0,
      Remaining: Math.max(0, (p.budget || 0) - (p.spent || 0)),
    }));
  }, [projects, selectedProjectId]);

  // Category breakdown (pie chart)
  const pieChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    filteredItems.forEach((item) => {
      categoryTotals[item.category] =
        (categoryTotals[item.category] || 0) + item.actualCost;
    });

    // If no line items, use project-level data for demo
    if (Object.keys(categoryTotals).length === 0) {
      const relevantProjects =
        selectedProjectId === 'all' ? projects : projects.filter((p) => p.id === selectedProjectId);
      const totalSpent = relevantProjects.reduce((s, p) => s + (p.spent || 0), 0);
      if (totalSpent > 0) {
        return [
          { name: 'Materials', value: Math.round(totalSpent * 0.35) },
          { name: 'Labor', value: Math.round(totalSpent * 0.30) },
          { name: 'Permits', value: Math.round(totalSpent * 0.05) },
          { name: 'Equipment', value: Math.round(totalSpent * 0.12) },
          { name: 'Subcontractor', value: Math.round(totalSpent * 0.10) },
          { name: 'Overhead', value: Math.round(totalSpent * 0.05) },
          { name: 'Contingency', value: Math.round(totalSpent * 0.03) },
        ];
      }
    }

    return Object.entries(categoryTotals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredItems, projects, selectedProjectId]);

  // Budget utilization per project (area chart)
  const utilizationData = useMemo(() => {
    const relevantProjects =
      selectedProjectId === 'all'
        ? projects.slice(0, 10)
        : projects.filter((p) => p.id === selectedProjectId);

    return relevantProjects.map((p) => {
      const budget = p.budget || 0;
      const spent = p.spent || 0;
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      return {
        name: p.title.length > 15 ? p.title.slice(0, 15) + '…' : p.title,
        'Utilization %': pct,
        Budget: budget,
        Spent: spent,
      };
    });
  }, [projects, selectedProjectId]);

  // ── Handlers ──

  const resetForm = () => {
    setFormData({
      projectId: selectedProjectId !== 'all' ? selectedProjectId : '',
      category: 'Materials',
      description: '',
      estimatedCost: '',
      actualCost: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleAddItem = () => {
    if (!formData.projectId || !formData.description || !formData.estimatedCost) return;

    const newItem: BudgetLineItem = {
      id: uid(),
      projectId: formData.projectId,
      category: formData.category,
      description: formData.description,
      estimatedCost: parseFloat(formData.estimatedCost) || 0,
      actualCost: parseFloat(formData.actualCost) || 0,
      date: formData.date,
      notes: formData.notes,
    };

    setLineItems((prev) => [...prev, newItem]);
    resetForm();
    setShowAddForm(false);
  };

  const handleUpdateItem = () => {
    if (!editingId) return;

    setLineItems((prev) =>
      prev.map((item) =>
        item.id === editingId
          ? {
              ...item,
              projectId: formData.projectId || item.projectId,
              category: formData.category,
              description: formData.description || item.description,
              estimatedCost: parseFloat(formData.estimatedCost) || item.estimatedCost,
              actualCost: parseFloat(formData.actualCost) || item.actualCost,
              date: formData.date || item.date,
              notes: formData.notes,
            }
          : item
      )
    );
    setEditingId(null);
    resetForm();
  };

  const handleEditItem = (item: BudgetLineItem) => {
    setFormData({
      projectId: item.projectId,
      category: item.category,
      description: item.description,
      estimatedCost: String(item.estimatedCost),
      actualCost: String(item.actualCost),
      date: item.date,
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDeleteItem = (id: string) => {
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  const getProjectTitle = (id: string) =>
    projects.find((p) => p.id === id)?.title || 'Unknown Project';

  // ── Group items by project ──
  const groupedByProject = useMemo(() => {
    const groups: Record<string, BudgetLineItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.projectId]) groups[item.projectId] = [];
      groups[item.projectId].push(item);
    });
    return groups;
  }, [filteredItems]);

  // ── Render ──

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
              <Calculator size={20} className="text-care-orange" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Budget Calculator</h1>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Track expenses, compare estimates vs actuals, and monitor project budgets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Project filter */}
          <div className="relative">
            <Briefcase
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 appearance-none cursor-pointer hover:border-care-orange/40 focus:border-care-orange focus:outline-none focus:ring-0 transition-colors"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Add expense button */}
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowAddForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-care-orange px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 transition-colors"
          >
            <Plus size={14} />
            Add Expense
          </button>
        </div>
      </header>

      {/* ── Summary Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-care-orange/10 flex items-center justify-center shrink-0">
            <DollarSign size={20} className="text-care-orange" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
              Total Budget
            </p>
            <p className="text-xl font-black text-gray-900">{fmt(stats.totalBudget)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
              Total Spent
            </p>
            <p className="text-xl font-black text-gray-900">{fmt(stats.totalSpent)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {stats.utilizationPct.toFixed(1)}% utilized
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <BarChart3 size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
              Remaining
            </p>
            <p className="text-xl font-black text-emerald-600">
              {fmt(Math.max(0, stats.totalBudget - stats.totalSpent))}
            </p>
          </div>
        </div>

        <div
          className={`border rounded-2xl p-5 flex items-center gap-4 ${
            stats.variance < 0
              ? 'bg-red-50/50 border-red-200'
              : 'bg-white border-gray-100'
          }`}
        >
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
              stats.variance < 0 ? 'bg-red-100' : 'bg-amber-50'
            }`}
          >
            {stats.variance < 0 ? (
              <AlertTriangle size={20} className="text-red-500" />
            ) : (
              <CheckCircle size={20} className="text-amber-500" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
              Variance
            </p>
            <p
              className={`text-xl font-black ${
                stats.variance < 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {stats.variance < 0 ? '-' : '+'}
              {fmt(Math.abs(stats.variance))}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {stats.variance >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Charts Grid ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget vs Spent Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-gray-900">Budget vs Spent</h3>
              <p className="text-xs text-gray-400 mt-0.5">Per-project financial comparison</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-care-orange" />
                Budget
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                Spent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                Remaining
              </span>
            </div>
          </div>

          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Budget" fill="#F15A2B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Remaining" fill="#34D399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
              No project data to display
            </div>
          )}
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-sm font-black text-gray-900">Spending by Category</h3>
            <p className="text-xs text-gray-400 mt-0.5">Expense distribution breakdown</p>
          </div>

          {pieChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          CATEGORY_COLORS[entry.name as BudgetCategory] || '#6B7280'
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-3 space-y-1.5">
                {pieChartData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-gray-600">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[entry.name as BudgetCategory] || '#6B7280',
                        }}
                      />
                      {entry.name}
                    </span>
                    <span className="font-semibold text-gray-900">{fmt(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
              Add expenses to see breakdown
            </div>
          )}
        </div>
      </section>

      {/* ── Budget Utilization Area Chart ── */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-black text-gray-900">Budget Utilization</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Percentage of budget consumed per project
            </p>
          </div>
        </div>

        {utilizationData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={utilizationData}>
              <defs>
                <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F15A2B" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F15A2B" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="Utilization %"
                stroke="#F15A2B"
                strokeWidth={2.5}
                fill="url(#utilGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
            No utilization data available
          </div>
        )}
      </section>

      {/* ── Add / Edit Expense Modal ── */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
                  <DollarSign className="text-care-orange" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    {editingId ? 'Edit Expense' : 'Add Expense'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {editingId
                      ? 'Update this budget line item'
                      : 'Add a new expense to a project budget'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Project selector */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Project *
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, projectId: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:bg-white focus:border-care-orange focus:outline-none transition-colors"
                >
                  <option value="">Select a project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category + Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        category: e.target.value as BudgetCategory,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:bg-white focus:border-care-orange focus:outline-none transition-colors"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:bg-white focus:border-care-orange focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lumber delivery, plumbing fixtures…"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-care-orange focus:outline-none transition-colors"
                />
              </div>

              {/* Cost inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Estimated Cost *
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.estimatedCost}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          estimatedCost: e.target.value,
                        }))
                      }
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-care-orange focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Actual Cost
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.actualCost}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          actualCost: e.target.value,
                        }))
                      }
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-care-orange focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes…"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-care-orange focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingId ? handleUpdateItem : handleAddItem}
                disabled={!formData.projectId || !formData.description || !formData.estimatedCost}
                className="inline-flex items-center gap-2 rounded-full bg-care-orange px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={14} />
                {editingId ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Expenses Table ── */}
      <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-gray-900">Expense Ledger</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} ·{' '}
              {fmt(filteredItems.reduce((s, i) => s + i.actualCost, 0))} actual
            </p>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-1 py-1 text-[10px] font-semibold">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              {CATEGORIES.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    categoryFilter === cat
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <DollarSign size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No expenses yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Add Expense" to start tracking project costs
            </p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedByProject).map(([projectId, items]) => (
              <div key={projectId} className="border-b border-gray-50 last:border-0">
                {/* Project Group Header */}
                <button
                  onClick={() =>
                    setExpandedProject(expandedProject === projectId ? null : projectId)
                  }
                  className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase size={14} className="text-care-orange" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-[0.12em]">
                      {getProjectTitle(projectId)}
                    </span>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-gray-500">
                      Est: {fmt(items.reduce((s, i) => s + i.estimatedCost, 0))}
                    </span>
                    <span className="text-xs font-bold text-gray-900">
                      Act: {fmt(items.reduce((s, i) => s + i.actualCost, 0))}
                    </span>
                    {expandedProject === projectId ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Items */}
                {expandedProject === projectId && (
                  <div className="divide-y divide-gray-50">
                    {items.map((item) => {
                      const overBudget = item.actualCost > item.estimatedCost;
                      return (
                        <div
                          key={item.id}
                          className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/30 transition-colors group"
                        >
                          {/* Category badge */}
                          <span
                            className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              CATEGORY_BG[item.category]
                            }`}
                          >
                            {item.category}
                          </span>

                          {/* Description */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {item.description}
                            </p>
                            {item.notes && (
                              <p className="text-[11px] text-gray-400 truncate">
                                {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Date */}
                          <span className="hidden md:block text-[11px] text-gray-400 shrink-0">
                            {new Date(item.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>

                          {/* Estimated */}
                          <div className="text-right shrink-0 w-24">
                            <p className="text-[10px] text-gray-400">Est.</p>
                            <p className="text-xs font-semibold text-gray-600">
                              {fmt(item.estimatedCost)}
                            </p>
                          </div>

                          {/* Actual */}
                          <div className="text-right shrink-0 w-24">
                            <p className="text-[10px] text-gray-400">Actual</p>
                            <p
                              className={`text-xs font-bold ${
                                overBudget ? 'text-red-600' : 'text-gray-900'
                              }`}
                            >
                              {fmt(item.actualCost)}
                              {overBudget && (
                                <TrendingDown
                                  size={10}
                                  className="inline ml-1 text-red-400"
                                />
                              )}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Per-Project Budget Health ── */}
      <section>
        <h3 className="text-sm font-black text-gray-900 mb-4">Project Budget Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(selectedProjectId === 'all' ? projects : projects.filter((p) => p.id === selectedProjectId)).map(
            (project) => {
              const budget = project.budget || 0;
              const spent = project.spent || 0;
              const pct = budget > 0 ? (spent / budget) * 100 : 0;
              const isOver = pct > 100;
              const isWarning = pct > 80 && pct <= 100;

              return (
                <div
                  key={project.id}
                  className={`border rounded-2xl p-5 transition-colors ${
                    isOver
                      ? 'bg-red-50/50 border-red-200'
                      : isWarning
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                        {project.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] mt-0.5">
                        {String(project.status)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isOver
                          ? 'bg-red-100 text-red-700'
                          : isWarning
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver
                          ? 'bg-red-500'
                          : isWarning
                          ? 'bg-amber-400'
                          : 'bg-care-orange'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Spent: <span className="font-semibold text-gray-800">{fmt(spent)}</span>
                    </span>
                    <span className="text-gray-500">
                      Budget: <span className="font-semibold text-gray-800">{fmt(budget)}</span>
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
};

export default BudgetCalculator;