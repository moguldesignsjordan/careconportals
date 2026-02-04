import React, { useMemo, useState } from 'react';
import { User, UserRole } from '../types';
import { deleteUser } from '../services/db';
import {
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  UserPlus,
  HardHat,
  Trash2,
} from 'lucide-react';

interface UsersDirectoryProps {
  users: User[];
  currentUser: User;
  onOpenCreateClientModal: () => void;
  onOpenCreateContractorModal: () => void;
  onMessageUser: (user: User) => void;
}

type RoleFilter = 'all' | 'client' | 'contractor';

const UsersDirectory: React.FC<UsersDirectoryProps> = ({
  users,
  currentUser,
  onOpenCreateClientModal,
  onOpenCreateContractorModal,
  onMessageUser,
}) => {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch]         = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.id === currentUser.id) return false;
      if (roleFilter === 'client'     && user.role !== UserRole.CLIENT)     return false;
      if (roleFilter === 'contractor' && user.role !== UserRole.CONTRACTOR) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.company && user.company.toLowerCase().includes(q))
      );
    });
  }, [users, currentUser.id, roleFilter, search]);

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
    } catch (e) {
      console.error('Delete user failed', e);
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-care-orange/10">
            <Users size={20} className="text-care-orange" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
              People directory
            </p>
            <h1 className="mt-1 text-xl font-black text-[#1A1A1A]">
              Clients & contractors
            </h1>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onOpenCreateClientModal}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#1A1A1A] shadow-sm transition-all hover:border-care-orange/40 hover:shadow-md"
            >
              <UserPlus size={14} />
              Add client
            </button>
            <button
              onClick={onOpenCreateContractorModal}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#1A1A1A] shadow-sm transition-all hover:border-care-orange/40 hover:shadow-md"
            >
              <HardHat size={14} />
              Add contractor
            </button>
          </div>
        )}
      </header>

      {/* ── Filters ── */}
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, company, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full border-0 bg-transparent text-sm text-[#1A1A1A] outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="flex gap-2">
          {[
            { id: 'all',        label: 'All' },
            { id: 'client',    label: 'Clients' },
            { id: 'contractor', label: 'Contractors' },
          ].map((filter) => {
            const active = roleFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setRoleFilter(filter.id as RoleFilter)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold transition-all',
                  active ? 'bg-care-orange text-white' : 'bg-[#FDEEE9]/50 text-gray-600 hover:bg-[#FDEEE9]',
                ].join(' ')}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Directory list ── */}
      <section>
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-gray-500">No users match your filters yet.</p>
            <p className="mt-1 text-xs text-gray-400">Adjust filters or add a new client/contractor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => {
              const isConfirming = confirmDeleteId === user.id;

              return (
                <div
                  key={user.id}
                  className="relative flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm group"
                >
                  {/* ── delete confirm overlay ── */}
                  {isConfirming && (
                    <div className="absolute inset-0 z-10 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-5 text-center">
                      <Trash2 size={24} className="text-red-500 mb-2" />
                      <p className="text-sm font-black text-[#111827] mb-0.5">
                        Remove {user.role === UserRole.CLIENT ? 'client' : 'contractor'}?
                      </p>
                      <p className="text-xs text-gray-500 mb-1">{user.name}</p>
                      <p className="text-xs text-gray-400 mb-4">This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-4 py-1.5 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── trash trigger (admin only) ── */}
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmDeleteId(user.id)}
                      className="absolute top-3 right-3 z-10 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title={`Remove ${user.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  {/* ── avatar + name + role badge ── */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-care-orange/20 text-xs font-bold text-care-orange">
                      {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{user.name}</p>
                          {user.company && (
                            <p className="text-xs text-gray-500 truncate">{user.company}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-[#FDEEE9] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-care-orange shrink-0">
                          {user.role === UserRole.CLIENT ? 'Client' : 'Contractor'}
                        </span>
                      </div>

                      {user.specialty && user.role === UserRole.CONTRACTOR && (
                        <p className="mt-1 text-xs text-gray-500">{user.specialty}</p>
                      )}
                    </div>
                  </div>

                  {/* ── contact details ── */}
                  <div className="space-y-1 text-xs text-gray-500">
                    {user.email && (
                      <p className="flex items-center gap-1">
                        <Mail size={12} className="text-gray-400" />
                        <span className="truncate">{user.email}</span>
                      </p>
                    )}
                    {user.phone && (
                      <p className="flex items-center gap-1">
                        <Phone size={12} className="text-gray-400" />
                        <span>{user.phone}</span>
                      </p>
                    )}
                    {user.location && (
                      <p className="flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        <span className="truncate">{user.location}</span>
                      </p>
                    )}
                  </div>

                  {/* ── message button ── */}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onMessageUser(user)}
                      className="inline-flex items-center gap-1 rounded-xl bg-care-orange px-3 py-1.5 text-xs font-semibold text-white transition-all hover:shadow-md hover:shadow-care-orange/30"
                    >
                      <MessageSquare size={12} />
                      Message
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default UsersDirectory;