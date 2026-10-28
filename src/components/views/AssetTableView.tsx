import React, { useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  Eye,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  Edit3,
  Calendar,
  Trash2,
  Info,
} from 'lucide-react';
import { MediaAsset, Currency, UserAccount } from '../../types/mediaAsset';
import { formatCurrency, formatNumberCompact, calculateCPM } from '../../utils/formatters';

interface AssetTableViewProps {
  assets: MediaAsset[];
  selectedAssetIdsInCart: Set<string>;
  onToggleCartItem: (asset: MediaAsset) => void;
  onSelectAssetForDetails: (asset: MediaAsset) => void;
  currency: Currency;
  onBatchAddToCart: (assets: MediaAsset[]) => void;
  currentUser?: UserAccount;
  onOpenEditModal?: (asset: MediaAsset) => void;
  onOpenBookingModal?: (asset: MediaAsset) => void;
  onDeleteAsset?: (asset: MediaAsset) => void;
}

type SortColumn =
  | 'code'
  | 'city'
  | 'vendor'
  | 'type'
  | 'totalSqFt'
  | 'dailyTraffic'
  | 'secCategory'
  | 'vendorRate'
  | 'blazeRate'
  | 'monthlyRental'
  | 'cpm'
  | 'status';

export const AssetTableView: React.FC<AssetTableViewProps> = ({
  assets,
  selectedAssetIdsInCart,
  onToggleCartItem,
  onSelectAssetForDetails,
  currency,
  onBatchAddToCart,
  currentUser,
  onOpenEditModal,
  onOpenBookingModal,
  onDeleteAsset,
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('dailyTraffic');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    asset: MediaAsset;
  } | null>(null);

  const isAdmin = currentUser?.role === 'administrator';

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortColumn) {
      case 'code':
        aVal = a.code;
        bVal = b.code;
        break;
      case 'city':
        aVal = a.city;
        bVal = b.city;
        break;
      case 'vendor':
        aVal = a.vendor;
        bVal = b.vendor;
        break;
      case 'type':
        aVal = a.type;
        bVal = b.type;
        break;
      case 'totalSqFt':
        aVal = a.dimensions?.totalSqFt ?? 0;
        bVal = b.dimensions?.totalSqFt ?? 0;
        break;
      case 'dailyTraffic':
        aVal = a.profiling?.dailyTrafficVehicles ?? 0;
        bVal = b.profiling?.dailyTrafficVehicles ?? 0;
        break;
      case 'secCategory':
        aVal = a.profiling?.secCategory || '';
        bVal = b.profiling?.secCategory || '';
        break;
      case 'vendorRate':
        aVal = a.cost?.vendorRatePkr ?? Math.round((a.cost?.monthlyRentalPkr ?? 0) * 0.7);
        bVal = b.cost?.vendorRatePkr ?? Math.round((b.cost?.monthlyRentalPkr ?? 0) * 0.7);
        break;
      case 'blazeRate':
      case 'monthlyRental':
        aVal = a.cost?.blazeRatePkr ?? a.cost?.monthlyRentalPkr ?? 0;
        bVal = b.cost?.blazeRatePkr ?? b.cost?.monthlyRentalPkr ?? 0;
        break;
      case 'cpm':
        aVal = calculateCPM(a.cost.monthlyRentalPkr, a.profiling.dailyGrossImpressions);
        bVal = calculateCPM(b.cost.monthlyRentalPkr, b.profiling.dailyGrossImpressions);
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        aVal = a.id;
        bVal = b.id;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = new Set(selectedRowIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedRowIds(updated);
  };

  const toggleSelectAllRows = () => {
    if (selectedRowIds.size === assets.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(assets.map((a) => a.id)));
    }
  };

  const handleBatchAdd = () => {
    const selected = assets.filter((a) => selectedRowIds.has(a.id));
    onBatchAddToCart(selected);
  };

  const handleContextMenu = (e: React.MouseEvent, asset: MediaAsset) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      asset,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    closeContextMenu();
  };

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/60 select-none text-xs"
      onClick={closeContextMenu}
    >
      {/* Batch Actions Bar (when rows are selected) */}
      {selectedRowIds.size > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-3">
            <span className="font-semibold font-mono">
              {selectedRowIds.size} row{selectedRowIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBatchAdd}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Selected to Media Plan</span>
            </button>
          </div>
          <button
            onClick={() => setSelectedRowIds(new Set())}
            className="text-slate-400 hover:text-slate-200 text-[11px]"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Spreadsheet Table Viewport */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
          {/* Sticky Table Header */}
          <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 sticky top-0 z-10">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedRowIds.size > 0 && selectedRowIds.size === assets.length}
                  onChange={toggleSelectAllRows}
                  className="rounded bg-slate-950 border-slate-700 accent-amber-500 cursor-pointer"
                />
              </th>
              <th
                onClick={() => handleSort('code')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>Site Code</span>
                  {sortColumn === 'code' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('city')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>City & Location Landmark</span>
                  {sortColumn === 'city' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('vendor')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>Vendor Network</span>
                  {sortColumn === 'vendor' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('type')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>Media Type</span>
                  {sortColumn === 'type' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3">Dimensions</th>
              <th
                onClick={() => handleSort('totalSqFt')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Area (Sq.Ft.)</span>
                  {sortColumn === 'totalSqFt' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('dailyTraffic')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Daily Traffic</span>
                  {sortColumn === 'dailyTraffic' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('secCategory')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200 text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>SEC</span>
                  {sortColumn === 'secCategory' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('vendorRate')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Vendor Rate</span>
                  {sortColumn === 'vendorRate' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('blazeRate')}
                className="py-2.5 px-3 cursor-pointer hover:text-amber-300 text-right text-amber-400"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Blaze Rate</span>
                  {sortColumn === 'blazeRate' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('cpm')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Est. CPM</span>
                  {sortColumn === 'cpm' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-200 text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {sortColumn === 'status' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-slate-800/80">
            {sortedAssets.map((asset) => {
              const inCart = selectedAssetIdsInCart.has(asset.id);
              const isSelected = selectedRowIds.has(asset.id);
              const vendorRate = asset.cost.vendorRatePkr ?? Math.round(asset.cost.monthlyRentalPkr * 0.7);
              const blazeRate = asset.cost.blazeRatePkr ?? asset.cost.monthlyRentalPkr;
              const cpm = calculateCPM(blazeRate, asset.profiling.dailyGrossImpressions);

              return (
                <tr
                  key={asset.id}
                  onClick={() => onSelectAssetForDetails(asset)}
                  onContextMenu={(e) => handleContextMenu(e, asset)}
                  className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <td
                    className="py-2.5 px-3 text-center"
                    onClick={(e) => toggleSelectRow(asset.id, e)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded bg-slate-950 border-slate-700 accent-amber-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-amber-400 text-[11px]">
                    {asset.code}
                  </td>
                  <td className="py-2.5 px-3 max-w-[260px]">
                    <div className="font-medium text-slate-200 truncate">{asset.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {asset.city} · {asset.area}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 max-w-[160px]">
                    <span className="text-slate-300 font-medium truncate block">{asset.vendor}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-slate-300 font-medium">{asset.type}</span>
                    <span className="text-[10px] text-slate-500 block">{asset.illumination}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 tabular-nums">
                    {asset.dimensions?.widthFt ?? 0} × {asset.dimensions?.heightFt ?? 0} ft
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-200 text-right tabular-nums">
                    {(asset.dimensions?.totalSqFt ?? 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-200 text-right tabular-nums">
                    {formatNumberCompact(asset.profiling?.dailyTrafficVehicles ?? 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-400 font-mono font-bold text-[10px] border border-slate-800">
                      {asset.profiling?.secCategory || 'A'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300 text-right tabular-nums">
                    {formatCurrency(vendorRate, currency)}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-amber-400 text-right tabular-nums">
                    {formatCurrency(blazeRate, currency)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-right tabular-nums text-[11px]">
                    ₨ {cpm}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        asset.status === 'Available'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                          : asset.status === 'Occupied'
                          ? 'bg-blue-950 text-blue-400 border-blue-800/60'
                          : 'bg-amber-950 text-amber-400 border-amber-800/60'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && onOpenEditModal && (
                        <button
                          onClick={() => onOpenEditModal(asset)}
                          className="p-1 hover:bg-amber-500/20 text-amber-400 rounded transition-colors"
                          title="Edit Site Properties (Administrator)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && onDeleteAsset && (
                        <button
                          onClick={() => onDeleteAsset(asset)}
                          className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                          title="Permanently Delete Asset & Imagery (Administrator)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isAdmin && onOpenBookingModal && (
                        <button
                          onClick={() => onOpenBookingModal(asset)}
                          className="p-1 hover:bg-blue-600/20 text-blue-400 rounded transition-colors"
                          title="Reserve Site / Request Booking"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectAssetForDetails(asset)}
                        className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors"
                        title="View Full Spec Sheet"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onToggleCartItem(asset)}
                        className={`p-1 rounded transition-colors ${
                          inCart
                            ? 'bg-amber-500 text-slate-950'
                            : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title={inCart ? 'Remove from proposal' : 'Add to campaign proposal'}
                      >
                        {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedAssets.length === 0 && (
              <tr>
                <td colSpan={13} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Info className="w-8 h-8 text-slate-600" />
                    <div className="text-sm font-semibold text-slate-300">
                      {isAdmin ? 'Inventory is Empty' : 'No Media Assets Listed'}
                    </div>
                    <div className="text-xs text-slate-500 max-w-sm">
                      {isAdmin
                        ? 'Click "+ Add Asset" in the top bar to enter media asset specifications and upload photos manually, or import from an Excel sheet.'
                        : 'No media assets have been published yet.'}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Windows Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-56 bg-slate-900 border border-slate-700 rounded-md shadow-2xl py-1 text-slate-200 text-xs"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-mono text-[10px] text-amber-400 border-b border-slate-800 flex items-center justify-between">
            <span>{contextMenu.asset.code}</span>
            <span className="text-slate-500 text-[9px]">{isAdmin ? 'ADMIN' : 'CLIENT'}</span>
          </div>
          <button
            onClick={() => {
              onSelectAssetForDetails(contextMenu.asset);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Property Inspector</span>
          </button>
          {isAdmin && onOpenEditModal && (
            <button
              onClick={() => {
                onOpenEditModal(contextMenu.asset);
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-500/20 text-amber-300 flex items-center gap-2"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Asset Properties (Admin)</span>
            </button>
          )}
          {!isAdmin && onOpenBookingModal && (
            <button
              onClick={() => {
                onOpenBookingModal(contextMenu.asset);
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-600/20 text-blue-300 flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Reserve Site / Request Booking</span>
            </button>
          )}
          <button
            onClick={() => {
              onToggleCartItem(contextMenu.asset);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Toggle Media Plan Cart</span>
          </button>
          <button
            onClick={() => {
              copyToClipboard(`${contextMenu.asset.coordinates.lat}, ${contextMenu.asset.coordinates.lng}`);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy GPS Coordinates</span>
          </button>
          <button
            onClick={() => {
              copyToClipboard(contextMenu.asset.code);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Site Inventory Code</span>
          </button>
          {isAdmin && onDeleteAsset && (
            <>
              <div className="h-px bg-slate-800 my-1" />
              <button
                onClick={() => {
                  const target = contextMenu.asset;
                  closeContextMenu();
                  onDeleteAsset(target);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-red-950/60 text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Permanently Delete Asset (Admin)</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
