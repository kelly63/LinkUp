import { useState, useRef } from 'react';
import { Upload, Trash2, FileText, Image, X, Plus } from 'lucide-react';
import { uploads, MediaItem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

interface CoachDocumentsViewProps {
  onClose: () => void;
}

export function CoachDocumentsView({ onClose }: CoachDocumentsViewProps) {
  const { token, user, updateUser } = useAuth();
  const [docs, setDocs] = useState<MediaItem[]>((user as any)?.documents || []);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setNameInput(file.name.replace(/\.[^.]+$/, ''));
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile || !token) return;
    setUploading(true);
    try {
      const { documents } = await uploads.addDocument(token, pendingFile, nameInput.trim() || pendingFile.name);
      setDocs(documents);
      updateUser({ ...(user as any), documents });
      setPendingFile(null);
      setNameInput('');
      toast.success('Document uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!token) return;
    setDeletingId(docId);
    try {
      const { documents } = await uploads.removeDocument(token, docId);
      setDocs(documents);
      updateUser({ ...(user as any), documents });
      toast.success('Removed');
    } catch (err: any) {
      toast.error(err.message || 'Could not remove');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6 flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <div>
          <h2 className="text-white font-bold text-xl">My Documents</h2>
          <p className="text-emerald-300 text-sm">Resume, certifications & training materials</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Upload area */}
        {pendingFile ? (
          <div className="bg-white rounded-2xl p-4 border-2 border-emerald-300 space-y-3">
            <div className="flex items-center gap-3">
              {pendingFile.type === 'application/pdf'
                ? <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                : <Image className="w-8 h-8 text-emerald-600 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-500 truncate">{pendingFile.name}</p>
                <p className="text-xs text-slate-400">{(pendingFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button onClick={() => setPendingFile(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Label (optional)"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {uploading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Upload className="w-4 h-4" /> Upload</>}
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Photo or PDF
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Document list */}
        {docs.length === 0 && !pendingFile && (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No documents uploaded yet</p>
            <p className="text-slate-400 text-xs mt-1">Add your resume, certifications, or training photos</p>
          </div>
        )}

        {docs.map(doc => (
          <div key={doc._id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
            {doc.type === 'pdf'
              ? <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
              : <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                  <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                </div>}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{doc.name || 'Untitled'}</p>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline"
              >
                {doc.type === 'pdf' ? 'View PDF' : 'View Image'}
              </a>
            </div>
            <button
              onClick={() => handleDelete(doc._id)}
              disabled={deletingId === doc._id}
              className="p-2 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
