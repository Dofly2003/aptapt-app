// src/components/admin/AdminUI.jsx
// Reusable building blocks for admin pages: page headers, modal, form controls, image uploader.

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';

/* ----- Page header ----- */
export function AdminPageHeader({ title, description, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/* ----- Button ----- */
export function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-slate-900',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'hover:bg-slate-100 text-slate-600',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700',
  };
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ----- Modal ----- */
export function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`bg-white rounded-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----- Form fields ----- */
export function Field({ label, error, hint, children, required }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition ${props.className || ''}`}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition resize-vertical ${props.className || ''}`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white ${props.className || ''}`}
    >
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="relative">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <span className="w-10 h-5 bg-slate-300 rounded-full peer-checked:bg-amber-500 transition" />
        <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5" />
      </span>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}

/* ----- Image uploader ----- */
export function ImageUploader({ value, onChange, label = 'Gambar', aspect = 'aspect-video' }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value?.url || value || null);

  const handle = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('File harus berupa gambar');
    if (file.size > 5 * 1024 * 1024) return alert('Ukuran maksimal 5MB');
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file);
  };

  const clear = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Field label={label}>
      <div
        className={`relative ${aspect} bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 transition overflow-hidden`}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 hover:text-amber-600"
          >
            <Upload className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">Klik untuk unggah</p>
            <p className="text-xs">PNG, JPG hingga 5MB</p>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handle} className="hidden" />
      </div>
    </Field>
  );
}

/* ----- Empty state ----- */
export function EmptyState({ title, description, action }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <ImageIcon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="font-semibold text-slate-900 mb-1">{title}</p>
      {description && <p className="text-sm text-slate-500 mb-5">{description}</p>}
      {action}
    </div>
  );
}

/* ----- Toast (very simple, in-page) ----- */
export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const Toast = () => (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-emerald-500 text-white'
          }`}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { show, Toast };
}