import React, { useState } from 'react';
import {
  LayoutGrid,
  Columns3,
  List,
  Search,
  Filter,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  X,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Project, User, UserRole } from '../types';
import EnhancedProjectCard from './EnhancedProjectCard';
import ProjectKanban from './ProjectKanban';

type ViewMode = 'grid' | 'kanban' | 'list';
type SortOption = 'recent' | 'progress' | 'budget' | 'due-date' | 'name';
type FilterStatus = 'all' | 'planned' | 'in-progress' | 'on-hold' | 'completed';

interface ProjectsHubProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  onProjectClick: (project: Project) => void;
  onCreateProject: () => void;
}

const ProjectsHub: React.FC<ProjectsHubProps> = ({
  projects,
  users,
  currentUser,
  onProjectClick,
  onCreateProject,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort projects
  const filteredProjects = projects
    .filter(p => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesLocation = p.location?.toLowerCase().includes(query);
        const matchesDescription = p.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesLocation && !matchesDescription) return false;
      }
      
      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'planned' && p.status !== 'planned') return false;
        if (filterStatus === 'in-progress' && p.status !== 'in-progress') return false;
        if (filterStatus === 'on-hold' && p.status !== 'on-hold') return false;
        if (filterStatus === 'completed' && p.status !== 'completed') return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'budget':
          return (b.budget || 0) - (a.budget || 0);
        case 'due-date':
          return new Date(a.estimatedEndDate || 0).getTime() - new Date(b.estimatedEndDate || 0).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  // Get featured project (most recent in-progress with highest progress)
  const featuredProject = projects
    .filter(p => p.status === 'in-progress')
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];

  // Stats
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in-progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  const canCreateProject = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CONTRACTOR;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
            Project Management
          </p>
          <h1 className="text-2xl font-black text-gray-900">Projects Hub</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 mr-4">
            <div className="text-right">
              <p className="text-lg font-black text-care-orange">{stats.inProgress}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-right">
              <p className="text-lg font-black text-green-600">{stats.completed}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Done</p>
            </div>
          </div>

          {canCreateProject && (
            <button
              onClick={onCreateProject}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-care-orange transition-colors"
            >
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Featured Project (if exists and in grid view) */}
      {featuredProject && viewMode === 'grid' && (
        <div className="mb-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">
            Featured Project
          </p>
          <EnhancedProjectCard
            project={featuredProject}
            users={users}
            onClick={onProjectClick}
            variant="featured"
          />
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-care-orange focus:ring-0 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Columns3 size={14} />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={14} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Filter & Sort */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:border-care-orange focus:ring-0 cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="progress">Progress</option>
                <option value="budget">Budget</option>
                <option value="due-date">Due Date</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                showFilters || filterStatus !== 'all'
                  ? 'bg-care-orange text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Filter size={14} />
              Filter
              {filterStatus !== 'all' && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">1</span>
              )}
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2 mr-2">Status:</span>
              {(['all', 'planned', 'in-progress', 'on-hold', 'completed'] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    filterStatus === status
                      ? 'bg-care-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : 
                   status === 'planned' ? 'Planning' :
                   status === 'in-progress' ? 'In Progress' :
                   status === 'on-hold' ? 'On Hold' : 'Completed'}
                </button>
              ))}
              
              {filterStatus !== 'all' && (
                <button
                  onClick={() => setFilterStatus('all')}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      {searchQuery || filterStatus !== 'all' ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-bold text-gray-900">{filteredProjects.length}</span>
          <span>project{filteredProjects.length !== 1 ? 's' : ''} found</span>
          {searchQuery && <span className="text-gray-400">for "{searchQuery}"</span>}
        </div>
      ) : null}

      {/* Content */}
      {viewMode === 'kanban' ? (
        <ProjectKanban
          projects={filteredProjects}
          users={users}
          currentUser={currentUser}
          onProjectClick={onProjectClick}
          onCreateProject={onCreateProject}
        />
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No projects found</h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery ? 'Try adjusting your search or filters' : 'Create your first project to get started'}
              </p>
              {canCreateProject && (
                <button
                  onClick={onCreateProject}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-care-orange/90 transition-colors"
                >
                  <Plus size={16} />
                  Create Project
                </button>
              )}
            </div>
          ) : (
            filteredProjects.map((project) => (
              <EnhancedProjectCard
                key={project.id}
                project={project}
                users={users}
                onClick={onProjectClick}
                variant="compact"
              />
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No projects found</h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery ? 'Try adjusting your search or filters' : 'Create your first project to get started'}
              </p>
              {canCreateProject && (
                <button
                  onClick={onCreateProject}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-care-orange/90 transition-colors"
                >
                  <Plus size={16} />
                  Create Project
                </button>
              )}
            </div>
          ) : (
            filteredProjects.map((project) => (
              <EnhancedProjectCard
                key={project.id}
                project={project}
                users={users}
                onClick={onProjectClick}
                variant="default"
              />
            ))
          )}
        </div>
      )}

      {/* Bottom Stats Bar */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-2xl p-6 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Total Projects</p>
            <p className="text-3xl font-black">{stats.total}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">In Progress</p>
            <p className="text-3xl font-black text-care-orange">{stats.inProgress}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Completed</p>
            <p className="text-3xl font-black text-green-400">{stats.completed}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Total Budget</p>
            <p className="text-3xl font-black">${(stats.totalBudget / 1000).toFixed(0)}k</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsHub;