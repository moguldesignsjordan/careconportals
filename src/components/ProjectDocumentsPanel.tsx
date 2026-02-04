import React, { useEffect, useState } from 'react';
import { Paperclip, Upload, Trash2, FileText } from 'lucide-react';
import { Project, User, Document as ProjectDocument } from '../types';
import {
  subscribeToProjectDocuments,
  uploadProjectDocument,
  deleteDocument,
} from '../services/db';

interface ProjectDocumentsPanelProps {
  project: Project;
  currentUser: User;
}

const ProjectDocumentsPanel: React.FC<ProjectDocumentsPanelProps> = ({
  project,
  currentUser,
}) => {
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!project?.id) return;
    const unsub = subscribeToProjectDocuments(project.id, setDocs);
    return () => {
      if (unsub) unsub();
    };
  }, [project?.id]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      // db.uploadProjectDocument(file, project, uploader)
      await uploadProjectDocument(file, project, currentUser);
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Could not upload document. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = ''; // reset input
    }
  };

  const handleDelete = async (doc: ProjectDocument) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this document? This action cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      await deleteDocument(doc.id, doc.fileUrl);
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Could not delete document. Please try again.');
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-care-orange" />
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-gray-700">
            Project Documents
          </h3>
        </div>

        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-black rounded-lg cursor-pointer hover:bg-black transition">
          <Upload size={14} />
          {uploading ? 'Uploading…' : 'Upload'}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-gray-500">
          No documents yet. Upload plans, permits, or photos here.
        </p>
      ) : (
        <ul className="space-y-2 text-xs">
          {docs.map((doc) => {
            const label = doc.title || doc.fileName || 'Document';
            const uploadedAt =
              doc.uploadedAt || new Date().toISOString().slice(0, 10);

            return (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-care-orange shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {label}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {doc.uploadedBy || 'Unknown'} · {uploadedAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-care-orange font-semibold hover:underline"
                    >
                      View
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ProjectDocumentsPanel;
