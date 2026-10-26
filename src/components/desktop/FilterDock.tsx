import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  MapPin,
  Layers,
  Sparkles,
  Maximize2,
  DollarSign,
  Users,
  ShieldCheck,
  CheckCircle2,
  Search,
  X,
  ExternalLink,
  Check,
} from 'lucide-react';
import {
  City,
  MediaType,
  IlluminationType,
  SECCategory,
  AssetStatus,
  FilterState,
  Currency,
} from '../../types/mediaAsset';
import { formatCurrency } from '../../utils/formatters';
import {
  PAKISTAN_CITIES_DATA,
  PAKISTAN_PROVINCES,
  TIER_1_METROS,
  ProvinceName,
} from '../../data/pakistanCities';
import { PakistanCitiesModal } from '../modals/PakistanCitiesModal';

const ALL_TYPES: MediaType[] = [
  'Billboard',
  'Digital Screen',
  'Unipole',
  'Digital SMD Screen',
  'Bridge Panel',
  'Gantry',
  'Cantilever',
  'Building Wrap',
  'Metro Bus Shelter',
];

const ALL_ILLUMINATIONS: IlluminationType[] = [
  'Digital SMD',
  'Frontlit',
  'Backlit',
  'Non-lit',
];

const ALL_SECS: SECCategory[] = ['A+', 'A', 'B', 'C'];

const ALL_STATUSES: AssetStatus[] = ['Available', 'Occupied', 'Reserved'];

const TARGET_DEMOGRAPHICS_LIST = [
  'All Demographics',
  'Corporate Executives',
  'High Net Worth',
  'Luxury Shoppers',
  'Daily Commuters',
  'Diplomats',
  'University Students',
];

interface FilterDockProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  cityCounts: Record<string, number>;
  typeCounts: Record<MediaType, number>;
  vendorCounts: Record<string, number>;
  availableVendors: string[];
  currency: Currency;
  totalFilteredCount: number;
  onOpenCitiesModal?: () => void;
  onOpenManageVendors?: () => void;
}

