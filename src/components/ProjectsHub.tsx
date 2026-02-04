import React, { useMemo, useState } from 'react';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Plus,
} from 'lucide-react';
import {
  Project,
  User,
  UserRole,
  Document as ProjectDocument,
} from '../types';
import ProjectCard from './ProjectCard';

interface ProjectsHubProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  onProjectClick: (project: Project) => void;
  onCreateProject: () => void;
  // Pass App-level documents if you want real counts on the cards
  documents?: ProjectDocument[];
}

const ProjectsHub: React.FC<ProjectsHubProps> = ({
  projects,
  users,
  currentUser,
  onProjectClick,
  onCreateProject,
  documents = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'completed' | 'on-hold'
  >('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const isAdmin = currentUser.role === UserRole.ADMIN;

  // Map projectId -> document count
  const documentsByProject = useMemo(() => {
    const map: Record<string, number> = {};
    documents.forEach((doc) => {
      if (!doc.projectId) return;
      map[doc.projectId] = (map[doc.projectId] || 0) + 1;
    });
    return map;
  }, [documents]);

  // Stats
  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) =>
      String(p.status).toLowerCase().includes('completed')
    ).length;
    const onHold = projects.filter((p) =>
      String(p.status).toLowerCase().includes('hold')
    ).length;
    const active = total - completed - onHold;
    const totalBudget = projects.reduce(
      (sum, p) => sum + (p.budget || 0),
      0
    );

    return { total, active, completed, onHold, totalBudget };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return projects
      .filter((p) => {
        if (query) {
          const inTitle = p.title.toLowerCase().includes(query);
          const inLocation = p.location
            ?.toLowerCase()
            .includes(query);
          const inDescription = p.description
            ?.toLowerCase()
            .includes(query);
          if (!inTitle && !inLocation && !inDescription) {
            return false;
          }
        }

        const statusStr = String(p.status).toLowerCase();
        if (statusFilter === 'active') {
          return (
            !statusStr.includes('completed') &&
            !statusStr.includes('hold')
          );
        }
        if (statusFilter === 'completed') {
          return statusStr.includes('completed');
        }
        if (statusFilter === 'on-hold') {
          return statusStr.includes('hold');
        }
        return true;
      })
      .sort((a, b) => {
        const aDate = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;
        const bDate = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0;
        if (aDate !== bDate) return bDate - aDate;
        return a.title.localeCompare(b.title);
      });
  }, [projects, searchQuery, statusFilter]);

  const getClientName = (project: Project) => {
    const primaryClient = users.find(
      (u) => u.id === project.clientId
    );
    return primaryClient?.name || 'Client';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
            Project Management
          </p>
          <h1 className="text-2xl font-black text-gray-900">
            Projects Hub
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Unified view of projects, milestones, budgets, and
            documents. Click a card to open the full detail and
            timeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-4 mr-2">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">
                Active
              </p>
              <p className="text-lg font-black text-gray-900">
                {stats.active}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">
                Completed
              </p>
              <p className="text-lg font-black text-emerald-600">
                {stats.completed}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">
                Budget
              </p>
              <p className="text-lg font-black text-gray-900">
                $
                {Math.round(
                  stats.totalBudget / 1000
                ).toLocaleString()}
                k
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={onCreateProject}
              className="inline-flex items-center gap-2 rounded-full bg-care-orange px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 transition-colors"
            >
              <Plus size={14} />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, address, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-care-orange focus:outline-none focus:ring-0 transition-colors"
          />
        </div>

        {/* Filters + view toggle */}
        <div className="flex items-center justify-between md:justify-end gap-2">
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-1 py-1 text-[11px] font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Filter size={12} />
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                statusFilter === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                statusFilter === 'completed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Done
            </button>
            <button
              onClick={() => setStatusFilter('on-hold')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                statusFilter === 'on-hold'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              On hold
            </button>
          </div>

          <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-1 py-1 text-[11px] font-semibold">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LayoutGrid size={12} />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <List size={12} />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-500">
          No projects match this filter.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project)}
              documentCount={documentsByProject[project.id] || 0}
              clientName={getClientName(project)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => onProjectClick(project)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {project.title}
                </p>
                <p className="text-[11px] text-gray-500">
                  {getClientName(project)} ·{' '}
                  {project.location || 'No address'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span>{project.progress ?? 0}%</span>
                <span>{documentsByProject[project.id] || 0} docs</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsHub;
