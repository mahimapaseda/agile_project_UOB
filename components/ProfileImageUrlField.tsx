'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  PROFILE_IMAGE_ACCEPT,
  PROFILE_IMAGE_HINT,
  readProfileImageFile,
} from '@/lib/profile-image-file';
import { isProfileImageDataUrl } from '@/components/ProfileImagePreview';
import { cn } from '@/lib/utils';

interface ProfileImageUrlFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  onImageFile: (dataUrl: string, previewUrl: string) => void;
  onClearFile?: () => void;
  placeholder?: string;
}

export function ProfileImageUrlField({
  label,
  value = '',
  onChange,
  onImageFile,
  onClearFile,
  placeholder = 'https://...',
}: ProfileImageUrlFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasUploadedFile = isProfileImageDataUrl(value);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    setLoading(true);
    try {
      const { dataUrl, previewUrl } = await readProfileImageFile(file);
      onChange(dataUrl);
      onImageFile(dataUrl, previewUrl);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not use that image.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearUploadedFile = () => {
    onChange('');
    onClearFile?.();
    setFileError(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-[11.5px] font-bold uppercase tracking-wide text-slate-700">
          {label}
        </Label>
        {!fileError && (
          <span className="truncate text-[10.5px] text-slate-400">{PROFILE_IMAGE_HINT}</span>
        )}
      </div>

      {hasUploadedFile ? (
        <div className="flex h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3">
          <ImageIcon className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-emerald-900">
            Image file selected
          </span>
          <button
            type="button"
            onClick={clearUploadedFile}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-100"
            aria-label="Remove uploaded image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={PROFILE_IMAGE_ACCEPT}
          className="sr-only"
          onChange={(e) => void handleFileChange(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          className="h-9 gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {loading ? 'Processing…' : 'Choose image file'}
        </Button>
        <span className="text-[10.5px] text-slate-400">JPEG, PNG, WebP, or GIF</span>
      </div>
      {fileError && (
        <p className={cn('text-[11px] font-medium text-rose-600')}>{fileError}</p>
      )}
    </div>
  );
}
