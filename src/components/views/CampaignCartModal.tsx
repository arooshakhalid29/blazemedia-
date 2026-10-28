import React, { useState } from 'react';
import {
  X,
  Trash2,
  Download,
  Printer,
  Calendar,
  Percent,
  CheckCircle,
  FileSpreadsheet,
  Building,
  Eye,
  Plus,
  ArrowRight,
  Send,
} from 'lucide-react';
import { MediaAsset, MediaPlanItem, Currency, UserAccount } from '../../types/mediaAsset';
import { formatCurrency, formatFullCurrency, formatNumberCompact } from '../../utils/formatters';

interface CampaignCartModalProps {
  cartItems: MediaPlanItem[];
  onUpdateDuration: (assetId: string, durationMonths: number) => void;
  onRemoveFromCart: (assetId: string) => void;
  onClearCart: () => void;
  onClose: () => void;
  currency: Currency;
  onSelectAssetForDetails: (asset: MediaAsset) => void;
  currentUser?: UserAccount;
  onRequestCampaignBooking?: (items: MediaPlanItem[], clientName: string, campaignTitle: string) => void;
}

export const CampaignCartModal: React.FC<CampaignCartModalProps> = ({
  cartItems,
  onUpdateDuration,
  onRemoveFromCart,
  onClearCart,
  onClose,
  currency,
  onSelectAssetForDetails,
  currentUser,
  onRequestCampaignBooking,
}) => {
  const [globalDuration, setGlobalDuration] = useState<number>(3);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [includeProduction, setIncludeProduction] = useState<boolean>(true);
  const [includeMounting, setIncludeMounting] = useState<boolean>(true);
  const [includeTax, setIncludeTax] = useState<boolean>(true);
  const [clientName, setClientName] = useState<string>(
    currentUser?.organization || 'Engro Foods Limited'
  );
  const [campaignTitle, setCampaignTitle] = useState<string>('National Brand Refresh Campaign 2026');
  const [isPrintPreview, setIsPrintPreview] = useState<boolean>(false);
  const [isBookingSubmitted, setIsBookingSubmitted] = useState<boolean>(false);

  // Apply global duration change
  const handleGlobalDurationChange = (months: number) => {
    setGlobalDuration(months);
    cartItems.forEach((item) => onUpdateDuration(item.assetId, months));
  };

  // Calculations
  const totalMonthlyRentalPkr = cartItems.reduce(
    (sum, item) => sum + item.asset.cost.monthlyRentalPkr * item.durationMonths,
    0
  );

  const totalProductionCostPkr = includeProduction
    ? cartItems.reduce((sum, item) => sum + item.asset.cost.productionCostPkr, 0)
    : 0;

  const totalMountingCostPkr = includeMounting
    ? cartItems.reduce((sum, item) => sum + item.asset.cost.mountingCostPkr, 0)
    : 0;

  const subtotalBeforeDiscount =
    totalMonthlyRentalPkr + totalProductionCostPkr + totalMountingCostPkr;

  const discountAmount = Math.round(
    (totalMonthlyRentalPkr * discountPercent) / 100
  );

  const discountedRental = totalMonthlyRentalPkr - discountAmount;
  const taxableBase = discountedRental + totalProductionCostPkr + totalMountingCostPkr;

  // Blended average tax ~14.5%
  const taxAmount = includeTax ? Math.round(taxableBase * 0.14) : 0;
  const grandTotalPkr = taxableBase + taxAmount;

  // Reach calculations
  const totalDailyTraffic = cartItems.reduce(
    (sum, item) => sum + item.asset.profiling.dailyTrafficVehicles,
    0
  );
  const totalGrossCampaignImpressions = cartItems.reduce(
    (sum, item) =>
      sum + item.asset.profiling.dailyGrossImpressions * item.durationMonths * 30,
    0
  );

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Site Code',
      'City',
      'Area',
      'Title',
      'Media Type',
      'Dimensions',
      'Area (SqFt)',
      'Illumination',
      'Duration (Months)',
      'Monthly Rate (PKR)',
      'Total Rental (PKR)',
      'Production (PKR)',
      'Daily Traffic',
      'SEC Class',
    ];

    const rows = cartItems.map((item) => [
      item.asset.code,
      item.asset.city,
      `"${item.asset.area}"`,
      `"${item.asset.title}"`,
      item.asset.type || '',
      `"${item.asset.dimensions?.widthFt ?? 0}x${item.asset.dimensions?.heightFt ?? 0} ft"`,
      item.asset.dimensions?.totalSqFt ?? 0,
      item.asset.illumination || '',
      item.durationMonths,
      item.asset.cost?.monthlyRentalPkr ?? item.asset.cost?.blazeRatePkr ?? 0,
      (item.asset.cost?.monthlyRentalPkr ?? item.asset.cost?.blazeRatePkr ?? 0) * item.durationMonths,
      item.asset.cost?.productionCostPkr ?? 0,
      item.asset.profiling?.dailyTrafficVehicles ?? 0,
      item.asset.profiling?.secCategory || 'A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Blaze_OOH_Proposal_${clientName.replace(/\s+/g, '_')}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Modal Windows Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
              B
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Campaign Media Plan & Proposal Generator</span>
                <span className="font-mono text-amber-400 text-xs font-normal">
                  ({cartItems.length} Sites Selected)
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Official Commercial Quotation & Outdoor Schedule
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintPreview(!isPrintPreview)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>{isPrintPreview ? 'Edit Parameters' : 'Proposal Letterhead'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={cartItems.length === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Either Standard Plan Editor OR Official Printable Proposal Letterhead */}
        {cartItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
            <FileSpreadsheet className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              Your Media Plan is Empty
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Browse the outdoor media database and click "Add to Plan" on unipoles, digital screens, or bridge panels to compile a proposal.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors"
            >
              Browse Media Inventory
            </button>
          </div>
        ) : isPrintPreview ? (
          /* Official Printable Proposal Letterhead View */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white text-slate-900 selection:bg-amber-100 select-auto">
            {/* Header: Blaze Media Logo & Letterhead Details */}
            <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 flex items-center gap-2">
                  <span className="w-8 h-8 rounded bg-amber-500 text-white font-bold flex items-center justify-center text-base">
                    B
                  </span>
                  BLAZE MEDIA OOH
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Premier Out-of-Home Advertising & Digital Network
                </p>
                <p className="text-[11px] text-slate-500">
                  Head Office: Corporate Tower, Main Clifton Road, Karachi, Pakistan
                </p>
              </div>

              <div className="text-right text-xs space-y-1">
                <div className="font-mono font-bold text-slate-900">
                  PROPOSAL REF: BLZ-OOH-2026-{(Math.random() * 9000 + 1000).toFixed(0)}
                </div>
                <div className="text-slate-600">
                  Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="text-slate-600">
                  Validity: 15 Working Days
                </div>
              </div>
            </div>

            {/* Client Brief Section */}
            <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                  Prepared For Client:
                </span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="font-bold text-slate-900 text-sm border-b border-dashed border-slate-400 bg-transparent focus:outline-hidden w-full"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                  Campaign Title:
                </span>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="font-bold text-slate-900 text-sm border-b border-dashed border-slate-400 bg-transparent focus:outline-hidden w-full"
                />
              </div>
            </div>

            {/* Campaign Schedule & Locations Table */}
            <div className="py-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Outdoor Media Inventory Schedule
              </h3>
              <table className="w-full border border-slate-300 text-left text-[11px]">
                <thead className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2">Code</th>
                    <th className="p-2">City & Location</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Dimensions</th>
                    <th className="p-2 text-right">Traffic/Day</th>
                    <th className="p-2 text-center">Duration</th>
                    <th className="p-2 text-right">Monthly (PKR)</th>
                    <th className="p-2 text-right">Total (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cartItems.map((item) => (
                    <tr key={item.assetId}>
                      <td className="p-2 font-mono font-bold text-slate-800">
                        {item.asset.code}
                      </td>
                      <td className="p-2">
                        <div className="font-medium text-slate-900">{item.asset.title}</div>
                        <div className="text-[10px] text-slate-600">{item.asset.city} · {item.asset.area}</div>
                      </td>
                      <td className="p-2 text-slate-700">{item.asset.type}</td>
                      <td className="p-2 font-mono text-slate-600">
                        {(item.asset.dimensions?.widthFt ?? 0)}x{(item.asset.dimensions?.heightFt ?? 0)} ft
                      </td>
                      <td className="p-2 font-mono text-right text-slate-700">
                        {formatNumberCompact(item.asset.profiling?.dailyTrafficVehicles ?? 0)}
                      </td>
                      <td className="p-2 text-center font-mono">
                        {item.durationMonths} mo
                      </td>
                      <td className="p-2 font-mono text-right text-slate-800">
                        ₨ {(item.asset.cost?.monthlyRentalPkr ?? item.asset.cost?.blazeRatePkr ?? 0).toLocaleString('en-PK')}
                      </td>
                      <td className="p-2 font-mono font-bold text-right text-slate-950">
                        ₨ {(item.asset.cost.monthlyRentalPkr * item.durationMonths).toLocaleString('en-PK')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Commercial Summary Box */}
            <div className="grid grid-cols-2 gap-8 py-4 border-t border-slate-300">
              <div className="text-xs space-y-2 text-slate-700">
                <h4 className="font-bold text-slate-900 uppercase text-[11px]">
                  Estimated Campaign Performance
                </h4>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Total Daily Vehicular Traffic:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatNumberCompact(totalDailyTraffic)} vehicles/day
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Total Gross Campaign Impressions:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatNumberCompact(totalGrossCampaignImpressions)} exposures
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Blended Campaign CPM:</span>
                  <span className="font-mono font-bold text-amber-600">
                    ₨ {((grandTotalPkr / totalGrossCampaignImpressions) * 1000).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-2 text-slate-800 bg-slate-50 p-4 rounded border border-slate-200">
                <div className="flex justify-between">
                  <span>Total Media Rental:</span>
                  <span className="font-mono">₨ {totalMonthlyRentalPkr.toLocaleString('en-PK')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Agency / Volume Discount ({discountPercent}%):</span>
                    <span className="font-mono">- ₨ {discountAmount.toLocaleString('en-PK')}</span>
                  </div>
                )}
                {includeProduction && (
                  <div className="flex justify-between text-slate-600">
                    <span>Vinyl Flex Production Charges:</span>
                    <span className="font-mono">₨ {totalProductionCostPkr.toLocaleString('en-PK')}</span>
                  </div>
                )}
                {includeMounting && (
                  <div className="flex justify-between text-slate-600">
                    <span>Installation & Mounting Labor:</span>
                    <span className="font-mono">₨ {totalMountingCostPkr.toLocaleString('en-PK')}</span>
                  </div>
                )}
                {includeTax && (
                  <div className="flex justify-between text-slate-600">
                    <span>Applicable Sales Tax (SRB/PRA ~14%):</span>
                    <span className="font-mono">₨ {taxAmount.toLocaleString('en-PK')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-950 pt-2 border-t border-slate-300">
                  <span>Grand Total Net Payable:</span>
                  <span className="font-mono text-base">
                    ₨ {grandTotalPkr.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature & Authorization Section */}
            <div className="grid grid-cols-2 gap-12 pt-8 mt-6 border-t border-slate-300 text-xs">
              <div>
                <div className="border-b border-slate-400 pb-8 mb-2"></div>
                <span className="font-bold text-slate-900 block">Authorized Signatory</span>
                <span className="text-[11px] text-slate-500">Blaze Media Pakistan (Pvt.) Limited</span>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-8 mb-2"></div>
                <span className="font-bold text-slate-900 block">Client Acceptance & Confirmation</span>
                <span className="text-[11px] text-slate-500">For and on behalf of {clientName}</span>
              </div>
            </div>

            {/* Print Action Floating Buttons */}
            <div className="mt-6 flex justify-end gap-3 no-print">
              <button
                onClick={() => setIsPrintPreview(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded text-xs transition-colors"
              >
                Back to Configurator
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center gap-2 shadow-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Quotation</span>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Interactive Campaign Configurator View */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Selected Assets List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 border-r border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                <span>Selected Media Sites ({cartItems.length})</span>
                <button
                  onClick={onClearCart}
                  className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove All</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {cartItems.map((item) => (
                  <div
                    key={item.assetId}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                        <img
                          src={item.asset.imageUrl}
                          alt={item.asset.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 text-[11px] font-bold">
                            {item.asset.code}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.asset.city} · {item.asset.type}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-200 text-xs line-clamp-1 max-w-md">
                          {item.asset.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>{(item.asset.dimensions?.widthFt ?? 0)}×{(item.asset.dimensions?.heightFt ?? 0)} ft</span>
                          <span>·</span>
                          <span>{formatNumberCompact(item.asset.profiling?.dailyTrafficVehicles ?? 0)} cars/day</span>
                          <span>·</span>
                          <span className="text-amber-400">SEC {item.asset.profiling?.secCategory || 'A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rate & Duration Controller */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2 py-1">
                        <span className="text-[10px] text-slate-400 mr-1">Duration:</span>
                        {[1, 3, 6, 12].map((m) => (
                          <button
                            key={m}
                            onClick={() => onUpdateDuration(item.assetId, m)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              item.durationMonths === m
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>

                      <div className="text-right min-w-[100px]">
                        <span className="font-mono font-bold text-slate-100 text-xs block">
                          {formatCurrency(
                            item.asset.cost.monthlyRentalPkr * item.durationMonths,
                            currency
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatCurrency(item.asset.cost.monthlyRentalPkr, currency)}/mo
                        </span>
                      </div>

                      <button
                        onClick={() => onRemoveFromCart(item.assetId)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove from plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Commercial Budget & Proposal Calculator */}
            <div className="w-full lg:w-96 bg-slate-950 p-5 flex flex-col justify-between overflow-y-auto space-y-5">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider pb-2 border-b border-slate-800">
                  Campaign Commercial Settings
                </h3>

                {/* Global Campaign Duration */}
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1.5">
                    Batch Campaign Duration
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 3, 6, 12].map((months) => (
                      <button
                        key={months}
                        onClick={() => handleGlobalDurationChange(months)}
                        className={`py-1.5 rounded text-xs font-mono font-semibold border transition-colors ${
                          globalDuration === months
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        {months} Month{months > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agency Discount Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Agency Discount:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {discountPercent}% (-{formatCurrency(discountAmount, currency)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
                  />
                </div>

                {/* Inclusions Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeProduction}
                      onChange={(e) => setIncludeProduction(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 accent-amber-500"
                    />
                    <span className="text-slate-300">
                      Include Vinyl Production ({formatCurrency(totalProductionCostPkr, currency)})
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeMounting}
                      onChange={(e) => setIncludeMounting(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 accent-amber-500"
                    />
                    <span className="text-slate-300">
                      Include Installation & Mounting ({formatCurrency(totalMountingCostPkr, currency)})
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTax}
                      onChange={(e) => setIncludeTax(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 accent-amber-500"
                    />
                    <span className="text-slate-300">
                      Apply Provincial Sales Tax (SRB/PRA ~14%)
                    </span>
                  </label>
                </div>

                {/* Gross Campaign Impact Metrics */}
                <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-1.5 text-[11px]">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                    Projected Campaign Reach
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Gross Impressions:</span>
                    <span className="font-mono text-slate-100 font-bold">
                      {formatNumberCompact(totalGrossCampaignImpressions)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Daily Vehicular Flow:</span>
                    <span className="font-mono text-slate-100 font-bold">
                      {formatNumberCompact(totalDailyTraffic)} vehicles/day
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Summary Breakdown */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Gross Rental:</span>
                  <span className="font-mono">{formatCurrency(totalMonthlyRentalPkr, currency)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">-{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}
                {includeTax && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Sales Tax:</span>
                    <span className="font-mono">{formatCurrency(taxAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="font-bold text-slate-200 text-xs">Net Campaign Total:</span>
                  <span className="font-mono font-bold text-amber-400 text-lg">
                    {formatCurrency(grandTotalPkr, currency)}
                  </span>
                </div>

                <div className="space-y-2 mt-3">
                  <button
                    onClick={() => setIsPrintPreview(true)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Generate Official Proposal Sheet</span>
                  </button>

                  {onRequestCampaignBooking && cartItems.length > 0 && (
                    <button
                      onClick={() => {
                        onRequestCampaignBooking(cartItems, clientName, campaignTitle);
                        setIsBookingSubmitted(true);
                      }}
                      disabled={isBookingSubmitted}
                      className={`w-full py-2 border rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                        isBookingSubmitted
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                          : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-md cursor-pointer'
                      }`}
                    >
                      {isBookingSubmitted ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reservation Inquiries Dispatched to Blaze Media</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Request Site Reservations for All {cartItems.length} Sites</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
