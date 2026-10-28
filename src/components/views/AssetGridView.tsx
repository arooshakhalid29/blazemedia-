import React, { useState } from 'react';
import {
  Maximize2,
  Users,
  Eye,
  Plus,
  Check,
  MapPin,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Info,
  Edit3,
  Calendar,
  Trash2,
} from 'lucide-react';
import { MediaAsset, Currency, UserAccount } from '../../types/mediaAsset';
import { formatCurrency, formatNumberCompact } from '../../utils/formatters';

interface AssetGridViewProps {
  assets: MediaAsset[];
  selectedAssetIdsInCart: Set<string>;
  onToggleCartItem: (asset: MediaAsset) => void;
  onSelectAssetForDetails: (asset: MediaAsset) => void;
  currency: Currency;
  onResetFilters: () => void;
  currentUser?: UserAccount;
  onOpenEditModal?: (asset: MediaAsset) => void;
  onOpenBookingModal?: (asset: MediaAsset) => void;
  onDeleteAsset?: (asset: MediaAsset) => void;
}

export const AssetGridView: React.FC<AssetGridViewProps> = ({
  assets,
  selectedAssetIdsInCart,
  onToggleCartItem,
  onSelectAssetForDetails,
  currency,
  onResetFilters,
  currentUser,
  onOpenEditModal,
  onOpenBookingModal,
  onDeleteAsset,
}) => {
  const [nightModeMap, setNightModeMap] = useState<Record<string, boolean>>({});
  const isAdmin = currentUser?.role === 'administrator';

  const toggleNightMode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNightModeMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (assets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          {isAdmin ? 'Inventory is Empty' : 'No Outdoor Media Assets Listed'}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
          {isAdmin
            ? 'No media assets in database. Click "+ Add Asset" in the top bar to enter billboard specifications and upload photos manually, or use "Import Excel" for bulk ingestion.'
            : 'No outdoor media assets have been published yet. Please check back later or contact Blaze Media operations.'}
        </p>
        <button
          onClick={onResetFilters}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded transition-colors"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/40">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {assets.map((asset) => {
          const inCart = selectedAssetIdsInCart.has(asset.id);
          const isNight = nightModeMap[asset.id] || false;

          return (
            <div
              key={asset.id}
              onClick={() => onSelectAssetForDetails(asset)}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-black/40"
            >
              {/* Media Thumbnail Container with Night/Day Switch & Badges */}
              <div className="relative aspect-16/9 bg-slate-950 overflow-hidden">
                <img
                  src={asset.imageUrl}
                  alt={asset.title}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                    isNight ? 'brightness-75 contrast-125 saturate-120' : ''
                  }`}
                />

                {/* Top Overlay: Media Code + Status */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  <span className="px-2 py-0.5 bg-slate-950/80 backdrop-blur-xs text-[10px] font-mono text-amber-400 border border-slate-700/60 rounded">
                    {asset.code}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold backdrop-blur-xs border ${
                      asset.status === 'Available'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                        : asset.status === 'Occupied'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-600/60'
                        : 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                    }`}
                  >
                    {asset.status === 'Occupied' && asset.currentBrandOccupant
                      ? `Booked: ${asset.currentBrandOccupant.split(' - ')[0]}`
                      : asset.status}
                  </span>
                </div>

                {/* Bottom Overlay on Image: Type & Illumination */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-200 px-2 py-0.5 bg-slate-950/80 backdrop-blur-xs rounded border border-slate-800">
                    {asset.type}
                  </span>

                  <button
                    onClick={(e) => toggleNightMode(asset.id, e)}
                    className="p-1 rounded bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
                    title={isNight ? 'Switch to Daytime View' : 'Simulate Nighttime Illumination'}
                  >
                    {isNight ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-blue-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                {/* Title & Location */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-300">{asset.city}</span>
                      <span>·</span>
                      <span className="truncate">{asset.area}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-100 text-xs leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
                    {asset.title}
                  </h3>
                  <div className="text-[10px] text-amber-400/90 font-mono mt-1 truncate">
                    Vendor: {asset.vendor}
                  </div>
                </div>

                {/* Key Metric Specs Grid (Dimensions, Traffic, Profiling SEC) */}
                <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 bg-slate-950/60 rounded border border-slate-800/80 text-[10px]">
                  <div>
                    <span className="text-slate-500 block">Dimensions</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {asset.dimensions?.widthFt ?? 0}×{asset.dimensions?.heightFt ?? 0} ft
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Daily Traffic</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {formatNumberCompact(asset.profiling?.dailyTrafficVehicles ?? 0)}/day
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Audience SEC</span>
                    <span className="font-mono text-amber-400 font-bold">
                      Class {asset.profiling?.secCategory || 'A'}
                    </span>
                  </div>
                </div>

                {/* Card Footer: Vendor Rate & Blaze Rate + Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span>Vendor:</span>
                      <span className="font-mono text-slate-300">
                        {formatCurrency(asset.cost.vendorRatePkr ?? Math.round(asset.cost.monthlyRentalPkr * 0.7), currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-400 font-semibold">Blaze:</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        {formatCurrency(asset.cost.blazeRatePkr ?? asset.cost.monthlyRentalPkr, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAdmin && onOpenEditModal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditModal(asset);
                        }}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-medium rounded transition-colors flex items-center gap-1"
                        title="Edit Asset Properties (Administrator)"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    )}

                    {isAdmin && onDeleteAsset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAsset(asset);
                        }}
                        className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 text-[11px] font-medium rounded transition-colors flex items-center gap-1"
                        title="Permanently Delete Media Asset & Imagery (Administrator Only)"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}

                    {!isAdmin && onOpenBookingModal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenBookingModal(asset);
                        }}
                        className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-medium rounded transition-colors flex items-center gap-1"
                        title="Submit booking reservation inquiry"
                      >
                        <Calendar className="w-3 h-3" />
                        <span className="hidden sm:inline">Book</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAssetForDetails(asset);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium rounded transition-colors"
                      title="Inspect full technical specifications"
                    >
                      Specs
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCartItem(asset);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors ${
                        inCart
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title={inCart ? 'Remove from proposal plan' : 'Add to campaign proposal plan'}
                    >
                      {inCart ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Plan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
