import React from 'react';
import {
  LayoutGrid,
  Table as TableIcon,
  MapPin,
  BarChart3,
  ShoppingCart,
  Plus,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
  X,
  RotateCcw,
  Sparkles,
  Lock,
  Calendar,
  ShieldCheck,
  User,
  Users,
  Building2,
} from 'lucide-react';
import { ViewMode, Currency, UserAccount } from '../../types/mediaAsset';

interface DesktopRibbonProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  currency: Currency;
  onCurrencyToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartItemCount: number;
  onOpenCartModal: () => void;
  onOpenNewAssetModal: () => void;
  onOpenExcelImportModal: () => void;
  onExportCsv: () => void;
  isFilterDockOpen: boolean;
  onToggleFilterDock: () => void;
  onResetFilters: () => void;
  filteredCount: number;
  totalCount: number;
  activeFilterCount: number;
  currentUser: UserAccount;
  onOpenLoginModal: (mode?: 'client' | 'administrator' | 'signin') => void;
  onOpenBookingsModal: () => void;
  onOpenManageClients?: () => void;
  onOpenManageVendors?: () => void;
  selectedCitiesCount?: number;
  onOpenCitiesModal?: () => void;
}

export const DesktopRibbon: React.FC<DesktopRibbonProps> = ({
  currentView,
  onViewChange,
  currency,
  onCurrencyToggle,
  searchQuery,
  onSearchChange,
  cartItemCount,
  onOpenCartModal,
  onOpenNewAssetModal,
  onOpenExcelImportModal,
  onExportCsv,
  isFilterDockOpen,
  onToggleFilterDock,
  onResetFilters,
  filteredCount,
  totalCount,
  activeFilterCount,
  currentUser,
  onOpenLoginModal,
  onOpenBookingsModal,
  onOpenManageClients,
  onOpenManageVendors,
  selectedCitiesCount = 0,
  onOpenCitiesModal,
}) => {
  const isAdmin = currentUser.role === 'administrator';

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left Zone: Filter Toggle, Search Bar & Quick Stats */}
      <div className="flex items-center gap-2.5 flex-1 min-w-[280px] max-w-xl">
        <button
          onClick={onToggleFilterDock}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors font-medium ${
            isFilterDockOpen
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
          }`}
          title="Toggle Filter Pane"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Pakistan Cities Nationwide Selector Trigger */}
        {onOpenCitiesModal && (
          <button
            onClick={onOpenCitiesModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors font-medium cursor-pointer ${
              selectedCitiesCount > 0
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold shadow-xs'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
            title="Browse all 70+ Pakistan cities across Punjab, Sindh, KP, Balochistan, Islamabad, AJK, GB"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Cities</span>
            <span
              className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                selectedCitiesCount > 0
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400'
              }`}
            >
              {selectedCitiesCount > 0 ? `${selectedCitiesCount}` : 'All (70+)'}
            </span>
          </button>
        )}

        {/* Search input with clean affordance */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search outdoor media by road, landmark, city, code... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-700/80 rounded pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-amber-400 transition-colors"
            title="Reset active filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-[11px]">Clear</span>
          </button>
        )}
      </div>

      {/* Center Zone: Windows View Mode Segmented Switcher */}
      <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => onViewChange('cards')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            currentView === 'cards'
              ? 'bg-slate-800 text-amber-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Visual Media Cards View"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Cards</span>
        </button>
        <button
          onClick={() => onViewChange('table')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            currentView === 'table'
              ? 'bg-slate-800 text-amber-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Data Table View"
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Table</span>
        </button>
        <button
          onClick={() => onViewChange('map')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            currentView === 'map'
              ? 'bg-slate-800 text-amber-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Pakistan Interactive Geo Map"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Map</span>
        </button>
        <button
          onClick={() => onViewChange('analytics')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            currentView === 'analytics'
              ? 'bg-slate-800 text-amber-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Audience Profiling & CPM Analytics"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Profiling</span>
        </button>
      </div>

      {/* Right Zone: Primary Actions, Currency Switcher & Cart */}
      <div className="flex items-center gap-2">
        {/* Currency Switcher */}
        <button
          onClick={onCurrencyToggle}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded font-mono text-[11px] font-semibold transition-colors flex items-center gap-1"
          title="Toggle currency display (PKR / USD)"
        >
          <span className={currency === 'PKR' ? 'text-amber-400' : 'text-slate-500'}>PKR ₨</span>
          <span className="text-slate-600">/</span>
          <span className={currency === 'USD' ? 'text-emerald-400' : 'text-slate-500'}>USD $</span>
        </button>

        {/* Export CSV */}
        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded transition-colors font-medium cursor-pointer"
          title="Export filtered assets to CSV"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Bookings / Reservations Desk */}
        <button
          onClick={onOpenBookingsModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded transition-colors font-medium cursor-pointer"
          title={isAdmin ? 'View and manage client booking requests' : 'View my site booking reservations'}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">{isAdmin ? 'Bookings' : 'My Bookings'}</span>
        </button>

        {/* Manage Clients - Admin Only */}
        {isAdmin && onOpenManageClients && (
          <button
            onClick={onOpenManageClients}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-700/60 rounded transition-colors font-medium shadow-xs cursor-pointer"
            title="Manage client accounts, assign organizations, and issue login credentials (admin@blaze.com.pk only)"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Clients</span>
          </button>
        )}

        {/* Manage Vendors - Admin Only */}
        {isAdmin && onOpenManageVendors && (
          <button
            onClick={onOpenManageVendors}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-600/50 rounded transition-colors font-medium shadow-xs cursor-pointer"
            title="Manage Media Vendors & Concessionaires (Add, Edit, Delete)"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Vendors</span>
          </button>
        )}

        {/* Import Excel - Admin Only */}
        {isAdmin ? (
          <button
            onClick={onOpenExcelImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 rounded transition-colors font-medium shadow-xs cursor-pointer"
            title="Import media assets from Excel spreadsheet (.xlsx, .csv)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenLoginModal('signin')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 text-slate-500 border border-slate-800 rounded transition-colors font-medium opacity-70 hover:opacity-100 hover:border-slate-700 cursor-pointer"
            title="Import Excel requires Administrator privileges (Click to sign in with administrator account)"
          >
            <Lock className="w-3 h-3 text-amber-500/70" />
            <span className="hidden sm:inline">Import Excel</span>
            <span className="text-[9px] text-amber-400 font-mono hidden md:inline">(Admin)</span>
          </button>
        )}

        {/* Add New Asset Button - Admin Only */}
        {isAdmin ? (
          <button
            onClick={onOpenNewAssetModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded transition-colors font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Add Asset</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenLoginModal('signin')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 text-slate-500 border border-slate-800 rounded transition-colors font-medium opacity-70 hover:opacity-100 hover:border-slate-700 cursor-pointer"
            title="Adding new media assets requires Administrator privileges (Click to sign in with administrator account)"
          >
            <Lock className="w-3 h-3 text-amber-500/70" />
            <span className="hidden sm:inline">Add Asset</span>
            <span className="text-[9px] text-amber-400 font-mono hidden md:inline">(Admin)</span>
          </button>
        )}

        {/* Media Plan Cart Button */}
        <button
          onClick={onOpenCartModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded font-semibold transition-colors shadow-sm cursor-pointer ${
            cartItemCount > 0
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
          }`}
          title="View Campaign Media Plan & Proposal Sheet"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Media Plan</span>
          {cartItemCount > 0 && (
            <span className="px-1.5 py-0.2 bg-slate-950 text-amber-400 rounded-full font-bold text-[10px] tabular-nums">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
