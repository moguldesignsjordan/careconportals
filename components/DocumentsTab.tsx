
import React, { useState } from 'react';
import { FileText, Download, Trash2, Plus, Search, Filter, File, HardHat, FileCheck, Landmark } from 'lucide-react';
import { Document, User } from '../types';

interface DocumentsTabProps {
  documents: Document[];
  onUpload: (doc: Omit<Document, 'id' | 'uploadedAt'>) => void;
  onDelete: (id: string) => void;
  currentUser: User;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ documents, onUpload, onDelete, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' || doc.category === filter;
    return matchesSearch && matchesFilter;
  });

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Contract': return <FileCheck className="text-green-500" />;
      case 'Blueprint': return <Landmark className="text-blue-500" />;
      case 'Permit': return <HardHat className="text-orange-500" />;
      case 'Invoice': return <File className="text-purple-500" />;
      default: return <FileText className="text-gray-500" />;
    }
  };

  const handleSimulatedUpload = () => {
    const title = prompt('Enter Document Title:');
    if (!title) return;
    
    onUpload({
      title,
      fileName: `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileSize: '1.2 MB',
      uploadedBy: currentUser.name,
      category: 'Other'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Project Documents</h1>
          <p className="text-gray-500 font-medium">Manage blueprints, contracts, and permits.</p>
        </div>
        <button 
          onClick={handleSimulatedUpload}
          className="bg-care-orange text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:shadow-lg transition-all"
        >
          <Plus size={18} />
          Upload Document
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['All', 'Contract', 'Blueprint', 'Permit', 'Invoice', 'Other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                filter === cat 
                  ? 'bg-care-orange border-care-orange text-white shadow-lg shadow-care-orange/20' 
                  : 'bg-white border-gray-200 text-gray-500 hover:border-care-orange/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Document</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden md:table-cell">Category</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden lg:table-cell">Uploaded By</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden md:table-cell">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                      {getCategoryIcon(doc.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-400 font-medium truncate">{doc.fileName} • {doc.fileSize}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 hidden md:table-cell">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-gray-100 rounded-full text-gray-500">
                    {doc.category}
                  </span>
                </td>
                <td className="px-6 py-5 hidden lg:table-cell">
                  <p className="text-sm font-bold text-gray-700">{doc.uploadedBy}</p>
                </td>
                <td className="px-6 py-5 hidden md:table-cell">
                  <p className="text-sm text-gray-400 font-medium">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 text-gray-400 hover:text-care-orange transition-colors">
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDocs.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <FileText size={32} />
            </div>
            <p className="text-gray-400 font-bold italic">No documents found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsTab;
