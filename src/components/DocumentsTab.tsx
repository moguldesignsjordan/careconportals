import React, { useState, useRef } from 'react';
import { Document, User, UserRole } from '../types';
import { FileText, Upload, Download, Trash2, Search, Filter, Folder, File, Loader2 } from 'lucide-react';

interface DocumentsTabProps {
  documents: Document[];
  currentUser: User;
  users: User[];
  onUpload: (file: File, metadata: Omit<Document, 'id' | 'fileUrl' | 'uploadedAt' | 'fileSize'>) => Promise<void>;
  onDelete: (docId: string, fileUrl?: string) => void;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ documents, currentUser, users, onUpload, onDelete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<Document['category']>('Other');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: Document['category'][] = ['Contract', 'Blueprint', 'Permit', 'Invoice', 'Other'];

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterCategory === 'all' || doc.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadTitle(file.name.split('.')[0]);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) return;
    
    setIsUploading(true);
    try {
      await onUpload(selectedFile, {
        title: uploadTitle.trim(),
        fileName: selectedFile.name,
        category: uploadCategory,
        uploadedBy: currentUser.name,
      });
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadTitle('');
      setUploadCategory('Other');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CONTRACTOR;
  const canDelete = currentUser.role === UserRole.ADMIN;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Documents</h1>
          <p className="text-gray-500 font-medium">Manage project files and documentation</p>
        </div>
        {canUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-care-orange text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-care-orange/20 transition-all"
          >
            <Upload size={16} />
            Upload Document
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
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
      </div>

      {/* Documents Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl">
                  {getCategoryIcon(doc.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate group-hover:text-care-orange transition-colors">{doc.title}</h3>
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
                  {canDelete && (
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
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <Folder size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">No documents found</p>
          {canUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 text-care-orange font-bold text-sm hover:underline"
            >
              Upload your first document →
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}></div>
          
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-black">Upload Document</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <File size={24} className="text-care-orange" />
                <div className="min-w-0">
                  <p className="font-bold truncate">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-500">{selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Document Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-care-orange focus:ring-0"
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Category</label>
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

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !uploadTitle.trim()}
                  className="flex-1 py-3 bg-care-orange text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;
