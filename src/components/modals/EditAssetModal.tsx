import React, { useState } from 'react';
import { X, Save, Edit3, Trash2, AlertCircle } from 'lucide-react';
import {
  MediaAsset,
  City,
  MediaType,
  IlluminationType,
  SECCategory,
  AssetStatus,
  AuthorityNOC,
  STANDARD_VENDORS,
} from '../../types/mediaAsset';
import {
  CITIES_BY_PROVINCE,
  getPakistanCityMeta,
} from '../../data/pakistanCities';
import { AssetImageUploader } from '../common/AssetImageUploader';

interface EditAssetModalProps {
  asset: MediaAsset;
  onSave: (updated: MediaAsset) => void;
  onDelete?: (asset: MediaAsset) => void;
  onClose: () => void;
  availableVendors?: string[];
}

export const EditAssetModal: React.FC<EditAssetModalProps> = ({
  asset,
  onSave,
  onDelete,
  onClose,
  availableVendors,
}) => {
  const vendorList = availableVendors && availableVendors.length > 0 ? availableVendors : Array.from(STANDARD_VENDORS);
  const [title, setTitle] = useState(asset.title);
  const [vendor, setVendor] = useState(asset.vendor || 'Blaze Media (Pvt) Ltd');
  const [city, setCity] = useState<City>(asset.city);
  const [area, setArea] = useState(asset.area);
  const [type, setType] = useState<MediaType>(asset.type);
  const [widthFt, setWidthFt] = useState(asset.dimensions.widthFt);
  const [heightFt, setHeightFt] = useState(asset.dimensions.heightFt);
  const [illumination, setIllumination] = useState<IlluminationType>(asset.illumination);
  const [vendorRatePkr, setVendorRatePkr] = useState<number | ''>(
    asset.cost.vendorRatePkr ?? Math.round(asset.cost.monthlyRentalPkr * 0.7)
  );
  const [blazeRatePkr, setBlazeRatePkr] = useState<number | ''>(
    asset.cost.blazeRatePkr ?? asset.cost.monthlyRentalPkr
  );
  const [status, setStatus] = useState<AssetStatus>(asset.status);
  const [currentBrandOccupant, setCurrentBrandOccupant] = useState(asset.currentBrandOccupant || '');
  const [secCategory, setSecCategory] = useState<SECCategory>(asset.profiling.secCategory);
  const [dailyTrafficVehicles, setDailyTrafficVehicles] = useState(asset.profiling.dailyTrafficVehicles);
  const [trafficDirection, setTrafficDirection] = useState(asset.profiling.trafficDirection);
  const [primaryImage, setPrimaryImage] = useState<string>(asset.imageUrl);
  const [nightImage, setNightImage] = useState<string | undefined>(asset.nightImageUrl);
  const [galleryImages, setGalleryImages] = useState<string[]>(
    asset.galleryImages || [asset.imageUrl]
  );
  const [error, setError] = useState<string>('');

  const handleCityChange = (newCity: City) => {
    setCity(newCity);
  };

  const handleVendorRateChange = (val: string) => {
    setVendorRatePkr(val === '' ? '' : Number(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vendorRatePkr === '' || Number(vendorRatePkr) <= 0) {
      setError('Vendor Rate is required. Please manually enter a positive vendor cost rate.');
      return;
    }
    if (blazeRatePkr === '' || Number(blazeRatePkr) <= 0) {
      setError('Blaze Rate is required. Please manually enter a positive Blaze rate.');
      return;
    }
    if (Number(blazeRatePkr) >= Number(vendorRatePkr)) {
      setError('Rate Error: Blaze rate must always be lower than the vendor rate. Please adjust the rates before saving.');
      return;
    }

    const cityMeta = getPakistanCityMeta(city);
    // If city changed from original, update coordinates
    const coordinates =
      city !== asset.city
        ? {
            lat: cityMeta.lat + (Math.random() - 0.5) * 0.02,
            lng: cityMeta.lng + (Math.random() - 0.5) * 0.02,
          }
        : asset.coordinates;

    const updated: MediaAsset = {
      ...asset,
      title: title.trim(),
      vendor: vendor.trim(),
      city,
      area: area.trim(),
      type,
      dimensions: {
        widthFt,
        heightFt,
        totalSqFt: widthFt * heightFt,
      },
      illumination,
      cost: {
        ...asset.cost,
        monthlyRentalPkr: Number(blazeRatePkr),
        vendorRatePkr: Number(vendorRatePkr),
        blazeRatePkr: Number(blazeRatePkr),
        taxRatePercent: cityMeta.taxRatePercent || asset.cost.taxRatePercent,
      },
      status,
      currentBrandOccupant: status === 'Occupied' ? currentBrandOccupant : undefined,
      imageUrl: primaryImage,
      nightImageUrl: nightImage,
      galleryImages: galleryImages.length > 0 ? galleryImages : [primaryImage],
      profiling: {
        ...asset.profiling,
        secCategory,
        dailyTrafficVehicles,
        dailyGrossImpressions: Math.round(dailyTrafficVehicles * 2.2),
        trafficDirection,
      },
      coordinates,
      authorityNoc: asset.authorityNoc,
    };

    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(asset);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
              <Edit3 className="w-3.5 h-3.5 text-slate-950" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Administrator Asset Management</span>
                <span className="font-mono text-amber-400 text-xs font-normal">
                  ({asset.code})
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Modify master specifications, commercial pricing, and availability
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Vendor Network
              </label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                {vendorList.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                City Hub (All Pakistan)
              </label>
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value as City)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                {Object.entries(CITIES_BY_PROVINCE).map(([province, cities]) => (
                  <optgroup key={province} label={`--- ${province} ---`}>
                    {cities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} {c.tier === 1 ? '★ (Metro)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Format Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MediaType)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-medium"
              >
                <option value="Billboard">Billboard</option>
                <option value="Digital Screen">Digital Screen</option>
                <option value="Unipole">Unipole</option>
                <option value="Digital SMD Screen">Digital SMD Screen</option>
                <option value="Bridge Panel">Bridge Panel</option>
                <option value="Gantry">Gantry</option>
                <option value="Cantilever">Cantilever</option>
                <option value="Building Wrap">Building Wrap</option>
                <option value="Metro Bus Shelter">Metro Bus Shelter</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              Site Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              Location Area / Road Landmark
            </label>
            <input
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Width (Ft)
              </label>
              <input
                type="number"
                min={5}
                value={widthFt}
                onChange={(e) => setWidthFt(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Height (Ft)
              </label>
              <input
                type="number"
                min={4}
                value={heightFt}
                onChange={(e) => setHeightFt(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Total Area
              </label>
              <div className="py-1.5 px-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-amber-400 font-bold">
                {widthFt * heightFt} sqft
              </div>
            </div>
          </div>

          {/* Outdoor Media Site Photography Upload & Management */}
          <AssetImageUploader
            currentType={type}
            primaryImage={primaryImage}
            nightImage={nightImage}
            galleryImages={galleryImages}
            onChange={({ primaryImage: pImg, nightImage: nImg, galleryImages: gImgs }) => {
              setPrimaryImage(pImg);
              setNightImage(nImg);
              if (gImgs) setGalleryImages(gImgs);
            }}
          />

          {/* Commercial Rates: Vendor Rate and Blaze Rate (Required) */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Commercial Rates (Required)
              </span>
              {typeof blazeRatePkr === 'number' && typeof vendorRatePkr === 'number' && blazeRatePkr > 0 && vendorRatePkr > 0 && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      blazeRatePkr < vendorRatePkr
                        ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
                        : 'bg-red-950/70 text-red-400 border-red-800/60'
                    }`}
                  >
                    {blazeRatePkr < vendorRatePkr
                      ? `Valid Rate Structure: Blaze (₨ ${blazeRatePkr.toLocaleString('en-PK')}) < Vendor (₨ ${vendorRatePkr.toLocaleString('en-PK')})`
                      : 'Error: Blaze Rate must be strictly lower than Vendor Rate'}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="p-2.5 rounded bg-red-950/80 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 font-medium block mb-1">
                  Vendor Rate (PKR) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[11px]">
                    ₨
                  </span>
                  <input
                    type="number"
                    required
                    step="any"
                    min={1}
                    placeholder=""
                    value={vendorRatePkr === '' ? '' : vendorRatePkr}
                    onChange={(e) => handleVendorRateChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded pl-7 pr-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Net cost payable to site concessionaire / vendor
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-medium block mb-1">
                  Blaze Rate (PKR) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[11px]">
                    ₨
                  </span>
                  <input
                    type="number"
                    required
                    step="any"
                    min={1}
                    placeholder=""
                    value={blazeRatePkr === '' ? '' : blazeRatePkr}
                    onChange={(e) => setBlazeRatePkr(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded pl-7 pr-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Must always be lower than Vendor Rate
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Availability Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AssetStatus)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Illumination
                </label>
                <select
                  value={illumination}
                  onChange={(e) => setIllumination(e.target.value as IlluminationType)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="Frontlit">Frontlit</option>
                  <option value="Digital SMD">Digital SMD</option>
                  <option value="Backlit">Backlit</option>
                  <option value="Non-lit">Non-lit</option>
                </select>
              </div>
            </div>
          </div>

          {status === 'Occupied' && (
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Current Brand Occupant
              </label>
              <input
                type="text"
                placeholder="e.g. Meezan Bank - Premier Islamic Banking"
                value={currentBrandOccupant}
                onChange={(e) => setCurrentBrandOccupant(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                SEC Class
              </label>
              <select
                value={secCategory}
                onChange={(e) => setSecCategory(e.target.value as SECCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono font-bold"
              >
                <option value="A+">Class A+</option>
                <option value="A">Class A</option>
                <option value="B">Class B</option>
                <option value="C">Class C</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Daily Traffic (Vehicles)
              </label>
              <input
                type="number"
                step={10000}
                value={dailyTrafficVehicles}
                onChange={(e) => setDailyTrafficVehicles(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              Traffic Sightline Direction
            </label>
            <input
              type="text"
              value={trafficDirection}
              onChange={(e) => setTrafficDirection(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 font-semibold rounded text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Asset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
