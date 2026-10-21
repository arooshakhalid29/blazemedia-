import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Search,
  X,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Building2,
  Filter,
  RotateCcw,
} from 'lucide-react';
import {
  PAKISTAN_CITIES_DATA,
  CITIES_BY_PROVINCE,
  PAKISTAN_PROVINCES,
  ProvinceName,
  TIER_1_METROS,
} from '../../data/pakistanCities';
import { City } from '../../types/mediaAsset';

interface PakistanCitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCities: City[];
  onApplySelection: (cities: City[]) => void;
  cityCounts: Record<string, number>;
}

export const PakistanCitiesModal: React.FC<PakistanCitiesModalProps> = ({
  isOpen,
  onClose,
  selectedCities,
  onApplySelection,
  cityCounts,
}) => {
  const [tempSelected, setTempSelected] = useState<City[]>(selectedCities);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProvinceTab, setActiveProvinceTab] = useState<ProvinceName>('All Provinces');

  // Synchronize when opened
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedCities);
      setSearchQuery('');
      setActiveProvinceTab('All Provinces');
    }
  }, [isOpen, selectedCities]);

  // Filter provinces and cities based on search and province tab (unconditionally evaluated)
  const filteredProvinces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result: Record<string, typeof PAKISTAN_CITIES_DATA> = {};

    Object.entries(CITIES_BY_PROVINCE).forEach(([province, cities]) => {
      if (activeProvinceTab !== 'All Provinces' && province !== activeProvinceTab) {
        return;
      }

      const matchingCities = cities.filter((city) => {
        if (!query) return true;
        return (
          city.name.toLowerCase().includes(query) ||
          city.province.toLowerCase().includes(query) ||
          (city.division && city.division.toLowerCase().includes(query))
        );
      });

      if (matchingCities.length > 0) {
        result[province] = matchingCities;
      }
    });

    return result;
  }, [searchQuery, activeProvinceTab]);

  const toggleCity = (cityName: string) => {
    setTempSelected((prev) =>
      prev.includes(cityName) ? prev.filter((c) => c !== cityName) : [...prev, cityName]
    );
  };

  const selectAllInProvince = (provinceName: string) => {
    const provinceCities = (CITIES_BY_PROVINCE[provinceName] || []).map((c) => c.name);
    setTempSelected((prev) => Array.from(new Set([...prev, ...provinceCities])));
  };

  const deselectAllInProvince = (provinceName: string) => {
    const provinceCities = new Set(
      (CITIES_BY_PROVINCE[provinceName] || []).map((c) => c.name)
    );
    setTempSelected((prev) => prev.filter((c) => !provinceCities.has(c)));
  };

  const handleSelectTier1 = () => {
    setTempSelected(TIER_1_METROS);
  };

  const handleSelectAll = () => {
    setTempSelected(PAKISTAN_CITIES_DATA.map((c) => c.name));
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  const handleSelectPresets = (preset: 'punjab' | 'sindh' | 'cpec_coastal' | 'kp_north') => {
    if (preset === 'punjab') {
      const punjabCities = (CITIES_BY_PROVINCE['Punjab'] || []).map((c) => c.name);
      setTempSelected(punjabCities);
    } else if (preset === 'sindh') {
      const sindhCities = (CITIES_BY_PROVINCE['Sindh'] || []).map((c) => c.name);
      setTempSelected(sindhCities);
    } else if (preset === 'cpec_coastal') {
      setTempSelected(['Gwadar', 'Karachi', 'Turbat', 'Hub', 'Quetta', 'Pasni']);
    } else if (preset === 'kp_north') {
      setTempSelected(['Peshawar', 'Mardan', 'Abbottabad', 'Mingora', 'Gilgit', 'Islamabad']);
    }
  };

  const handleApply = () => {
    onApplySelection(tempSelected);
    onClose();
  };

  const totalSelectedCount = tempSelected.length;
  const totalAvailableCities = PAKISTAN_CITIES_DATA.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 select-none overflow-hidden text-xs">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Select Pakistan Cities & Territories</span>
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  {totalAvailableCities} Nationwide Cities
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Filter outdoor advertising inventory across all 4 provinces, Islamabad, AJK, and Gilgit-Baltistan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Quick Filter Controls */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search any Pakistani city, province, or division (e.g., Karachi, Gwadar, Peshawar, Swat, Sialkot)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleSelectTier1}
                className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 rounded font-medium text-[11px] transition-colors flex items-center gap-1"
                title="Select all Tier 1 Major Commercial Metros"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Tier 1 Metros ({TIER_1_METROS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresets('punjab')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded text-[11px] transition-colors"
              >
                Punjab All
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresets('sindh')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded text-[11px] transition-colors"
              >
                Sindh All
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresets('cpec_coastal')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded text-[11px] transition-colors"
                title="Gwadar, Karachi, Turbat, Hub, Quetta"
              >
                Coastal & CPEC
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded text-[11px] transition-colors font-medium"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-red-400 border border-slate-700 rounded text-[11px] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Province Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {PAKISTAN_PROVINCES.map((prov) => {
              const active = activeProvinceTab === prov;
              const countInProv =
                prov === 'All Provinces'
                  ? PAKISTAN_CITIES_DATA.length
                  : (CITIES_BY_PROVINCE[prov] || []).length;
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setActiveProvinceTab(prov)}
                  className={`px-2.5 py-1 rounded-md shrink-0 transition-colors font-medium flex items-center gap-1 ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{prov}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded ${
                      active ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {countInProv}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Cities Pill Bar */}
        {tempSelected.length > 0 && (
          <div className="px-5 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto pr-1">
              <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider shrink-0">
                Selected ({tempSelected.length}):
              </span>
              {tempSelected.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded px-2 py-0.5 text-[11px]"
                >
                  <span>{city}</span>
                  <button
                    type="button"
                    onClick={() => toggleCity(city)}
                    className="hover:text-white p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-slate-400 hover:text-amber-400 shrink-0 font-medium"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Cities Grid Organized by Province */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {Object.keys(filteredProvinces).length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <MapPin className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
              <p className="font-medium text-slate-400">No Pakistan cities match "{searchQuery}"</p>
              <p className="text-[11px]">Try searching by city name, province, or district division</p>
            </div>
          ) : (
            Object.entries(filteredProvinces).map(([provinceName, cities]) => {
              const allProvSelected = cities.every((c) => tempSelected.includes(c.name));
              const someProvSelected =
                cities.some((c) => tempSelected.includes(c.name)) && !allProvSelected;

              return (
                <div
                  key={provinceName}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-3"
                >
                  {/* Province Header with Quick Select Actions */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/70">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-xs tracking-wide">
                        {provinceName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {cities.length} cities
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllInProvince(provinceName)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                      >
                        Select All in {provinceName}
                      </button>
                      <span className="text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() => deselectAllInProvince(provinceName)}
                        className="text-[11px] text-slate-400 hover:text-slate-300"
                      >
                        Deselect
                      </button>
                    </div>
                  </div>

                  {/* City Checkbox Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {cities.map((city) => {
                      const isSelected = tempSelected.includes(city.name);
                      const invCount = cityCounts[city.name] || 0;

                      return (
                        <button
                          key={city.name}
                          type="button"
                          onClick={() => toggleCity(city.name)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-medium shadow-xs ring-1 ring-amber-500/30'
                              : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate mr-1.5">
                            <span
                              className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 text-[10px] transition-colors ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                                  : 'bg-slate-950 border-slate-700'
                              }`}
                            >
                              {isSelected && '✓'}
                            </span>
                            <div className="truncate">
                              <span className="block truncate text-xs">{city.name}</span>
                              {city.division && (
                                <span className="block text-[10px] text-slate-500 truncate">
                                  {city.division}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {city.tier === 1 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold" title="Tier 1 Major Metro">
                                T1
                              </span>
                            )}
                            {invCount > 0 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700" title={`${invCount} outdoor sites active`}>
                                {invCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-slate-400 text-xs">
            {totalSelectedCount === 0 ? (
              <span className="text-slate-400">All cities in Pakistan will be displayed</span>
            ) : (
              <span>
                Filtering by{' '}
                <strong className="text-amber-400 font-semibold">{totalSelectedCount}</strong> of{' '}
                {totalAvailableCities} Pakistan cities
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply City Filter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
