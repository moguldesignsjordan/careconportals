import React from 'react';
import { Project, User } from '../types';
import {
  MapPin,
  Hammer,
  Calendar,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';

interface DashboardContractorProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  onSelectProject: (p: Project) => void;
  onOpenCreateModal: () => void;
  onOpenMessages: () => void; // 👈 NEW
}

const DashboardContractor: React.FC<DashboardContractorProps> = ({
  projects,
  users,
  currentUser,
  onSelectProject,
  onOpenCreateModal,
  onOpenMessages,
}) => {
  const myProjects = projects.filter((p) => p.contractorId === currentUser.id);
  const activeProjects = myProjects.filter((p) => p.progress < 100);
  const completedProjects = myProjects.filter((p) => p.progress === 100);

  const nextDeadline = myProjects
    .filter((p) => p.estimatedEndDate)
    .sort(
      (a, b) =>
        new Date(a.estimatedEndDate).getTime() -
        new Date(b.estimatedEndDate).getTime(),
    )[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.25em]">
            Care Construction · Contractor
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-black text-gray-900">
            Welcome back, {currentUser.name || 'Contractor'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-xl">
            See the jobs assigned to you, update progress, and keep clients in
            the loop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-care-orange text-white text-xs font-bold shadow-sm hover:shadow-md hover:bg-care-orange/90 transition-all active:scale-95"
          >
            <Plus size={16} />
            New Project
          </button>
          <button
            onClick={onOpenMessages}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:border-care-orange hover:bg-care-orange/5 transition-all"
          >
            <MessageSquare size={16} className="text-care-orange" />
            Messages
          </button>
        </div>
      </header>

      {/* Stats row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Assigned Projects
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {myProjects.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Total jobs on your plate
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center text-care-orange">
            <Hammer size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Active
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {activeProjects.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FDEEE9] flex items-center justify-center text-care-orange">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Completed
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {completedProjects.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Wrap-ups and handoffs
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FDEEE9] flex items-center justify-center text-care-orange">
            <CheckCircle size={18} />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
              Your Projects
            </h2>
            {myProjects.length > 0 && (
              <span className="text-xs font-medium text-gray-500">
                Showing {Math.min(myProjects.length, 6)} of {myProjects.length}
              </span>
            )}
          </div>

          {myProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myProjects.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project)}
                  className="text-left"
                >
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-care-orange/40 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-black text-gray-900 truncate">
                        {project.title}
                      </h3>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        {project.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                      {project.description || 'No description provided yet.'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-care-orange" />
                        <span>
                          {project.estimatedEndDate
                            ? new Date(
                                project.estimatedEndDate,
                              ).toLocaleDateString()
                            : 'No end date'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={14} className="text-care-orange" />
                        <span>{project.progress}%</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FDEEE9] text-care-orange mb-4">
                <Hammer size={22} />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">
                No projects assigned
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Once an admin assigns you to a project, it will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Next deadline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
              Next Deadline
            </h2>
            {nextDeadline ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-gray-900 truncate">
                    {nextDeadline.title}
                  </p>
                  <span className="text-xs font-bold text-care-orange">
                    {new Date(nextDeadline.estimatedEndDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {nextDeadline.description ||
                    'Keep this job moving to stay on schedule.'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No upcoming deadlines. You&apos;re all caught up.
              </p>
            )}
          </div>

          {/* Tip card */}
          <div className="bg-[#FDEEE9] rounded-2xl p-6 border border-care-orange/30">
            <h2 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
              <MapPin size={16} className="text-care-orange" />
              Site Updates
            </h2>
            <p className="text-xs text-gray-700 mb-2">
              Use the project detail page to post daily updates and photos so
              clients can see progress.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardContractor;
