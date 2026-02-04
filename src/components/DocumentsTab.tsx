import React, { useState, useRef, useMemo } from 'react';
import { Document, User, UserRole, Project } from '../types';
import { FileText, Upload, Download, Trash2, Search, Filter, Folder, File, Loader2, Lock, FolderOpen } from 'lucide-react';

interface DocumentsTabProps {
  documents: Document[];
  currentUser: User;
  users: User[];
  projects: Project[]; // Added: to filter documents by accessible projects
  onUpload: (file: File, metadata: Omit<Document, 'id' | 'fileUrl' | 'uploadedAt' | 'fileSize'>) => Promise<void>;
  onDelete: (docId: string, fileUrl?: string) => void;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ 
  documents, 
  currentUser, 
  users, 
  projects,
  onUpload, 
  onDelete 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<Document['category']>('Other');
  const [uploadProjectId, setUploadProjectId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: Document['category'][] = ['Contract', 'Blueprint', 'Permit', 'Invoice', 'Other'];

  // Get accessible project IDs for the current user
  const accessibleProjectIds = useMemo(() => {
    if (currentUser.role === UserRole.ADMIN) {
      return projects.map(p => p.id);
    }
    
    return projects
      .filter(project => {
        if (currentUser.role === UserRole.CONTRACTOR) {
          const contractorIds = project.contractorIds || [project.contractorId];
          return contractorIds.includes(currentUser.id);
        }
        if (currentUser.role === UserRole.CLIENT) {
          const clientIds = project.clientIds || [project.clientId];
          return clientIds.includes(currentUser.id);
        }
        return false;
      })
      .map(p => p.id);
  }, [projects, currentUser]);

  // Filter documents based on user access
  const accessibleDocuments = useMemo(() => {
    if (currentUser.role === UserRole.ADMIN) {
      return documents;
    }
    
    // Non-admin users can only see documents from projects they're assigned to
    return documents.filter(doc => {
      if (!doc.projectId) return false;
      return accessibleProjectIds.includes(doc.projectId);
    });
  }, [documents, accessibleProjectIds, currentUser.role]);

  // Get projects for filtering dropdown (only accessible ones)
  const accessibleProjects = useMemo(() => {
    if (currentUser.role === UserRole.ADMIN) {
      return projects;
    }
    return projects.filter(p => accessibleProjectIds.includes(p.id));
  }, [projects, accessibleProjectIds, currentUser.role]);

  // Final filtered documents
  const filteredDocs = useMemo(() => {
    return accessibleDocuments.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
      const matchesProject = filterProject === 'all' || doc.projectId === filterProject;
      return matchesSearch && matchesCategory && matchesProject;
    });
  }, [accessibleDocuments, searchQuery, filterCategory, filterProject]);

  // Group documents by project for display
  const documentsByProject = useMemo(() => {
    const grouped: Record<string, Document[]> = {};
    filteredDocs.forEach(doc => {
      const projectId = doc.projectId || 'unassigned';
      if (!grouped[projectId]) {
        grouped[projectId] = [];
      }
      grouped[projectId].push(doc);
    });
    return grouped;
  }, [filteredDocs]);

  const getCategoryIcon = (category: Document['category']) => {
    switch (category) {
      case 'Contract': return '📄';
      case 'Blueprint': return '📐';
      case 'Permit': return '📋';
      case 'Invoice': return '💰';
      default: return '📁';
    }
  };

  const getCategoryColor = (category: Document['category']) => {
    switch (category) {
      case 'Contract': return 'bg-blue-100 text-blue-700';
      case 'Blueprint': return 'bg-purple-100 text-purple-700';
      case 'Permit': return 'bg-green-100 text-green-700';
      case 'Invoice': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProjectName = (projectId: string | undefined) => {
    if (!projectId) return 'General Documents';
    const project = projects.find(p => p.id === projectId);
    return project?.title || 'Unknown Project';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadTitle(file.name.split('.').slice(0, -1).join('.') || file.name);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) return;
    
    if (currentUser.role !== UserRole.ADMIN && !uploadProjectId) {
      alert('Please select a project for this document');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(selectedFile, {
        title: uploadTitle,
        fileName: selectedFile.name,
        category: uploadCategory,
        uploadedBy: currentUser.name,
        projectId: uploadProjectId || undefined,
      });
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadTitle('');
      setUploadCategory('Other');
      setUploadProjectId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
            Document Center
          </p>
          <h1 className="text-2xl font-black text-[#111827]">Documents</h1>
          {currentUser.role !== UserRole.ADMIN && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Lock size={12} />
              Showing documents from your assigned projects only
            </p>
          )}
        </div>
        
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-3 bg-care-orange text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-care-orange/90 transition-all shadow-lg shadow-care-orange/25"
          >
            <Upload size={16} />
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase">Total Documents</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{accessibleDocuments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase">Contracts</p>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {accessibleDocuments.filter(d => d.category === 'Contract').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase">Blueprints</p>
          <p className="text-2xl font-black text-purple-600 mt-1">
            {accessibleDocuments.filter(d => d.category === 'Blueprint').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase">Projects</p>
          <p className="text-2xl font-black text-care-orange mt-1">{accessibleProjects.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-care-orange focus:ring-0 transition-all"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-xl focus:border-care-orange focus:ring-0 transition-all appearance-none cursor-pointer font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-xl focus:border-care-orange focus:ring-0 transition-all appearance-none cursor-pointer font-medium min-w-[200px]"
          >
            <option value="all">All Projects</option>
            {accessibleProjects.map(project => (
              <option key={project.id} value={project.id}>{project.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length > 0 ? (
        <div className="space-y-6">
          {filterProject === 'all' ? (
            Object.entries(documentsByProject).map(([projectId, docs]) => (
              <div key={projectId} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Folder size={16} className="text-care-orange" />
                  <h3 className="text-sm font-bold text-gray-700">
                    {getProjectName(projectId === 'unassigned' ? undefined : projectId)}
                  </h3>
                  <span className="text-xs text-gray-400">({docs.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      currentUser={currentUser}
                      getCategoryIcon={getCategoryIcon}
                      getCategoryColor={getCategoryColor}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  currentUser={currentUser}
                  getCategoryIcon={getCategoryIcon}
                  getCategoryColor={getCategoryColor}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No documents found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {currentUser.role !== UserRole.ADMIN 
              ? "You don't have any documents in your assigned projects yet."
              : "No documents match your search criteria."}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-care-orange text-white rounded-xl text-sm font-bold hover:bg-care-orange/90 transition-colors"
          >
            <Upload size={16} />
            Upload your first document
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Trash2 size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-care-orange/10 rounded-xl flex items-center justify-center">
                <File size={24} className="text-care-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{selectedFile?.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                Document Title
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-care-orange focus:ring-0"
                placeholder="Enter document title"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as Document['category'])}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-care-orange focus:ring-0"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                Project {currentUser.role !== UserRole.ADMIN && <span className="text-red-500">*</span>}
              </label>
              <select
                value={uploadProjectId}
                onChange={(e) => setUploadProjectId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-care-orange focus:ring-0"
                required={currentUser.role !== UserRole.ADMIN}
              >
                <option value="">
                  {currentUser.role === UserRole.ADMIN ? 'No project (General)' : 'Select a project'}
                </option>
                {accessibleProjects.map(project => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
              {currentUser.role !== UserRole.ADMIN && (
                <p className="text-xs text-gray-500 mt-1">
                  Documents must be assigned to one of your projects
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !uploadTitle.trim() || (currentUser.role !== UserRole.ADMIN && !uploadProjectId)}
                className="flex-1 py-3 bg-care-orange text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Document Card Component
interface DocumentCardProps {
  doc: Document;
  currentUser: User;
  getCategoryIcon: (category: Document['category']) => string;
  getCategoryColor: (category: Document['category']) => string;
  onDelete: (docId: string, fileUrl?: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  currentUser,
  getCategoryIcon,
  getCategoryColor,
  onDelete
}) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl">
          {getCategoryIcon(doc.category)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate group-hover:text-care-orange transition-colors">
            {doc.title}
          </h3>
          <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getCategoryColor(doc.category)}`}>
              {doc.category}
            </span>
            <span className="text-[10px] text-gray-400">{doc.fileSize}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {new Date(doc.uploadedAt).toLocaleDateString()} by {doc.uploadedBy}
        </p>
        <div className="flex gap-1">
          {doc.fileUrl && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-care-orange hover:bg-care-orange/5 rounded-lg transition-all"
            >
              <Download size={16} />
            </a>
          )}
          {(currentUser.role === UserRole.ADMIN || doc.uploadedBy === currentUser.name) && (
            <button
              onClick={() => onDelete(doc.id, doc.fileUrl)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsTab;