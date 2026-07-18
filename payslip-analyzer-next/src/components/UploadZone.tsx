'use strict';
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, File, X, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  onFileCleared: () => void;
}

export function UploadZone({ onFileSelected, onFileCleared }: UploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum file size is 10MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    onFileSelected(selectedFile);

    // Create thumbnail preview if image
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, [onFileSelected]);

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    setError(null);
    onFileCleared();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-300 ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/20'
            : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50'
        }`}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="flex flex-col items-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt="Upload preview"
                className="h-24 w-24 rounded-lg object-cover shadow-md ring-2 ring-indigo-500/20"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                <File className="h-12 w-12" />
              </div>
            )}
            <div>
              <p className="max-w-[240px] truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                {file.name}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={removeFile}
              className="absolute right-4 top-4 rounded-full bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-indigo-50 p-4 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
              <FileUp className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">
              Upload Payslip
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Drag and drop your PDF, JPG, or PNG payslip here, or click to browse.
            </p>
            <p className="mt-1 text-xs text-slate-400">Max size 10MB.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
