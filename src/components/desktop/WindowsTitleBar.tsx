import React, { useState } from 'react';
import {
  Minus,
  Square,
  X,
  Layers,
  FileSpreadsheet,
  Download,
  PlusCircle,
  HelpCircle,
  Keyboard,
  Info,
  ExternalLink,
  ShieldCheck,
  User,
  Calendar,
  Lock,
  ChevronDown,
  CheckCircle2,
  LogIn,
  UserPlus,
  Users,
  LogOut,
  Building2,
} from 'lucide-react';
import { ViewMode, UserAccount, UserRole } from '../../types/mediaAsset';
import { auth } from '../../services/firebase';

interface WindowsTitleBarProps {
  onOpenNewAssetModal: () => void;
  onOpenExcelImportModal: () => void;
  onExportCsv: () => void;
  onOpenCartModal: () => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onResetFilters: () => void;
  totalAssetsCount: number;
  currentUser: UserAccount;
  onOpenLoginModal: (mode?: 'client' | 'administrator' | 'signin') => void;
  onOpenBookingsModal: () => void;
  onOpenManageClients?: () => void;
  onOpenManageVendors?: () => void;
  onSignOut?: () => void;
  onSwitchRole?: (role: UserRole) => void;
}

export const WindowsTitleBar: React.FC<WindowsTitleBarProps> = ({
  onOpenNewAssetModal,
  onOpenExcelImportModal,
  onExportCsv,
  onOpenCartModal,
  currentView,
  onViewChange,
  onResetFilters,
  totalAssetsCount,
  currentUser,
  onOpenLoginModal,
  onOpenBookingsModal,
  onOpenManageClients,
  onOpenManageVendors,
  onSignOut,
  onSwitchRole,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const isAdmin = currentUser.role === 'administrator';

  const toggleMenu = (menuName: string) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  const closeMenu = () => setActiveMenu(null);

  return (
    <>
      <header className="h-9 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 select-none text-xs text-slate-300 relative z-40">
        {/* Left: Window Icon + Title & Menu Strip */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-sm font-bold text-[10px]">
              B
            </div>
            <span className="font-semibold text-slate-200 tracking-tight text-xs flex items-center gap-1.5">
              Blaze OOH Media Asset Manager
              <span className="text-[10px] text-amber-400 font-mono hidden md:inline">http://app2.blaze.com.pk/</span>
            </span>
          </div>

          {/* Windows Classic Menu Bar */}
          <nav className="hidden lg:flex items-center gap-0.5 relative text-slate-400 font-medium">
            {/* File Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('file')}
                className={`px-2 py-1 rounded hover:bg-slate-800 hover:text-slate-100 transition-colors ${
                  activeMenu === 'file' ? 'bg-slate-800 text-slate-100' : ''
                }`}
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div
                  className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 z-50 text-slate-200"
                  onMouseLeave={closeMenu}
                >
                  <button
                    onClick={() => {
                      closeMenu();
                      if (isAdmin) {
                        onOpenNewAssetModal();
                      } else {
                        onOpenLoginModal();
                      }
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs ${
                      isAdmin
                        ? 'hover:bg-amber-500/20 hover:text-amber-300'
                        : 'hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>New Media Asset...</span>
                      {!isAdmin && (
                        <span className="text-[10px] text-amber-400/80 font-mono">(Admin)</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+N</span>
                  </button>
                  <button
                    onClick={() => {
                      closeMenu();
                      if (isAdmin) {
                        onOpenExcelImportModal();
                      } else {
                        onOpenLoginModal();
                      }
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs ${
                      isAdmin
                        ? 'hover:bg-emerald-500/20 hover:text-emerald-300'
                        : 'hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Import from Excel (.xlsx)...</span>
                      {!isAdmin && (
                        <span className="text-[10px] text-amber-400/80 font-mono">(Admin)</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+I</span>
                  </button>
                  <button
                    onClick={() => {
                      closeMenu();
                      onExportCsv();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-amber-500/20 hover:text-amber-300 flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-blue-400" /> Export Inventory (CSV)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+E</span>
                  </button>
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenCartModal();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-amber-500/20 hover:text-amber-300 flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Campaign Proposal Sheet
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+P</span>
                  </button>
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenBookingsModal();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600/20 hover:text-blue-300 flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" /> Booking Inquiries & Desk
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+B</span>
                  </button>
                  {isAdmin && onOpenManageVendors && (
                    <button
                      onClick={() => {
                        closeMenu();
                        onOpenManageVendors();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-amber-500/20 hover:text-amber-300 flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" /> Manage Media Vendors...
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Ctrl+M</span>
                    </button>
                  )}
                  {isAdmin && onOpenManageClients && (
                    <button
                      onClick={() => {
                        closeMenu();
                        onOpenManageClients();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-600/20 hover:text-blue-300 flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-blue-400" /> Manage Client Accounts...
                      </span>
                    </button>
                  )}
                  <div className="h-px bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenLoginModal();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs text-amber-400 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" /> Switch Account / Log In...
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+L</span>
                  </button>
                  <div className="h-px bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      closeMenu();
                      window.print();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-xs text-slate-400"
                  >
                    Print Spec Sheets
                  </button>
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('view')}
                className={`px-2 py-1 rounded hover:bg-slate-800 hover:text-slate-100 transition-colors ${
                  activeMenu === 'view' ? 'bg-slate-800 text-slate-100' : ''
                }`}
              >
                View
              </button>
              {activeMenu === 'view' && (
                <div
                  className="absolute left-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 z-50 text-slate-200"
                  onMouseLeave={closeMenu}
                >
                  <button
                    onClick={() => {
                      onViewChange('cards');
                      closeMenu();
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs ${
                      currentView === 'cards' ? 'text-amber-400 font-semibold' : ''
                    }`}
                  >
                    ● Visual Media Cards
                  </button>
                  <button
                    onClick={() => {
                      onViewChange('table');
                      closeMenu();
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs ${
                      currentView === 'table' ? 'text-amber-400 font-semibold' : ''
                    }`}
                  >
                    ● Data Table Spreadsheet
                  </button>
                  <button
                    onClick={() => {
                      onViewChange('map');
                      closeMenu();
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs ${
                      currentView === 'map' ? 'text-amber-400 font-semibold' : ''
                    }`}
                  >
                    ● Pakistan Geographic Map
                  </button>
                  <button
                    onClick={() => {
                      onViewChange('analytics');
                      closeMenu();
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs ${
                      currentView === 'analytics' ? 'text-amber-400 font-semibold' : ''
                    }`}
                  >
                    ● Audience Profiling & CPM
                  </button>
                  <div className="h-px bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      onResetFilters();
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-xs text-slate-400"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Assets Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('assets')}
                className={`px-2 py-1 rounded hover:bg-slate-800 hover:text-slate-100 transition-colors ${
                  activeMenu === 'assets' ? 'bg-slate-800 text-slate-100' : ''
                }`}
              >
                Assets
              </button>
              {activeMenu === 'assets' && (
                <div
                  className="absolute left-0 top-full mt-1 w-56 bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 z-50 text-slate-200"
                  onMouseLeave={closeMenu}
                >
                  <div className="px-3 py-1 text-[11px] text-slate-500 font-mono">
                    Total Assets: {totalAssetsCount} Listed
                  </div>
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenNewAssetModal();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-xs flex items-center justify-between"
                  >
                    <span>Register New Unipole / DOOH</span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+N</span>
                  </button>
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenExcelImportModal();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Import from Excel (.xlsx)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+I</span>
                  </button>
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenCartModal();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-xs"
                  >
                    Open Active Media Plan Cart
                  </button>
                </div>
              )}
            </div>

            {/* Account Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('account')}
                className={`px-2 py-1 rounded hover:bg-slate-800 hover:text-slate-100 transition-colors flex items-center gap-1 ${
                  activeMenu === 'account' ? 'bg-slate-800 text-slate-100' : ''
                }`}
              >
                <span>Account</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-blue-400'}`} />
              </button>
              {activeMenu === 'account' && (
                <div
                  className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 z-50 text-slate-200"
                  onMouseLeave={closeMenu}
                >
                  <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/70">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Active User</div>
                    <div className="font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                      {isAdmin ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                      <span className="truncate">{currentUser.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{currentUser.organization}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                        isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {currentUser.role.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isAdmin ? 'Full Database Control' : 'Proposal & Booking Mode'}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    {isAdmin ? (
                      <div className="space-y-1">
                        <div className="px-3 py-1 text-xs text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Official Administrator Session</span>
                        </div>
                        {onOpenManageClients && (
                          <button
                            onClick={() => {
                              closeMenu();
                              onOpenManageClients();
                            }}
                            className="w-full text-left px-3 py-1.5 flex items-center justify-between text-xs hover:bg-blue-600/20 hover:text-blue-300 text-slate-200 font-medium cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-blue-400" />
                              <span>Manage Clients & Credentials...</span>
                            </span>
                            <span className="text-[10px] text-blue-400 font-mono">Admin</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            closeMenu();
                            onOpenLoginModal('signin');
                          }}
                          className="w-full text-left px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-800 text-slate-300 font-medium cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <LogIn className="w-3.5 h-3.5 text-amber-400" />
                            <span>Switch Account / Sign In...</span>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      onOpenBookingsModal();
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600/20 hover:text-blue-300 flex items-center justify-between text-xs text-slate-300"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>{isAdmin ? 'Booking Inquiries Desk' : 'My Site Bookings'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+B</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenLoginModal();
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs text-slate-300"
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sign In with Credentials...</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+L</span>
                  </button>
                </div>
              )}
            </div>

            {/* Help Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('help')}
                className={`px-2 py-1 rounded hover:bg-slate-800 hover:text-slate-100 transition-colors ${
                  activeMenu === 'help' ? 'bg-slate-800 text-slate-100' : ''
                }`}
              >
                Help
              </button>
              {activeMenu === 'help' && (
                <div
                  className="absolute left-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 z-50 text-slate-200"
                  onMouseLeave={closeMenu}
                >
                  <button
                    onClick={() => {
                      setShowShortcutsModal(true);
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-slate-400" /> Keyboard Shortcuts
                  </button>
                  <button
                    onClick={() => {
                      setShowAboutModal(true);
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400" /> About Blaze Media OOH
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Center: System Status Indicator */}
        <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>CONNECTED: PK-OUTDOOR-DB</span>
          <span className="text-slate-600">|</span>
          <span>{totalAssetsCount} SITES ONLINE</span>
        </div>

        {/* Right: Authentication Buttons + Windows User Pill + Window Controls */}
        <div className="flex items-center gap-2 h-full">
          {isAdmin && onOpenManageClients && (
            <button
              onClick={onOpenManageClients}
              className="px-2.5 py-1 rounded bg-blue-950/60 hover:bg-blue-900/70 text-blue-300 border border-blue-700/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Manage Client Accounts & Credentials"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Manage Clients</span>
            </button>
          )}

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Sign out / Switch account"
            >
              <LogOut className="w-3 h-3 text-red-400" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}

          {/* Windows User Pill */}
          <button
            onClick={() => onOpenLoginModal('signin')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              isAdmin
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                : 'bg-blue-600/15 border-blue-500/40 text-blue-300 hover:bg-blue-600/25'
            }`}
            title="Click to view authentication status or switch account"
          >
            {isAdmin ? (
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-slate-200 hidden sm:inline truncate max-w-[110px]">
                {currentUser.name}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
              }`}>
                {isAdmin ? 'ADMIN' : 'CLIENT'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Windows Native Control Buttons */}
          <div className="flex items-center -mr-3 h-full">
            <button
              title="Minimize"
              className="h-full px-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors flex items-center justify-center"
              onClick={() => {}}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="h-full px-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors flex items-center justify-center"
              onClick={() => setIsMaximized(!isMaximized)}
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              title="Close"
              className="h-full px-3 text-slate-400 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center"
              onClick={() => {}}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </header>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-md w-full p-5 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-400">
                <Keyboard className="w-4 h-4" /> Windows Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Search & Focus filter</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono">
                  Ctrl + K
                </kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">New Media Asset Entry</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono">
                  Ctrl + N
                </kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Import Media from Excel</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono">
                  Ctrl + I
                </kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Export Media Database (.CSV)</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono">
                  Ctrl + E
                </kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Open Campaign Proposal Cart</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono">
                  Ctrl + P
                </kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Close modal / Clear focus</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono">
                  Esc
                </kbd>
              </div>
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Blaze Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-lg w-full p-5 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold text-xs">
                  B
                </div>
                <h3 className="font-semibold text-sm text-slate-100">
                  About Blaze Media Outdoor Asset Manager
                </h3>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>Blaze Media Outdoor Asset Manager</strong> is published for use on <strong>Microsoft Windows</strong>, providing direct enterprise access to the outdoor media database at <strong>http://app2.blaze.com.pk/</strong>.
              </p>
              <p>
                It provides complete inventory visibility, multi-vendor filtering, Excel batch ingestion with REST API integration, and proposal compilation across Pakistan's major advertising corridors including Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, and Multan.
              </p>
              <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-[11px] font-mono space-y-1">
                <div>Deployment Host: http://app2.blaze.com.pk/</div>
                <div>Target OS: Microsoft Windows (x64 / ARM64 Client)</div>
                <div>Client Build: Win64 Enterprise Suite v4.2</div>
                <div>API Ingestion: Enabled (/api/assets/import-excel)</div>
                <div>Author: Blaze Media OOH Engineering</div>
              </div>
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
