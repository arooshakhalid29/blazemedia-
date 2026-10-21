import React from 'react';
import {
  Users,
  TrendingUp,
  BarChart,
  PieChart,
  Car,
  Eye,
  Clock,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { MediaAsset, Currency } from '../../types/mediaAsset';
import { formatCurrency, formatNumberCompact, calculateCPM } from '../../utils/formatters';

interface AudienceAnalyticsViewProps {
  assets: MediaAsset[];
  currency: Currency;
  onSelectAssetForDetails: (asset: MediaAsset) => void;
}

export const AudienceAnalyticsView: React.FC<AudienceAnalyticsViewProps> = ({
  assets,
  currency,
  onSelectAssetForDetails,
}) => {
  // Aggregate Metrics
  const totalAssets = assets.length;
  const totalDailyTraffic = assets.reduce(
    (sum, a) => sum + a.profiling.dailyTrafficVehicles,
    0
  );
  const totalDailyGrossImpressions = assets.reduce(
    (sum, a) => sum + a.profiling.dailyGrossImpressions,
    0
  );
  const totalMonthlyRentalBudget = assets.reduce(
    (sum, a) => sum + a.cost.monthlyRentalPkr,
    0
  );
  const averageMonthlyRental =
    totalAssets > 0 ? totalMonthlyRentalBudget / totalAssets : 0;
  const averageDwellTime =
    totalAssets > 0
      ? Math.round(
          assets.reduce((sum, a) => sum + a.profiling.dwellTimeSec, 0) /
            totalAssets
        )
      : 0;

  // Average CPM calculation
  const overallMonthlyImpressions = totalDailyGrossImpressions * 30;
  const overallCpmPkr =
    overallMonthlyImpressions > 0
      ? (totalMonthlyRentalBudget / overallMonthlyImpressions) * 1000
      : 0;

  // SEC Breakdown
  const secCounts = assets.reduce(
    (acc, a) => {
      acc[a.profiling.secCategory] = (acc[a.profiling.secCategory] || 0) + 1;
      return acc;
    },
    { 'A+': 0, A: 0, B: 0, C: 0 } as Record<string, number>
  );

  // Media Type Breakdown
  const typeStats = assets.reduce((acc, a) => {
    if (!acc[a.type]) {
      acc[a.type] = { count: 0, totalRent: 0, totalImpressions: 0 };
    }
    acc[a.type].count += 1;
    acc[a.type].totalRent += a.cost.monthlyRentalPkr;
    acc[a.type].totalImpressions += a.profiling.dailyGrossImpressions * 30;
    return acc;
  }, {} as Record<string, { count: number; totalRent: number; totalImpressions: number }>);

  // City Breakdown
  const cityStats = assets.reduce((acc, a) => {
    if (!acc[a.city]) {
      acc[a.city] = { count: 0, traffic: 0, rent: 0 };
    }
    acc[a.city].count += 1;
    acc[a.city].traffic += a.profiling.dailyTrafficVehicles;
    acc[a.city].rent += a.cost.monthlyRentalPkr;
    return acc;
  }, {} as Record<string, { count: number; traffic: number; rent: number }>);

  // Status Breakdown
  const availableCount = assets.filter((a) => a.status === 'Available').length;
  const occupiedCount = assets.filter((a) => a.status === 'Occupied').length;
  const reservedCount = assets.filter((a) => a.status === 'Reserved').length;
  const occupancyRate =
    totalAssets > 0 ? Math.round(((occupiedCount + reservedCount) / totalAssets) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/60 select-none text-xs space-y-6">
      {/* Top Headline Intelligence Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Daily Gross Impressions */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Daily Gross Reach
            </span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono font-bold text-slate-100 text-xl tabular-nums">
            {formatNumberCompact(totalDailyGrossImpressions)}
            <span className="text-xs text-slate-400 font-normal ml-1">eyes/day</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            ~{formatNumberCompact(totalDailyGrossImpressions * 30)} monthly impressions
          </p>
        </div>

        {/* Metric 2: Daily Vehicular Traffic */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Daily Traffic Flow
            </span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-mono font-bold text-slate-100 text-xl tabular-nums">
            {formatNumberCompact(totalDailyTraffic)}
            <span className="text-xs text-slate-400 font-normal ml-1">vehicles/day</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            Across {totalAssets} prime corridors
          </p>
        </div>

        {/* Metric 3: Network CPM Efficiency */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Blaze CPM Index
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono font-bold text-slate-100 text-xl tabular-nums">
            ₨ {overallCpmPkr.toFixed(1)}
            <span className="text-xs text-slate-400 font-normal ml-1">per 1,000</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-1 font-mono">
            Highly competitive vs TV & Digital Ads
          </p>
        </div>

        {/* Metric 4: Inventory Occupancy Rate */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Occupancy Yield
            </span>
            <CheckCircle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-mono font-bold text-slate-100 text-xl tabular-nums">
            {occupancyRate}%
            <span className="text-xs text-slate-400 font-normal ml-1">booked/reserved</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            {availableCount} prime locations ready for booking
          </p>
        </div>
      </div>

      {/* Row 2: SEC Demographic Profiling & CPM Format Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SEC Audience Segmentation Card */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Socio-Economic Class (SEC) Profiling
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Target Audience Affinity
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Distribution of outdoor media inventory based on surrounding demographic purchasing power, high-net-worth residency, corporate offices, and luxury retail hubs.
          </p>

          <div className="space-y-3 pt-2">
            {Object.entries(secCounts).map(([sec, count]) => {
              const pct = totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0;
              return (
                <div key={sec} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      <span className="font-mono text-amber-400 font-bold">SEC {sec}</span>
                      <span className="text-slate-400 font-normal text-[11px]">
                        {sec === 'A+'
                          ? 'Elite / Top Executives / C-Suite / Luxury'
                          : sec === 'A'
                          ? 'Upper Middle / Business Owners / Banking'
                          : sec === 'B'
                          ? 'Middle Management / High-Frequency Retail'
                          : 'Mass Urban Commuters'}
                      </span>
                    </span>
                    <span className="font-mono text-slate-300">
                      {count} sites ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sec === 'A+'
                          ? 'bg-amber-400'
                          : sec === 'A'
                          ? 'bg-blue-400'
                          : sec === 'B'
                          ? 'bg-emerald-400'
                          : 'bg-purple-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Media Format & CPM Comparison Card */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <BarChart className="w-4 h-4 text-emerald-400" />
              Format Performance & CPM Benchmark
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Cost Per 1,000 Reach</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Cost-effectiveness analysis comparing high-impact digital SMD screens, arterial unipoles, and overhead bridge fascias across Pakistan.
          </p>

          <div className="space-y-2.5 pt-1">
            {Object.entries(typeStats).map(([type, stats]) => {
              const cpm =
                stats.totalImpressions > 0
                  ? (stats.totalRent / stats.totalImpressions) * 1000
                  : 0;
              return (
                <div
                  key={type}
                  className="p-2.5 bg-slate-950/60 rounded border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-slate-200 block text-xs">{type}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {stats.count} units · Avg {formatCurrency(Math.round(stats.totalRent / stats.count), currency)}/mo
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      ₨ {cpm.toFixed(1)} CPM
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {formatNumberCompact(stats.totalImpressions / 30)}/day eyes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: City Hubs Traffic & Revenue Potential */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            Regional City Hub Distribution & Vehicular Volume
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Traffic Aggregates</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(cityStats).map(([city, data]) => {
            return (
              <div
                key={city}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-md space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">{city}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono text-[10px] border border-slate-800">
                    {data.count} Prime Sites
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Total Traffic:</span>
                  <span className="font-mono font-bold text-slate-100">
                    {formatNumberCompact(data.traffic)} vehicles/day
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Monthly Inventory Value:</span>
                  <span className="font-mono font-medium text-amber-300">
                    {formatCurrency(data.rent, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