export const FilterDock: React.FC<FilterDockProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  cityCounts,
  typeCounts,
  vendorCounts,
  availableVendors,
  currency,
  totalFilteredCount,
  onOpenCitiesModal,
  onOpenManageVendors,
}) => {
  const [isCityModalOpen, setIsCityModalOpen] = useState<boolean>(false);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [selectedProvinceTab, setSelectedProvinceTab] = useState<ProvinceName>('All Provinces');

  const toggleCity = (city: City) => {
    const exists = filters.selectedCities.includes(city);
    const updated = exists
      ? filters.selectedCities.filter((c) => c !== city)
      : [...filters.selectedCities, city];
    onFilterChange({ selectedCities: updated });
  };

  const handleSelectTier1Metros = () => {
    onFilterChange({ selectedCities: TIER_1_METROS });
  };

  const handleClearCities = () => {
    onFilterChange({ selectedCities: [] });
  };

  const handleSelectAllFiltered = () => {
    const names = displayedCities.map((c) => c.name);
    const combined = Array.from(new Set([...filters.selectedCities, ...names]));
    onFilterChange({ selectedCities: combined });
  };

  // Filter cities for the dock view
  const displayedCities = useMemo(() => {
    let list = PAKISTAN_CITIES_DATA;
    if (selectedProvinceTab !== 'All Provinces') {
      list = list.filter((c) => c.province === selectedProvinceTab);
    }
    if (citySearchQuery.trim()) {
      const q = citySearchQuery.toLowerCase().trim();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q) ||
        (c.division && c.division.toLowerCase().includes(q))
      );
    }

    // Sort: Selected cities first, then cities with inventory, then Tier 1, then alphabetical
    return [...list].sort((a, b) => {
      const aSel = filters.selectedCities.includes(a.name);
      const bSel = filters.selectedCities.includes(b.name);
      if (aSel !== bSel) return aSel ? -1 : 1;

      const aCount = cityCounts[a.name] || 0;
      const bCount = cityCounts[b.name] || 0;
      if (aCount !== bCount) return bCount - aCount;

      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    });
  }, [selectedProvinceTab, citySearchQuery, cityCounts, filters.selectedCities]);

  const toggleVendor = (vendor: string) => {
    const exists = filters.selectedVendors.includes(vendor);
    const updated = exists
      ? filters.selectedVendors.filter((v) => v !== vendor)
      : [...filters.selectedVendors, vendor];
    onFilterChange({ selectedVendors: updated });
  };

  const toggleType = (type: MediaType) => {
    const exists = filters.selectedTypes.includes(type);
    const updated = exists
      ? filters.selectedTypes.filter((t) => t !== type)
      : [...filters.selectedTypes, type];
    onFilterChange({ selectedTypes: updated });
  };

  const toggleIllumination = (illumination: IlluminationType) => {
    const exists = filters.selectedIlluminations.includes(illumination);
    const updated = exists
      ? filters.selectedIlluminations.filter((i) => i !== illumination)
      : [...filters.selectedIlluminations, illumination];
    onFilterChange({ selectedIlluminations: updated });
  };

  const toggleSEC = (sec: SECCategory) => {
    const exists = filters.selectedSECs.includes(sec);
    const updated = exists
      ? filters.selectedSECs.filter((s) => s !== sec)
      : [...filters.selectedSECs, sec];
    onFilterChange({ selectedSECs: updated });
  };

  const toggleStatus = (status: AssetStatus) => {
    const exists = filters.selectedStatuses.includes(status);
    const updated = exists
      ? filters.selectedStatuses.filter((s) => s !== status)
      : [...filters.selectedStatuses, status];
    onFilterChange({ selectedStatuses: updated });
  };

  return (
    <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full overflow-hidden shrink-0 select-none text-xs">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          <span>Inventory Filters</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">
            {totalFilteredCount} matching
          </span>
          <button
            onClick={onResetFilters}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
            title="Reset all filter parameters"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Filter Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-300">
        {/* Availability Status */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between mb-2">
            <span>Availability Status</span>
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded border border-slate-800">
            {ALL_STATUSES.map((status) => {
              const active = filters.selectedStatuses.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`py-1 text-[11px] rounded transition-colors text-center font-medium ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location (All Pakistan Cities & Provinces) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-amber-400" /> All Pakistan Cities
            </label>
            {filters.selectedCities.length > 0 && (
              <span className="text-[10px] text-amber-400 font-mono font-semibold">
                {filters.selectedCities.length} selected
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => {
                if (onOpenCitiesModal) {
                  onOpenCitiesModal();
                } else {
                  setIsCityModalOpen(true);
                }
              }}
              className="px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
              title="Open full interactive Pakistan city selector with all provinces"
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              <span>Browse All ({PAKISTAN_CITIES_DATA.length})</span>
            </button>
            <button
              type="button"
              onClick={handleSelectTier1Metros}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
              title="Quick select Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Gwadar, Gujranwala, Sialkot, Hyderabad"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Tier 1 Metros</span>
            </button>
          </div>

          {/* Inline City Search */}
          <div className="relative mb-2">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 70+ Pakistan cities..."
              value={citySearchQuery}
              onChange={(e) => setCitySearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded pl-7 pr-6 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
            {citySearchQuery && (
              <button
                type="button"
                onClick={() => setCitySearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Province Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2 scrollbar-none text-[10px]">
            {PAKISTAN_PROVINCES.map((prov) => {
              const active = selectedProvinceTab === prov;
              const shortLabel =
                prov === 'All Provinces'
                  ? 'All'
                  : prov === 'Islamabad Capital Territory'
                  ? 'ICT'
                  : prov === 'Khyber Pakhtunkhwa'
                  ? 'KP'
                  : prov === 'Azad Kashmir'
                  ? 'AJK'
                  : prov === 'Gilgit-Baltistan'
                  ? 'GB'
                  : prov;
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setSelectedProvinceTab(prov)}
                  className={`px-2 py-0.5 rounded shrink-0 transition-colors ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={prov}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>

          {/* Selected Cities Badges */}
          {filters.selectedCities.length > 0 && (
            <div className="p-1.5 mb-2 bg-slate-950/60 border border-slate-800 rounded max-h-20 overflow-y-auto space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Active Filters:</span>
                <button
                  type="button"
                  onClick={handleClearCities}
                  className="text-amber-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.selectedCities.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded px-1.5 py-0.5 text-[10px]"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => toggleCity(c)}
                      className="hover:text-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Select All Filtered / Count */}
          <div className="flex items-center justify-between mb-1 text-[10px] text-slate-500">
            <span>Showing {displayedCities.length} cities</span>
            {displayedCities.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                + Select all {displayedCities.length}
              </button>
            )}
          </div>

          {/* Scrollable City List with Checkboxes, Province & Inventory */}
          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5 border border-slate-800/80 rounded p-1 bg-slate-950/30">
            {displayedCities.length === 0 ? (
              <div className="py-4 text-center text-slate-500 text-[11px]">
                No cities found matching "{citySearchQuery}"
              </div>
            ) : (
              displayedCities.map((city) => {
                const checked = filters.selectedCities.includes(city.name);
                const count = cityCounts[city.name] || 0;
                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => toggleCity(city.name)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded border text-left transition-colors ${
                      checked
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-medium'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate mr-1">
                      <span
                        className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center text-[9px] shrink-0 ${
                          checked
                            ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {checked && '✓'}
                      </span>
                      <span className="truncate text-[11px]">{city.name}</span>
                      {city.tier === 1 && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 shrink-0 font-mono">
                          T1
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 text-[10px]">
                      <span className="text-[9px] text-slate-500 font-mono">
                        {city.province.slice(0, 3).toUpperCase()}
                      </span>
                      {count > 0 ? (
                        <span className="font-mono px-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {count}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-600">0</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Media Concessionaire / Vendor Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-slate-400" /> Vendor Network
            </span>
            <div className="flex items-center gap-2">
              {onOpenManageVendors && (
                <button
                  onClick={onOpenManageVendors}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                  title="Manage Vendor Directory (Add, Edit, Delete)"
                >
                  Manage
                </button>
              )}
              {filters.selectedVendors.length > 0 && (
                <span className="text-[10px] text-amber-400 font-mono">
                  {filters.selectedVendors.length} selected
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            {availableVendors.map((vendor) => {
              const checked = filters.selectedVendors.includes(vendor);
              const count = vendorCounts[vendor] || 0;
              return (
                <button
                  key={vendor}
                  onClick={() => toggleVendor(vendor)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-left transition-colors ${
                    checked
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-medium'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center text-[10px] shrink-0 ${
                        checked
                          ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {checked && '✓'}
                    </span>
                    <span className="truncate">{vendor}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Media Asset Types */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-slate-400" /> Media Format
            </span>
            {filters.selectedTypes.length > 0 && (
              <span className="text-[10px] text-amber-400 font-mono">
                {filters.selectedTypes.length}
              </span>
            )}
          </label>
          <div className="space-y-1">
            {ALL_TYPES.map((type) => {
              const checked = filters.selectedTypes.includes(type);
              const count = typeCounts[type] || 0;
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-colors ${
                    checked
                      ? 'bg-slate-800 text-amber-400 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-xs border flex items-center justify-center text-[9px] ${
                        checked
                          ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-950'
                      }`}
                    >
                      {checked && '✓'}
                    </span>
                    <span className="truncate max-w-[170px]">{type}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Illumination */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-slate-400" /> Illumination Technology
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_ILLUMINATIONS.map((illumination) => {
              const active = filters.selectedIlluminations.includes(illumination);
              return (
                <button
                  key={illumination}
                  onClick={() => toggleIllumination(illumination)}
                  className={`px-2 py-1.5 rounded border text-left text-[11px] transition-colors truncate ${
                    active
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {illumination}
                </button>
              );
            })}
          </div>
        </div>

        {/* Size & Area (Sq. Ft.) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <Maximize2 className="w-3 h-3 text-slate-400" /> Min Area (Sq. Ft.)
            </label>
            <span className="font-mono text-amber-400 text-[11px] font-semibold">
              {filters.minAreaSqFt.toLocaleString()} sqft
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={4000}
            step={100}
            value={filters.minAreaSqFt}
            onChange={(e) =>
              onFilterChange({ minAreaSqFt: Number(e.target.value) })
            }
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>Any (0)</span>
            <span>1,000 sqft</span>
            <span>4,000+ sqft</span>
          </div>
        </div>

        {/* Monthly Cost Range */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-slate-400" /> Max Monthly Rental
            </label>
            <span className="font-mono text-amber-400 text-[11px] font-semibold">
              {formatCurrency(filters.maxMonthlyCostPkr, currency)}
            </span>
          </div>
          <input
            type="range"
            min={500000}
            max={4500000}
            step={100000}
            value={filters.maxMonthlyCostPkr}
            onChange={(e) =>
              onFilterChange({ maxMonthlyCostPkr: Number(e.target.value) })
            }
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>₨ 5 Lac</span>
            <span>₨ 25 Lac</span>
            <span>₨ 45 Lac+</span>
          </div>
        </div>

        {/* Audience Profiling: SEC Class */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-slate-400" /> SEC Classification
            </span>
            <span className="text-[10px] text-slate-500">Target Socio-Economic</span>
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded border border-slate-800">
            {ALL_SECS.map((sec) => {
              const active = filters.selectedSECs.includes(sec);
              return (
                <button
                  key={sec}
                  onClick={() => toggleSEC(sec)}
                  className={`py-1 text-[11px] font-mono font-semibold rounded text-center transition-colors ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audience Profiling: Daily Traffic Volume */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between mb-1.5">
            <span>Min Daily Vehicular Traffic</span>
            <span className="text-amber-400 font-mono text-[11px]">
              {filters.minDailyTraffic > 0
                ? `${(filters.minDailyTraffic / 1000).toFixed(0)}k+ /day`
                : 'All'}
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[0, 150000, 250000, 350000].map((traffic) => (
              <button
                key={traffic}
                onClick={() => onFilterChange({ minDailyTraffic: traffic })}
                className={`py-1 rounded border text-[10px] font-mono transition-colors ${
                  filters.minDailyTraffic === traffic
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {traffic === 0 ? 'Any' : `${traffic / 1000}k`}
              </button>
            ))}
          </div>
        </div>

        {/* Target Demographic Focus */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Users className="w-3 h-3 text-slate-400" /> Audience Demographic
          </label>
          <select
            value={filters.selectedDemographic}
            onChange={(e) =>
              onFilterChange({ selectedDemographic: e.target.value })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
          >
            {TARGET_DEMOGRAPHICS_LIST.map((demo) => (
              <option key={demo} value={demo === 'All Demographics' ? '' : demo}>
                {demo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pakistan Nationwide Cities Full Selector Modal (fallback when not parent managed) */}
      {!onOpenCitiesModal && isCityModalOpen && (
        <PakistanCitiesModal
          isOpen={isCityModalOpen}
          onClose={() => setIsCityModalOpen(false)}
          selectedCities={filters.selectedCities}
          onApplySelection={(newCities) => onFilterChange({ selectedCities: newCities })}
          cityCounts={cityCounts}
        />
      )}
    </aside>
  );
};
