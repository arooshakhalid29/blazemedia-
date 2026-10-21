import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  Sun,
  Moon,
  Sparkles,
  Link as LinkIcon,
  AlertCircle,
  Eye,
  Camera,
  Layers,
} from 'lucide-react';
import {
  UploadedImageItem,
  OOH_STOCK_TEMPLATES,
  processUploadedImageFile,
  formatFileSize,
} from '../../utils/imageUpload';
import { MediaType } from '../../types/mediaAsset';

interface AssetImageUploaderProps {
  currentType: MediaType;
  primaryImage: string;
  nightImage?: string;
  galleryImages?: string[];
  onChange: (data: {
    primaryImage: string;
    nightImage?: string;
    galleryImages?: string[];
  }) => void;
}

export const AssetImageUploader: React.FC<AssetImageUploaderProps> = ({
  currentType,
  primaryImage,
  nightImage,
  galleryImages = [],
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [showUrlField, setShowUrlField] = useState(false);
  const [previewMode, setPreviewMode] = useState<'day' | 'night'>('day');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maintain local state of items
  const [items, setItems] = useState<UploadedImageItem[]>(() => {
    const list: UploadedImageItem[] = [];
    if (primaryImage) {
      list.push({
        id: 'primary-img-1',
        dataUrl: primaryImage,
        name: 'Primary Site Photo',
        isPrimary: true,
      });
    }
    if (nightImage && nightImage !== primaryImage) {
      list.push({
        id: 'night-img-2',
        dataUrl: nightImage,
        name: 'Night Illumination Photo',
        isNight: true,
      });
    }
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach((img, idx) => {
        if (img !== primaryImage && img !== nightImage) {
          list.push({
            id: `gallery-img-${idx + 3}`,
            dataUrl: img,
            name: `Site Angle ${idx + 1}`,
          });
        }
      });
    }
    return list;
  });

  const syncToParent = (updatedItems: UploadedImageItem[]) => {
    const primary = updatedItems.find((i) => i.isPrimary)?.dataUrl || updatedItems[0]?.dataUrl || '';
    const night = updatedItems.find((i) => i.isNight)?.dataUrl;
    const gallery = updatedItems.map((i) => i.dataUrl);

    onChange({
      primaryImage: primary,
      nightImage: night,
      galleryImages: gallery,
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError('');
    setIsProcessing(true);

    try {
      const newItems: UploadedImageItem[] = [...items];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          setUploadError(`Skipped "${file.name}": Only image files are allowed.`);
          continue;
        }

        const dataUrl = await processUploadedImageFile(file);
        const hasPrimary = newItems.some((item) => item.isPrimary);

        newItems.push({
          id: `upload-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          dataUrl,
          name: file.name,
          sizeBytes: file.size,
          isPrimary: !hasPrimary && i === 0,
        });
      }

      setItems(newItems);
      syncToParent(newItems);
    } catch (err: any) {
      setUploadError(err.message || 'Error processing uploaded images.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const setItemAsPrimary = (id: string) => {
    const updated = items.map((item) => ({
      ...item,
      isPrimary: item.id === id,
      isNight: item.id === id ? false : item.isNight,
    }));
    setItems(updated);
    syncToParent(updated);
  };

  const setItemAsNight = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, isNight: !item.isNight, isPrimary: false };
      }
      return item;
    });
    setItems(updated);
    syncToParent(updated);
  };

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    // If we removed the primary image, make the first one primary
    if (updated.length > 0 && !updated.some((i) => i.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setItems(updated);
    syncToParent(updated);
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const hasPrimary = items.some((i) => i.isPrimary);

    const newItem: UploadedImageItem = {
      id: `url-${Date.now()}`,
      dataUrl: url,
      name: url.split('/').pop()?.split('?')[0] || 'Web Image',
      isPrimary: !hasPrimary,
    };

    const updated = [...items, newItem];
    setItems(updated);
    syncToParent(updated);
    setUrlInput('');
    setShowUrlField(false);
  };

  const handleSelectTemplate = (templateUrl: string, label: string) => {
    const hasPrimary = items.some((i) => i.isPrimary);
    const newItem: UploadedImageItem = {
      id: `tpl-${Date.now()}`,
      dataUrl: templateUrl,
      name: label,
      isPrimary: !hasPrimary,
    };
    const updated = [...items, newItem];
    setItems(updated);
    syncToParent(updated);
  };

  const currentDisplayImage =
    previewMode === 'night' && nightImage
      ? nightImage
      : primaryImage || items[0]?.dataUrl;

  return (
    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Outdoor Media Site Photography
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 font-mono">
                {items.length} {items.length === 1 ? 'Photo' : 'Photos'} Attached
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Upload actual site structure pictures, daytime sightlines, and night illuminated views
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlField(!showUrlField)}
            className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors px-2 py-1 bg-slate-900 border border-slate-800 rounded"
          >
            <LinkIcon className="w-3 h-3" />
            <span>Image URL</span>
          </button>
        </div>
      </div>

      {/* URL Input Bar */}
      {showUrlField && (
        <div className="flex items-center gap-2 p-2 bg-slate-900 rounded border border-slate-700">
          <input
            type="url"
            placeholder="https://example.com/site-photo.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors"
          >
            Add Image
          </button>
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-amber-400 bg-amber-950/20 shadow-lg shadow-amber-950/40 ring-2 ring-amber-500/20'
            : 'border-slate-700 hover:border-amber-500/70 bg-slate-900/60 hover:bg-slate-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-amber-400" />
          )}
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-200">
            {isProcessing ? 'Optimizing & encoding photos...' : 'Click to upload or drag & drop site images'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            JPG, PNG, WebP up to 15MB · Auto-scaled for crisp client proposal presentations
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded shadow-xs transition-colors flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            <span>Select Photos from Device</span>
          </span>
        </div>
      </div>

      {uploadError && (
        <div className="p-2.5 bg-red-950/50 border border-red-800 rounded flex items-center gap-2 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Live Preview Card if any image exists */}
      {currentDisplayImage && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              Live Presentation Preview
            </span>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('day')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                  previewMode === 'day'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Day</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('night')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                  previewMode === 'night'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Night {nightImage ? '✓' : '(Simulated)'}</span>
              </button>
            </div>
          </div>

          <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
            <img
              src={currentDisplayImage}
              alt="Site preview"
              className={`w-full h-full object-cover transition-all duration-300 ${
                previewMode === 'night' && !nightImage
                  ? 'brightness-75 contrast-125 saturate-120'
                  : ''
              }`}
            />
            <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-amber-400 border border-slate-700">
              {currentType} · Active Viewport
            </div>

            {previewMode === 'night' && (
              <div className="absolute bottom-2 left-2 bg-blue-950/90 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-blue-800 flex items-center gap-1 font-mono">
                <Moon className="w-3 h-3" />
                <span>{nightImage ? 'Night Camera Capture' : 'Night Illumination Simulated'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uploaded Photos Thumbnails & Controls */}
      {items.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-slate-400 block">
            Attached Site Photos ({items.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all ${
                  item.isPrimary
                    ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/20'
                    : item.isNight
                    ? 'bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-14 h-14 rounded overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                  <img
                    src={item.dataUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {item.isPrimary && (
                    <div className="absolute top-0.5 left-0.5 bg-amber-500 text-slate-950 rounded p-0.5 shadow-xs">
                      <Sun className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  )}
                  {item.isNight && (
                    <div className="absolute top-0.5 left-0.5 bg-blue-500 text-white rounded p-0.5 shadow-xs">
                      <Moon className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>

                {/* Details & Actions */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-200 truncate block">
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.isPrimary ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                        ★ Primary Day Photo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setItemAsPrimary(item.id)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      >
                        Set as Primary
                      </button>
                    )}

                    {item.isNight ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                        🌙 Night Photo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setItemAsNight(item.id)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      >
                        Set as Night
                      </button>
                    )}

                    {item.sizeBytes && (
                      <span className="text-[9px] text-slate-500 font-mono ml-auto">
                        {formatFileSize(item.sizeBytes)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stock Templates Picker */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Or add standard outdoor media stock templates:
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OOH_STOCK_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => handleSelectTemplate(tmpl.url, tmpl.label)}
              className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-850 text-left transition-all group"
            >
              <img
                src={tmpl.url}
                alt={tmpl.label}
                className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-slate-200 block truncate group-hover:text-amber-300">
                  {tmpl.label}
                </span>
                <span className="text-[9px] text-slate-500 truncate block">
                  {tmpl.type}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
