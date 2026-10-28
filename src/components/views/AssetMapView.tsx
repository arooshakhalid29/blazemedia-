import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Layers,
  Eye,
  Plus,
  Check,
  Compass,
  Navigation,
  Sparkles,
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { MediaAsset, City, Currency } from '../../types/mediaAsset';
import { formatCurrency, formatNumberCompact } from '../../utils/formatters';
import {
  PAKISTAN_CITIES_DATA,
  PAKISTAN_PROVINCES,
  ProvinceName,
  TIER_1_METROS,
  getPakistanCityMeta,
} from '../../data/pakistanCities';

interface AssetMapViewProps {
  assets: MediaAsset[];
  selectedAssetIdsInCart: Set<string>;
  onToggleCartItem: (asset: MediaAsset) => void;
  onSelectAssetForDetails: (asset: MediaAsset) => void;
  currency: Currency;
}

// Normalized coordinate bounds for complete Pakistan outdoor map projection
// Lat: ~23.5 (Sindh Coast / Karachi) to ~37.0 (Hunza / Gilgit-Baltistan)
// Lng: ~61.0 (Gwadar / Balochistan) to ~76.5 (Skardu / Kashmir)
const MIN_LAT = 23.5;
const MAX_LAT = 37.0;
const MIN_LNG = 61.0;
const MAX_LNG = 76.5;

