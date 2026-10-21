import React from 'react';
import { Database, Eye, Car, ShoppingCart, Clock, ShieldCheck, User } from 'lucide-react';
import { Currency, UserAccount } from '../../types/mediaAsset';
import { formatCurrency, formatNumberCompact } from '../../utils/formatters';

interface WindowsStatusBarProps {
  filteredCount: number;
  totalCount: number;
  totalDailyTraffic: number;
  totalDailyImpressions: number;
  cartItemCount: number;
  cartMonthlyTotal: number;
  currency: Currency;
  onOpenCartModal: () => void;
  currentUser?: UserAccount;
  onOpenLoginModal?: () => void;
  isDbConnected?: boolean;
}

export const WindowsStatusBar: React.FC<WindowsStatusBarProps> = ({
  filteredCount,
  totalCount,
  totalDailyTraffic,
  totalDailyImpressions,
  cartItemCount,
  cartMonthlyTotal,
  currency,
  onOpenCartModal,
  currentUser,
  onOpenLoginModal,
  isDbConnected = true,
}) => {
  return (
    <footer className="h-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-3 select-none text-[11px] text-slate-400 font-mono shrink-0 z-30">
      {/* Left: Inventory Count & Database Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Database className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-bold">Firestore DB:</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-200 font-semibold">{filteredCount}</span>
          <span>of</span>
          <span>{totalCount} sites listed</span>
        </div>

        <div className="hidden md:flex items-center gap-1 text-slate-500">
          <span>|</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Car className="w-3 h-3 text-blue-400" />
            {formatNumberCompact(totalDailyTraffic)} vehicles/day
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-slate-500">
          <span>|</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Eye className="w-3 h-3 text-amber-400" />
            {formatNumberCompact(totalDailyImpressions)} daily gross reach
          </span>
        </div>
      </div>

      {/* Right: Media Plan Cart Summary, User Account & System Clock */}
      <div className="flex items-center gap-3">
        {currentUser && (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Active Authentication Session"
          >
            {currentUser.role === 'administrator' ? (
              <ShieldCheck className="w-3 h-3 text-amber-400" />
            ) : (
              <User className="w-3 h-3 text-blue-400" />
            )}
            <span className="hidden sm:inline text-slate-400">User:</span>
            <span className={currentUser.role === 'administrator' ? 'text-amber-400 font-semibold' : 'text-blue-400 font-semibold'}>
              {currentUser.name}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono">
              {currentUser.role === 'administrator' ? 'Admin' : 'Client'}
            </span>
          </button>
        )}

        <div className="h-3 w-px bg-slate-800" />

        {cartItemCount > 0 ? (
          <button
            onClick={onOpenCartModal}
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            <ShoppingCart className="w-3 h-3" />
            <span>
              {cartItemCount} sites in plan ({formatCurrency(cartMonthlyTotal, currency)}/mo)
            </span>
          </button>
        ) : (
          <span className="text-slate-500">Proposal Cart Empty</span>
        )}

        <div className="h-3 w-px bg-slate-800" />

        <div className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>PKT (UTC+5)</span>
        </div>
      </div>
    </footer>
  );
};
