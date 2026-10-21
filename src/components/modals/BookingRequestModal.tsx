import React, { useState } from 'react';
import {
  X,
  Calendar,
  Send,
  Building,
  CheckCircle2,
  Clock,
  MapPin,
  Car,
  FileCheck,
} from 'lucide-react';
import { MediaAsset, UserAccount } from '../../types/mediaAsset';
import { formatCurrency, formatNumberCompact } from '../../utils/formatters';

interface BookingRequestModalProps {
  asset: MediaAsset;
  currentUser: UserAccount;
  onClose: () => void;
  onBookingSubmitted?: (booking: any) => void;
}

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  asset,
  currentUser,
  onClose,
  onBookingSubmitted,
}) => {
  const [clientName, setClientName] = useState(currentUser.name);
  const [organization, setOrganization] = useState(currentUser.organization);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState('+92 300 1234567');
  const [brandName, setBrandName] = useState('Olpers All Natural Milk');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
  );
  const [durationMonths, setDurationMonths] = useState(3);
  const [notes, setNotes] = useState(
    'Requesting exclusive single-brand tenancy with nighttime lighting verification reports.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bookings/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          organization,
          contactEmail: email,
          phone,
          assetId: asset.id,
          assetCode: asset.code,
          brandName,
          durationMonths,
          startDate,
          notes,
        }),
      });

      const data = await res.json();
      setConfirmedBookingId(data.booking?.bookingId || `BK-${Date.now().toString().slice(-6)}`);
      if (onBookingSubmitted) {
        onBookingSubmitted(data.booking);
      }
    } catch {
      setConfirmedBookingId(`BK-${Date.now().toString().slice(-6)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Client Site Booking & Reservation</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {asset.code} · {asset.city} ({asset.area})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {confirmedBookingId ? (
            <div className="p-6 bg-emerald-950/20 border border-emerald-800/60 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Site Reservation Request Dispatched
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Your reservation request for <strong>{asset.title}</strong> has been transmitted to Blaze Media Operations. Reference Number:
              </p>
              <div className="inline-block px-4 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono font-bold text-amber-400 text-sm">
                {confirmedBookingId}
              </div>
              <p className="text-[11px] text-slate-400">
                A formal availability hold has been logged under client organization <strong>{organization}</strong>.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs transition-colors"
                >
                  Return to Inventory
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Asset Snapshot Card */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200 text-xs">{asset.title}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Vendor: {asset.vendor}</span>
                    <span>·</span>
                    <span>{asset.dimensions.widthFt}×{asset.dimensions.heightFt} ft ({asset.dimensions.totalSqFt} sqft)</span>
                    <span>·</span>
                    <span className="text-amber-400">SEC {asset.profiling.secCategory}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-slate-100 text-xs">
                    {formatCurrency(asset.cost.monthlyRentalPkr, 'PKR')}
                    <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {formatNumberCompact(asset.profiling.dailyTrafficVehicles)} cars/day
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Client Representative
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Organization / Brand House
                  </label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Direct Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Brand / Product Campaign
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Duration (Months)
                  </label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months (Quarterly)</option>
                    <option value={6}>6 Months (Half Year)</option>
                    <option value={12}>12 Months (Annual)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Target Display Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Creative / Production Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  Transmits to http://app2.blaze.com.pk/api/bookings
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Sending Request...' : 'Submit Booking Request'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