function projectToCanvas(lat: number, lng: number) {
  // SVG viewBox 0 0 1000 800
  // Invert Lat because SVG y goes down
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 880 + 60;
  const y = (1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 680 + 60;
  return { x, y };
}

export const AssetMapView: React.FC<AssetMapViewProps> = ({
  assets,
  selectedAssetIdsInCart,
  onToggleCartItem,
  onSelectAssetForDetails,
  currency,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(
    assets.length > 0 ? assets[0] : null
  );
  const [focusedCity, setFocusedCity] = useState<string>('All');
  const [focusedProvince, setFocusedProvince] = useState<ProvinceName>('All Provinces');

  const cityCounts = useMemo(() => {
    return assets.reduce((acc, a) => {
      acc[a.city] = (acc[a.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [assets]);

  // Cities to show in Jump Bar
  const jumpCities = useMemo(() => {
    let list = PAKISTAN_CITIES_DATA;
    if (focusedProvince !== 'All Provinces') {
      list = list.filter((c) => c.province === focusedProvince);
    }
    // Sort: cities with assets first, then tier 1, then alphabetically
    return [...list].sort((a, b) => {
      const aCount = cityCounts[a.name] || 0;
      const bCount = cityCounts[b.name] || 0;
      if (aCount !== bCount) return bCount - aCount;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    });
  }, [focusedProvince, cityCounts]);

  // Filtered assets by focused city / province if selected
  const displayedAssets = useMemo(() => {
    if (focusedCity !== 'All') {
      return assets.filter((a) => a.city === focusedCity);
    }
    if (focusedProvince !== 'All Provinces') {
      return assets.filter((a) => {
        const meta = getPakistanCityMeta(a.city);
        return meta.province === focusedProvince;
      });
    }
    return assets;
  }, [assets, focusedCity, focusedProvince]);

  // Major city hub centers to draw on map
  const mapCityHubs = useMemo(() => {
    // Show Tier 1 Metros + any city that currently has active assets
    const activeCityNames = new Set(assets.map((a) => a.city));
    return PAKISTAN_CITIES_DATA.filter(
      (c) => c.tier === 1 || activeCityNames.has(c.name)
    );
  }, [assets]);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-950 relative select-none text-xs">
      {/* City Jump Bar at Top / Overlay */}
      <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1.5 flex flex-wrap items-center gap-1.5 shadow-xl max-w-4xl">
          <span className="text-[10px] text-amber-400 font-semibold uppercase px-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>Pakistan Navigator:</span>
          </span>

          {/* Province Selector */}
          <select
            value={focusedProvince}
            onChange={(e) => {
              setFocusedProvince(e.target.value as ProvinceName);
              setFocusedCity('All');
            }}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-hidden focus:border-amber-500 font-medium cursor-pointer"
          >
            {PAKISTAN_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setFocusedCity('All');
              setFocusedProvince('All Provinces');
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              focusedCity === 'All' && focusedProvince === 'All Provinces'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Pakistan ({assets.length})
          </button>

          {/* Quick Hub Buttons (top 6 in this view) */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-lg scrollbar-none">
            {jumpCities.slice(0, 7).map((city) => {
              const count = cityCounts[city.name] || 0;
              const isSelected = focusedCity === city.name;
              return (
                <button
                  key={city.name}
                  onClick={() => {
                    setFocusedCity(city.name);
                    const firstInCity = assets.find((a) => a.city === city.name);
                    if (firstInCity) setSelectedAsset(firstInCity);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {city.name}
                  {count > 0 && (
                    <span className="text-[10px] ml-1 opacity-80">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* City Dropdown for Full List of 70+ Cities */}
          <select
            value={focusedCity}
            onChange={(e) => {
              const val = e.target.value;
              setFocusedCity(val);
              if (val !== 'All') {
                const firstInCity = assets.find((a) => a.city === val);
                if (firstInCity) setSelectedAsset(firstInCity);
              }
            }}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-amber-400 font-medium focus:outline-hidden focus:border-amber-500 cursor-pointer ml-1"
          >
            <option value="All">
              {focusedProvince === 'All Provinces' ? 'All Cities' : `All in ${focusedProvince}`}
            </option>
            {jumpCities.map((c) => {
              const count = cityCounts[c.name] || 0;
              return (
                <option key={c.name} value={c.name}>
                  {c.name} {count > 0 ? `(${count} sites)` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Legend */}
        <div className="pointer-events-auto hidden xl:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 shadow-xl">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Digital Screen
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Billboard
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Bridge Panel
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Gantry
          </span>
        </div>
      </div>

      {/* Interactive Pakistan Map Canvas */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden bg-radial from-slate-900 to-slate-950">
        <svg
          viewBox="0 0 1000 800"
          className="w-full h-full max-h-[85vh] object-contain drop-shadow-2xl"
        >
          {/* Subtle Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(51, 65, 85, 0.25)"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="1000" height="800" fill="url(#grid)" />

          {/* Pakistan Simplified Stylized Boundary Silhouette */}
          <path
            d="M 120 620 L 160 580 L 220 540 L 320 520 L 400 480 L 450 420 L 520 380 L 600 350 L 680 280 L 760 160 L 800 120 L 820 160 L 780 250 L 790 320 L 820 400 L 770 470 L 710 520 L 640 590 L 580 620 L 480 680 L 320 720 L 180 700 Z"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* Major Highway Artery Connections */}
          <line x1="280" y1="680" x2="680" y2="440" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <line x1="680" y1="440" x2="720" y2="280" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <line x1="680" y1="440" x2="610" y2="440" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <line x1="610" y1="440" x2="570" y2="520" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />

          {/* City Cluster Hub Markers across Pakistan */}
          {mapCityHubs.map((cityMeta) => {
            const { x, y } = projectToCanvas(cityMeta.lat, cityMeta.lng);
            const count = cityCounts[cityMeta.name] || 0;
            const isCityActive = focusedCity === cityMeta.name;

            // Only show labels for Tier 1 or cities with assets to keep map clean
            if (cityMeta.tier !== 1 && count === 0) return null;

            return (
              <g
                key={cityMeta.name}
                className="cursor-pointer"
                onClick={() => {
                  setFocusedCity(cityMeta.name);
                  const firstInCity = assets.find((a) => a.city === cityMeta.name);
                  if (firstInCity) setSelectedAsset(firstInCity);
                }}
              >
                <circle
                  cx={x}
                  y={y}
                  r={isCityActive ? 30 : count > 0 ? 22 : 16}
                  fill="rgba(245, 158, 11, 0.08)"
                  stroke={isCityActive ? '#f59e0b' : count > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(148, 163, 184, 0.2)'}
                  strokeWidth="1.5"
                  className="transition-all hover:scale-110"
                />
                <circle
                  cx={x}
                  y={y}
                  r={count > 0 ? '5' : '3.5'}
                  fill={isCityActive ? '#f59e0b' : count > 0 ? '#fbbf24' : '#64748b'}
                />
                <text
                  x={x + 10}
                  y={y + 4}
                  fill={isCityActive ? '#fbbf24' : count > 0 ? '#f1f5f9' : '#94a3b8'}
                  fontSize={count > 0 ? '11' : '10'}
                  fontWeight={count > 0 ? '600' : '400'}
                  fontFamily="Plus Jakarta Sans"
                >
                  {cityMeta.name}
                </text>
                {count > 0 && (
                  <text
                    x={x + 10}
                    y={y + 15}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    {count} Sites
                  </text>
                )}
              </g>
            );
          })}

          {/* Outdoor Media Asset Pin Markers */}
          {displayedAssets.map((asset) => {
            // Apply slight geographic offset so pins in same city do not completely overlap
            const { x: baseX, y: baseY } = projectToCanvas(
              asset.coordinates.lat,
              asset.coordinates.lng
            );

            // Compute pseudo-scatter based on ID char codes
            const hash = asset.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            const offsetX = ((hash % 17) - 8) * 4.5;
            const offsetY = (((hash >> 2) % 17) - 8) * 4.5;

            const x = baseX + offsetX;
            const y = baseY + offsetY;

            const isSelected = selectedAsset?.id === asset.id;

            let pinColor = '#3b82f6'; // default Billboard / Unipole blue
            if (asset.type === 'Digital SMD Screen' || asset.type === 'Digital Screen') pinColor = '#f59e0b'; // amber
            else if (asset.type === 'Bridge Panel') pinColor = '#10b981'; // emerald
            else if (asset.type === 'Gantry') pinColor = '#a855f7'; // purple
            else if (asset.type === 'Billboard' || asset.type === 'Unipole') pinColor = '#3b82f6';

            return (
              <g
                key={asset.id}
                className="cursor-pointer group"
                onClick={() => setSelectedAsset(asset)}
              >
                {/* Traffic density glow */}
                <circle
                  cx={x}
                  y={y}
                  r={isSelected ? 16 : 9}
                  fill={pinColor}
                  opacity={isSelected ? 0.35 : 0.15}
                  className="transition-all group-hover:scale-125"
                />

                <circle
                  cx={x}
                  y={y}
                  r={isSelected ? 6 : 4}
                  fill={pinColor}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  className="transition-all"
                />

                {isSelected && (
                  <circle
                    cx={x}
                    y={y}
                    r="8"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Bottom Corner Map Credits */}
        <div className="absolute bottom-3 left-4 text-[10px] text-slate-500 font-mono flex items-center gap-2">
          <span>Projection: WGS84 GeoCoordinate Overlay</span>
          <span>·</span>
          <span>Blaze Media GIS Engine</span>
        </div>
      </div>

      {/* Selected Asset Interactive Side Drawer */}
      {selectedAsset && (
        <aside className="w-full md:w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col justify-between shrink-0 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Header: Code & Availability */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-mono font-bold text-amber-400 text-xs">
                {selectedAsset.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  selectedAsset.status === 'Available'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : selectedAsset.status === 'Occupied'
                    ? 'bg-blue-950 text-blue-300 border-blue-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}
              >
                {selectedAsset.status}
              </span>
            </div>

            {/* Media Image */}
            <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-slate-800">
              <img
                src={selectedAsset.imageUrl}
                alt={selectedAsset.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-medium text-slate-200">
                {selectedAsset.type}
              </div>
            </div>

            {/* Title & Location */}
            <div>
              <h3 className="font-semibold text-slate-100 text-sm leading-snug">
                {selectedAsset.title}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>
                  {selectedAsset.city} · {selectedAsset.area}
                </span>
              </p>
            </div>

            {/* Traffic Direction & Facing */}
            <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Sightline & Traffic Facing:
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">
                {selectedAsset.profiling.trafficDirection}
              </p>
            </div>

            {/* Key Profiling Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Daily Traffic</span>
                <span className="font-mono text-slate-200 font-bold">
                  {formatNumberCompact(selectedAsset.profiling.dailyTrafficVehicles)} vehicles
                </span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Gross Impressions</span>
                <span className="font-mono text-slate-200 font-bold">
                  {formatNumberCompact(selectedAsset.profiling?.dailyGrossImpressions ?? 0)}/day
                </span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Dimensions</span>
                <span className="font-mono text-slate-200 font-bold">
                  {selectedAsset.dimensions?.widthFt ?? 0}×{selectedAsset.dimensions?.heightFt ?? 0} ft
                </span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Audience SEC</span>
                <span className="font-mono text-amber-400 font-bold">
                  Class {selectedAsset.profiling?.secCategory || 'A'}
                </span>
              </div>
            </div>

            {/* Current Occupant (if booked) */}
            {selectedAsset.status === 'Occupied' && selectedAsset.currentBrandOccupant && (
              <div className="p-2.5 bg-blue-950/30 rounded border border-blue-900/60 text-xs">
                <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">
                  Current Campaign Occupant:
                </span>
                <span className="text-blue-200 font-medium block mt-0.5">
                  {selectedAsset.currentBrandOccupant}
                </span>
                {selectedAsset.bookedUntil && (
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    Booked through {selectedAsset.bookedUntil}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Drawer Actions */}
          <div className="pt-4 border-t border-slate-800 space-y-2 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs">Monthly Rental:</span>
              <span className="font-mono font-bold text-slate-100 text-sm">
                {formatCurrency(selectedAsset.cost.monthlyRentalPkr, currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectAssetForDetails(selectedAsset)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Specs</span>
              </button>

              <button
                onClick={() => onToggleCartItem(selectedAsset)}
                className={`py-2 px-3 font-semibold rounded text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  selectedAssetIdsInCart.has(selectedAsset.id)
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {selectedAssetIdsInCart.has(selectedAsset.id) ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>In Media Plan</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
