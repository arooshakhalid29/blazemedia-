import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
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
import unipoleImg from '../../assets/images/unipole_billboard_1790581927863.jpg';
import doohSmdImg from '../../assets/images/dooh_smd_screen_1790581912551.jpg';
import bridgePanelImg from '../../assets/images/bridge_panel_1790581944286.jpg';
import gantryImg from '../../assets/images/gantry_urban_1790581956476.jpg';
import { AssetImageUploader } from '../common/AssetImageUploader';

interface NewAssetModalProps {
  onClose: () => void;
  onAddAsset: (asset: MediaAsset) => void;
  availableVendors?: string[];
}

export const NewAssetModal: React.FC<NewAssetModalProps> = ({
  onClose,
  onAddAsset,
  availableVendors,
}) => {
  const vendorList = availableVendors && availableVendors.length > 0 ? availableVendors : Array.from(STANDARD_VENDORS);
  const [city, setCity] = useState<City>('Karachi');
  const [vendor, setVendor] = useState<string>(vendorList[0] || 'Blaze Media (Pvt) Ltd');
  const [type, setType] = useState<MediaType>('Billboard');
  const [title, setTitle] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [widthFt, setWidthFt] = useState<number>(60);
  const [heightFt, setHeightFt] = useState<number>(20);
  const [illumination, setIllumination] = useState<IlluminationType>('Frontlit');
  const [vendorRatePkr, setVendorRatePkr] = useState<number | ''>('');
  const [blazeRatePkr, setBlazeRatePkr] = useState<number | ''>('');
  const [secCategory, setSecCategory] = useState<SECCategory>('A');
  const [dailyTrafficVehicles, setDailyTrafficVehicles] = useState<number>(250000);
  const [status, setStatus] = useState<AssetStatus>('Available');
  const [trafficDirection, setTrafficDirection] = useState<string>(
    'Arterial traffic heading toward central commercial district'
  );
  const [primaryImage, setPrimaryImage] = useState<string>(unipoleImg);
  const [nightImage, setNightImage] = useState<string | undefined>(undefined);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [hasCustomImage, setHasCustomImage] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleCityChange = (newCity: City) => {
    setCity(newCity);
  };

  const handleVendorRateChange = (val: string) => {
    setVendorRatePkr(val === '' ? '' : Number(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !area.trim()) {
      setError('Please provide a title and location area landmark.');
      return;
    }
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
    const cityPrefix = city.slice(0, 3).toUpperCase();
    const typePrefix =
      type === 'Digital SMD Screen' || type === 'Digital Screen'
        ? 'SMD'
        : type === 'Billboard'
        ? 'BLB'
        : type === 'Bridge Panel'
        ? 'BRG'
        : type === 'Gantry'
        ? 'GNT'
        : type === 'Cantilever'
        ? 'CNT'
        : 'UNP';
    const randNum = Math.floor(100 + Math.random() * 900);
    const code = `${cityPrefix}-${typePrefix}-${randNum}`;

    const defaultImg =
      type === 'Digital SMD Screen' || type === 'Digital Screen'
        ? doohSmdImg
        : type === 'Bridge Panel'
        ? bridgePanelImg
        : type === 'Gantry'
        ? gantryImg
        : unipoleImg;

    const finalImageUrl = primaryImage || defaultImg;

    const newAsset: MediaAsset = {
      id: `BLZ-${code}`,
      code,
      title: title.trim(),
      vendor: vendor.trim() || 'Blaze Media (Pvt) Ltd',
      city,
      area: area.trim(),
      zone: `${city} Central Commercial Corridor`,
      type,
      dimensions: {
        widthFt,
        heightFt,
        totalSqFt: widthFt * heightFt,
      },
      orientation: 'Landscape',
      sides: 2,
      illumination,
      cost: {
        monthlyRentalPkr: Number(blazeRatePkr),
        vendorRatePkr: Number(vendorRatePkr),
        blazeRatePkr: Number(blazeRatePkr),
        productionCostPkr: Math.round(widthFt * heightFt * 80),
        mountingCostPkr: 30000,
        taxRatePercent: cityMeta.taxRatePercent || (cityMeta.province === 'Sindh' ? 13 : 16),
      },
      profiling: {
        secCategory,
        dailyTrafficVehicles,
        dailyGrossImpressions: dailyTrafficVehicles * 2.2,
        dwellTimeSec: 60,
        viewingDistanceMeters: 350,
        trafficDirection,
        targetDemographics: ['Corporate Executives', 'Daily Commuters', 'Shoppers'],
        clutterLevel: 'Low (Solo Prime)',
        peakCongestionHours: '08:30 AM - 11:00 AM & 05:30 PM - 09:00 PM',
        surroundingLandmarks: [area.trim(), 'Commercial Avenue', 'Main Boulevard'],
      },
      coordinates: {
        lat: cityMeta.lat + (Math.random() - 0.5) * 0.02,
        lng: cityMeta.lng + (Math.random() - 0.5) * 0.02,
      },
      status,
      imageUrl: finalImageUrl,
      nightImageUrl: nightImage,
      galleryImages: galleryImages.length > 0 ? galleryImages : [finalImageUrl],
      techSpecs: {
        structureType: type === 'Billboard' ? 'Heavy Uni-structure Monopole' : 'Heavy Galvanized Steel Frame',
        generatorBackup: true,
        generatorKva: 20,
        lightFixtures: illumination === 'Digital SMD' ? 'P4 High-Refresh DOOH SMD Module' : 'High Lumen Weatherproof LED Floodlights',
        foundationType: 'Reinforced Deep Piled Concrete',
      },
      isUserCreated: true,
      createdAt: new Date().toISOString(),
    };

    onAddAsset(newAsset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-sm text-slate-100">
              Register New Outdoor Media Asset
            </h2>
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
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Vendor / Concessionaire
              </label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
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
              <label className="text-[11px] text-slate-300 font-medium block mb-1">
                Media Format Type <span className="text-red-400">*</span>
              </label>
              <select
                value={type}
                required
                onChange={(e) => {
                  const newType = e.target.value as MediaType;
                  setType(newType);
                  if (newType === 'Digital Screen' || newType === 'Digital SMD Screen') {
                    setIllumination('Digital SMD');
                    if (!hasCustomImage) setPrimaryImage(doohSmdImg);
                  } else if (newType === 'Billboard') {
                    setIllumination('Frontlit');
                    if (!hasCustomImage) setPrimaryImage(unipoleImg);
                  } else if (newType === 'Bridge Panel') {
                    if (!hasCustomImage) setPrimaryImage(bridgePanelImg);
                  } else if (newType === 'Gantry') {
                    if (!hasCustomImage) setPrimaryImage(gantryImg);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 font-medium"
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
              Site Title & Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Shahrah-e-Faisal Awami Markaz Flyover High-Impact Unipole"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              Location Area / Road Landmark *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Shahrah-e-Faisal / Nursery"
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
                min={10}
                max={200}
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
                min={5}
                max={100}
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

          {/* Outdoor Media Site Photography Upload */}
          <AssetImageUploader
            currentType={type}
            primaryImage={primaryImage}
            nightImage={nightImage}
            galleryImages={galleryImages}
            onChange={({ primaryImage: pImg, nightImage: nImg, galleryImages: gImgs }) => {
              setPrimaryImage(pImg);
              setNightImage(nImg);
              if (gImgs) setGalleryImages(gImgs);
              setHasCustomImage(true);
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

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Illumination Type
              </label>
              <select
                value={illumination}
                onChange={(e) => setIllumination(e.target.value as IlluminationType)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="Frontlit">Frontlit (Commercial Flood)</option>
                <option value="Digital SMD">Digital SMD Screen</option>
                <option value="Backlit">Backlit Internal LED</option>
                <option value="Non-lit">Non-lit Static</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                SEC Class
              </label>
              <select
                value={secCategory}
                onChange={(e) => setSecCategory(e.target.value as SECCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono font-bold"
              >
                <option value="A+">Class A+ (Luxury / Elite)</option>
                <option value="A">Class A (Corporate / Affluent)</option>
                <option value="B">Class B (Commercial Middle)</option>
                <option value="C">Class C (Mass Commuters)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Daily Traffic (Vehicles)
              </label>
              <input
                type="number"
                step={10000}
                min={20000}
                value={dailyTrafficVehicles}
                onChange={(e) => setDailyTrafficVehicles(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              Traffic Direction & Approach Sightline
            </label>
            <input
              type="text"
              value={trafficDirection}
              onChange={(e) => setTrafficDirection(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors"
            >
              Register Asset to Database
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
