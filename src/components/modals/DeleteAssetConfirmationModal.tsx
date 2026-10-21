import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  MapPin,
  Maximize2,
  Users,
  Image as ImageIcon,
  DollarSign,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { MediaAsset, Currency, UserAccount } from '../../types/mediaAsset';
import { formatCurrency, formatNumberCompact } from '../../utils/formatters';

interface DeleteAssetConfirmationModalProps {
  asset: MediaAsset;
  currency: Currency;
  currentUser?: UserAccount;
  isDeleting?: boolean;
  onConfirm: (asset: MediaAsset) => Promise<void> | void;
  onCancel: () => void;
}

export const DeleteAssetConfirmationModal: React.FC<DeleteAssetConfirmationModalProps> = ({
  asset,
  currency,
  currentUser,
  isDeleting = false,
  onConfirm,
  onCancel,
}) => {
  const [internalDeleting, setInternalDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isAdmin =
    currentUser?.role === 'administrator' &&
    currentUser?.email?.toLowerCase().trim() === 'admin@blaze.com.pk';

  // Count associated images that will be purged
  const imageCount = [
    asset.imageUrl,
    asset.nightImageUrl,
    ...(asset.galleryImages || []),
  ].filter(Boolean).length;

  const handleConfirmClick = async () => {
    if (!isAdmin) {
      setErrorMessage(
        'Access Denied: Only administrators (admin@blaze.com.pk) are permitted to delete outdoor media assets.'
      );
      return;
    }

    try {
      setInternalDeleting(true);
      setErrorMessage('');
      await onConfirm(asset);
    } catch (err: any) {
      console.error('Delete asset failed:', err);
      setErrorMessage(err.message || 'Failed to delete asset. Please check network and permissions.');
      setInternalDeleting(false);
    }
  };

  const isBusy = isDeleting || internalDeleting;

  return (
    <div
      className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (!isBusy && e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="bg-slate-900 border border-red-900/60 rounded-xl shadow-2xl shadow-red-950/40 w-full max-w-lg flex flex-col overflow-hidden text-slate-200 text-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-red-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="delete-dialog-title"
                className="font-bold text-sm text-slate-100 flex items-center gap-2"
              >
                <span>Delete Media Asset</span>
                <span className="font-mono text-red-400 text-xs font-normal">
                  [{asset.code}]
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Permanent Database & Storage Removal
              </span>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isBusy}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors disabled:opacity-40"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Warning Banner */}
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start gap-3 text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-xs text-red-300">
                Are you sure you want to permanently delete this asset?
              </p>
              <p className="text-[11px] text-red-300/80 leading-relaxed">
                This action cannot be undone. The media asset specifications, commercial rates,
                profiling metrics, and its associated images ({imageCount} photo
                {imageCount === 1 ? '' : 's'}) will be permanently removed from the database and storage.
                Both Administrator and Client panels will be updated immediately.
              </p>
            </div>
          </div>

          {/* Asset Summary Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-3">
            <div className="flex gap-3">
              {/* Asset Thumbnail */}
              <div className="w-24 h-20 rounded bg-slate-900 border border-slate-800 overflow-hidden shrink-0 relative">
                {asset.imageUrl ? (
                  <img
                    src={asset.imageUrl}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] bg-slate-950/80 font-mono text-amber-400 border border-slate-800">
                  {asset.type.split(' ')[0]}
                </span>
              </div>

              {/* Asset Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="font-semibold text-slate-300">{asset.city}</span>
                  <span>·</span>
                  <span className="truncate">{asset.area}</span>
                </div>
                <h3 className="font-bold text-slate-100 text-xs line-clamp-1">
                  {asset.title}
                </h3>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  Vendor: <span className="text-amber-400">{asset.vendor}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                  <span className="font-mono text-slate-300">
                    {asset.dimensions.widthFt}×{asset.dimensions.heightFt} ft
                  </span>
                  <span>·</span>
                  <span className="text-amber-400 font-mono font-semibold">
                    {formatCurrency(asset.cost.monthlyRentalPkr, currency)}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Deletion Details */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-slate-500" />
                <span>Associated Images to Purge:</span>
              </span>
              <span className="font-semibold text-slate-200">
                Primary Photo {asset.nightImageUrl ? '+ Night Lighting' : ''}{' '}
                {asset.galleryImages && asset.galleryImages.length > 1
                  ? `+ ${asset.galleryImages.length - 1} Gallery`
                  : ''}
              </span>
            </div>
          </div>

          {/* Security & Access Protection Notice */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Authorized Administrator: <strong className="text-slate-300">admin@blaze.com.pk</strong>. Clients cannot perform deletions.
            </span>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer / Action Buttons */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded text-xs transition-colors disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isBusy || !isAdmin}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded text-xs flex items-center gap-2 transition-colors shadow-lg shadow-red-950/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Asset & Images...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete Asset</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
