import React, { useState } from 'react';
import {
  X,
  MapPin,
  Maximize2,
  Users,
  Car,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  Plus,
  Copy,
  CheckCheck,
  Sun,
  Moon,
  ExternalLink,
  Wrench,
  Zap,
  Edit3,
  Trash2,
  Calendar,
} from 'lucide-react';
import { MediaAsset, Currency, UserAccount } from '../../types/mediaAsset';
import { formatCurrency, formatFullCurrency, formatNumberCompact, calculateCPM } from '../../utils/formatters';

interface AssetDetailModalProps {
  asset: MediaAsset;
  onClose: () => void;
  isInCart: boolean;
  onToggleCart: (asset: MediaAsset) => void;
  currency: Currency;
  currentUser?: UserAccount;
  onOpenEditModal?: (asset: MediaAsset) => void;
  onOpenBookingModal?: (asset: MediaAsset) => void;
  onDeleteAsset?: (asset: MediaAsset) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  isInCart,
  onToggleCart,
  currency,
  currentUser,
  onOpenEditModal,
  onOpenBookingModal,
  onDeleteAsset,
}) => {
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string>(asset.imageUrl);
  const [copiedGps, setCopiedGps] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'profiling' | 'commercials'>('overview');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'administrator';

  const copyGps = () => {
    navigator.clipboard?.writeText(`${asset.coordinates.lat}, ${asset.coordinates.lng}`);
    setCopiedGps(true);
    setTimeout(() => setCopiedGps(false), 2000);
  };

  const cpm = calculateCPM(asset.cost.monthlyRentalPkr, asset.profiling.dailyGrossImpressions);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Windows Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-amber-500/40 text-amber-400 font-mono font-bold text-xs">
              {asset.code}
            </span>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>{asset.title}</span>
              </h2>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{asset.city} · {asset.area} ({asset.zone})</span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400 font-mono">Vendor: {asset.vendor}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                asset.status === 'Available'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : asset.status === 'Occupied'
                  ? 'bg-blue-950 text-blue-300 border-blue-700'
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}
            >
              {asset.status}
            </span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Site Overview & Photo
          </button>
          <button
            onClick={() => setActiveTab('profiling')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'profiling'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Audience Profiling (SEC & Traffic)
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'specs'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Engineering & Technical Specs
          </button>
          <button
            onClick={() => setActiveTab('commercials')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'commercials'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Commercial Rate Card & Financials
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-300">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Image Preview with Day/Night Switch */}
              {(() => {
                const currentImg =
                  isNightMode && asset.nightImageUrl
                    ? asset.nightImageUrl
                    : selectedPhoto || asset.imageUrl;

                const hasNightPhoto = Boolean(asset.nightImageUrl);

                return (
                  <div className="space-y-2">
                    <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                      <img
                        src={currentImg}
                        alt={asset.title}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          isNightMode && !hasNightPhoto
                            ? 'brightness-75 contrast-125 saturate-120'
                            : ''
                        }`}
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded text-xs font-mono text-amber-400 border border-slate-700">
                        {asset.type} · {asset.dimensions?.widthFt ?? 0} × {asset.dimensions?.heightFt ?? 0} ft ({asset.dimensions?.totalSqFt ?? 0} sqft)
                      </div>

                      <button
                        onClick={() => setIsNightMode(!isNightMode)}
                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-slate-950/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-md transition-colors"
                      >
                        {isNightMode ? (
                          <>
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                            <span>Daylight View</span>
                          </>
                        ) : (
                          <>
                            <Moon className="w-3.5 h-3.5 text-blue-300" />
                            <span>
                              {hasNightPhoto
                                ? 'View Night Photo'
                                : 'Simulate Night Illumination'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Gallery Thumbnails if multiple photos */}
                    {asset.galleryImages && asset.galleryImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {asset.galleryImages.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedPhoto(imgUrl);
                              setIsNightMode(false);
                            }}
                            className={`relative w-16 h-12 rounded overflow-hidden shrink-0 border transition-all ${
                              selectedPhoto === imgUrl && !isNightMode
                                ? 'border-amber-400 ring-2 ring-amber-400/30'
                                : 'border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-600'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`View ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Location & Sightline Facing Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                    Traffic Heading & Approach Angle:
                  </span>
                  <p className="text-slate-200 text-xs leading-relaxed">
                    {asset.profiling.trafficDirection}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Peak Hours: {asset.profiling.peakCongestionHours}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      GIS Coordinates:
                    </span>
                    <button
                      onClick={copyGps}
                      className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 font-mono"
                    >
                      {copiedGps ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedGps ? 'Copied' : 'Copy GPS'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-200">
                    Lat: {asset.coordinates.lat.toFixed(5)}, Lng: {asset.coordinates.lng.toFixed(5)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Viewing Distance: <strong className="text-slate-200 font-mono">{asset.profiling.viewingDistanceMeters}m</strong> unobstructed visibility
                  </div>
                </div>
              </div>

              {/* Surrounding Landmarks */}
              <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Surrounding Retail & Corporate Landmarks:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {asset.profiling.surroundingLandmarks.map((lm) => (
                    <span
                      key={lm}
                      className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-[11px] text-slate-300"
                    >
                      {lm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profiling' && (
            <div className="space-y-4">
              {/* Traffic & Demographic Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">SEC Demographic</span>
                  <span className="font-mono text-xl font-bold text-amber-400">
                    Class {asset.profiling.secCategory}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">High Purchasing Power</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Daily Traffic</span>
                  <span className="font-mono text-xl font-bold text-slate-100">
                    {formatNumberCompact(asset.profiling.dailyTrafficVehicles)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">vehicles per day</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Gross Impressions</span>
                  <span className="font-mono text-xl font-bold text-slate-100">
                    {formatNumberCompact(asset.profiling.dailyGrossImpressions)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">views daily</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Average Dwell Time</span>
                  <span className="font-mono text-xl font-bold text-emerald-400">
                    {asset.profiling.dwellTimeSec}s
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">signal bottleneck</span>
                </div>
              </div>

              {/* Target Demographic Segments */}
              <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Target Consumer Demographic Groups:
                </span>
                <div className="flex flex-wrap gap-2">
                  {asset.profiling.targetDemographics.map((demo) => (
                    <span
                      key={demo}
                      className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-md text-xs font-medium"
                    >
                      {demo}
                    </span>
                  ))}
                </div>
              </div>

              {/* CPM Benchmarking */}
              <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Cost Per Thousand Reach (CPM):
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    ₨ {cpm} CPM
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Based on {formatNumberCompact(asset.profiling.dailyGrossImpressions * 30)} monthly exposures against monthly media rental of {formatCurrency(asset.cost.monthlyRentalPkr, currency)}.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                    Structural Architecture:
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Structure:</span>
                      <span className="text-slate-200 font-medium">{asset.techSpecs.structureType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Foundation:</span>
                      <span className="text-slate-200 font-medium">{asset.techSpecs.foundationType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Orientation:</span>
                      <span className="text-slate-200 font-medium">{asset.orientation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Display Faces:</span>
                      <span className="text-slate-200 font-medium">{asset.sides} Side{asset.sides > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                    Electrical & Illumination:
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Illumination Type:</span>
                      <span className="text-slate-200 font-medium">{asset.illumination}</span>
                    </div>
                    {asset.techSpecs.pixelPitch && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pixel Pitch:</span>
                        <span className="text-amber-400 font-mono font-medium">{asset.techSpecs.pixelPitch}</span>
                      </div>
                    )}
                    {asset.techSpecs.refreshRate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Refresh Rate:</span>
                        <span className="text-slate-200 font-mono">{asset.techSpecs.refreshRate}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Generator Backup:</span>
                      <span className="text-emerald-400 font-medium">
                        {asset.techSpecs.generatorBackup ? `Yes (${asset.techSpecs.generatorKva} kVA)` : 'No'}
                      </span>
                    </div>
                    {asset.techSpecs.operatingHours && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Operating Schedule:</span>
                        <span className="text-slate-200 font-mono">{asset.techSpecs.operatingHours}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {asset.notes && (
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-slate-400 text-xs">
                  <strong className="text-slate-200">Site Engineer Remarks:</strong> {asset.notes}
                </div>
              )}
            </div>
          )}

          {activeTab === 'commercials' && (() => {
            const vendorRate = asset.cost.vendorRatePkr ?? Math.round(asset.cost.monthlyRentalPkr * 0.7);
            const blazeRate = asset.cost.blazeRatePkr ?? asset.cost.monthlyRentalPkr;
            const marginPkr = blazeRate - vendorRate;
            const marginPercent = blazeRate > 0 ? Math.round((marginPkr / blazeRate) * 100) : 0;

            return (
              <div className="space-y-4">
                {/* Rate Structure: Vendor Rate & Blaze Rate */}
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                      Commercial Tariff & Pricing Structure
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-emerald-950/70 text-emerald-400 border-emerald-800/60">
                      {marginPkr > 0
                        ? `Agency Margin: ₨ ${marginPkr.toLocaleString('en-PK')} (+${marginPercent}%)`
                        : `Approved Rate Card: Parity`
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                        Vendor Rate (Cost)
                      </span>
                      <span className="font-mono text-base font-bold text-slate-200">
                        {formatFullCurrency(vendorRate, currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Net payable to {asset.vendor}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded border border-amber-500/30 bg-amber-500/5">
                      <span className="text-amber-400 text-[10px] uppercase font-semibold block mb-0.5">
                        Blaze Rate (Card)
                      </span>
                      <span className="font-mono text-base font-bold text-amber-400">
                        {formatFullCurrency(blazeRate, currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Approved Blaze Rate Card / month
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                        Commercial Spread
                      </span>
                      <span className="font-mono text-base font-bold text-emerald-400">
                        ₨ {Math.max(0, marginPkr).toLocaleString('en-PK')}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {Math.max(0, marginPercent)}% agency retained spread
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operations & Ancillary Costs */}
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                    Execution, Print & Taxation
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Production Charges</span>
                      <span className="font-mono text-sm font-bold text-slate-200">
                        {formatFullCurrency(asset.cost.productionCostPkr, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Mounting Labor</span>
                      <span className="font-mono text-sm font-bold text-slate-200">
                        {formatFullCurrency(asset.cost.mountingCostPkr, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Provincial Sales Tax</span>
                      <span className="font-mono text-sm font-bold text-amber-400">
                        {asset.cost.taxRatePercent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Modal Footer: Action Bar */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs">Monthly Rental:</span>
            <span className="font-mono font-bold text-slate-100 text-base">
              {formatFullCurrency(asset.cost.monthlyRentalPkr, currency)}
              <span className="text-xs text-slate-400 font-normal"> /month</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onOpenEditModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEditModal(asset);
                }}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold rounded text-xs flex items-center gap-1.5 transition-colors"
                title="Edit commercial and physical asset parameters (Administrator Only)"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Site (Admin)</span>
              </button>
            )}

            {isAdmin && onDeleteAsset && (
              <button
                onClick={() => {
                  onClose();
                  onDeleteAsset(asset);
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 font-medium rounded text-xs flex items-center gap-1 transition-colors"
                title="Permanently Delete Media Asset & Imagery (Administrator Only)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Asset</span>
              </button>
            )}

            {!isAdmin && onOpenBookingModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBookingModal(asset);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs flex items-center gap-1.5 transition-colors shadow-md"
                title="Submit booking reservation inquiry to Blaze Media Commercial Team"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Reserve Site / Request Booking</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded text-xs transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onToggleCart(asset)}
              className={`px-5 py-2 font-bold rounded text-xs flex items-center gap-1.5 transition-colors shadow-lg ${
                isInCart
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isInCart ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>In Media Plan Cart</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to Media Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
