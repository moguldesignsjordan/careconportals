import React, { useEffect, useState } from 'react';
import { Paperclip, Trash2, UploadCloud } from 'lucide-react';
import { Project, User, Document as ProjectDocument, UserRole } from '../types';

import {
  subscribeToProjectDocuments,
  uploadProjectDocument,
  deleteProjectDocument,
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

    const unsubscribe = subscribeToProjectDocuments(project.id, (list) => {
      setDocs(
        list
          .slice()
          .sort(
            (a, b) =>
              new Date(b.uploadedAt).getTime() -
              new Date(a.uploadedAt).getTime()
          )
      );
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [project?.id]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !project?.id) return;

    setUploading(true);
    try {
      await uploadProjectDocument(project.id, file, currentUser);
    } catch (err) {
      console.error('Failed to upload document', err);
      alert('Could not upload document. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!project?.id) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this document? This action cannot be undone.'
    );

    if (!confirmDelete) return;

    try {
      await deleteProjectDocument(project.id, docId);
    } catch (err) {
      console.error('Failed to delete document', err);
      alert('Could not delete document. Please try again.');
    }
  };

  const canUploadOrDelete = !!currentUser; // rules handle real security

  const formatDate = (value?: string) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Paperclip size={18} className="text-care-orange" />
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em]">
            Project Documents
          </p>
        </div>

        {canUploadOrDelete && (
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer bg-gray-50 border border-gray-200 hover:bg-white hover:border-care-orange/60 transition-colors">
            <UploadCloud size={14} className="text-care-orange" />
            {uploading ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-gray-500">
          No documents uploaded yet. {canUploadOrDelete && 'Upload plans, photos, or contracts here.'}
        </p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                  <Paperclip size={14} className="text-care-orange" />
                </div>
                <div className="min-w-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-semibold text-gray-800 hover:text-care-orange"
                  >
                    {doc.name}
                  </a>
                  <p className="text-[10px] text-gray-500">
                    {doc.uploadedByName || 'Unknown'} · {formatDate(doc.uploadedAt)}
                  </p>
                </div>
              </div>

              {canUploadOrDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProjectDocumentsPanel;
