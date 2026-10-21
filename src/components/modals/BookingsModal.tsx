import React, { useState } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  Building,
  User,
  AlertCircle,
  FileCheck,
  Check,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { BookingRequest, UserAccount, Currency } from '../../types/mediaAsset';
import { formatCurrency } from '../../utils/formatters';

interface BookingsModalProps {
  bookings: BookingRequest[];
  currentUser: UserAccount;
  onUpdateBookingStatus: (bookingId: string, newStatus: 'Approved & Reserved' | 'Rejected') => void;
  onClose: () => void;
  currency: Currency;
  onInspectAsset?: (assetCode: string) => void;
}

export const BookingsModal: React.FC<BookingsModalProps> = ({
  bookings,
  currentUser,
  onUpdateBookingStatus,
  onClose,
  currency,
  onInspectAsset,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const isAdmin = currentUser.role === 'administrator';

  const filteredBookings = bookings.filter((b) => {
    if (!isAdmin) {
      const userEmail = (currentUser.email || '').toLowerCase().trim();
      const userName = (currentUser.name || '').toLowerCase().trim();
      const userOrg = (currentUser.organization || '').toLowerCase().trim();
      const bookingEmail = (b.contactEmail || '').toLowerCase().trim();
      const bookingName = (b.clientName || '').toLowerCase().trim();
      const bookingOrg = (b.organization || '').toLowerCase().trim();
      const bookingUid = (b as any).clientUid;

      const isOwner =
        (bookingUid && bookingUid === currentUser.id) ||
        (userEmail && bookingEmail === userEmail) ||
        (userName && bookingName === userName) ||
        (userOrg && bookingOrg === userOrg);

      if (!isOwner) {
        return false;
      }
    }
    if (filterStatus === 'all') return true;
    if (filterStatus === 'Pending Admin Confirmation') {
      return b.status === 'Pending Admin Confirmation' || (b.status as string) === 'Pending';
    }
    if (filterStatus === 'Approved & Reserved') {
      return b.status === 'Approved & Reserved' || (b.status as string) === 'Approved';
    }
    if (filterStatus === 'Rejected') {
      return b.status === 'Rejected' || (b.status as string) === 'Declined';
    }
    return b.status === filterStatus;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
              isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
            }`}>
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>{isAdmin ? 'Campaign Booking Inquiries & Reservations Desk' : 'My Campaign Booking Reservations'}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {isAdmin ? 'Admin Console' : 'Client Portal'}
                </span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {isAdmin ? 'Review and approve outdoor media site reservations submitted by clients' : 'Track the commercial approval status of your site booking requests'}
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

        {/* Filter bar */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Filter by Status:</span>
            <div className="flex items-center bg-slate-900 rounded border border-slate-800 p-0.5">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-slate-800 text-amber-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({bookings.length})
              </button>
              <button
                onClick={() => setFilterStatus('Pending Admin Confirmation')}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                  filterStatus === 'Pending Admin Confirmation'
                    ? 'bg-amber-500/20 text-amber-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus('Approved & Reserved')}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                  filterStatus === 'Approved & Reserved'
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilterStatus('Rejected')}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                  filterStatus === 'Rejected'
                    ? 'bg-red-500/20 text-red-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Declined
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Showing {filteredBookings.length} booking request{filteredBookings.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-950/30">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-400">No booking requests found</p>
              <p className="text-xs text-slate-500 mt-1">
                {isAdmin
                  ? 'Client site reservations submitted from the client portal will appear here.'
                  : 'You have not submitted any site booking requests yet. Open any asset and click "Reserve Site".'}
              </p>
            </div>
          ) : (
            filteredBookings.map((b) => (
              <div
                key={b.bookingId}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 font-bold text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {b.bookingId}
                    </span>
                    <span className="font-bold text-slate-200 text-xs">
                      {b.brandName}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300 font-mono">
                      Site: <strong className="text-amber-400">{b.assetCode}</strong>
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      b.status === 'Approved & Reserved' || (b.status as string) === 'Approved'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                        : b.status === 'Rejected' || (b.status as string) === 'Declined'
                        ? 'bg-red-950 text-red-300 border-red-700/60'
                        : 'bg-amber-950 text-amber-300 border-amber-700/60'
                    }`}
                  >
                    {b.status === 'Approved & Reserved' ? 'Approved & Reserved' : b.status === 'Rejected' ? 'Declined' : b.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Client / Advertiser:</span>
                    <span className="text-slate-200 font-medium flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-blue-400" />
                      {b.clientName}
                    </span>
                    <span className="text-slate-400 block text-[10px]">{b.organization}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Contact Info:</span>
                    <span className="text-slate-300 font-mono mt-0.5 block">{b.contactEmail}</span>
                    {b.phone && <span className="text-slate-400 font-mono text-[10px] block">{b.phone}</span>}
                  </div>

                  <div>
                    <span className="text-slate-500 block">Duration & Start:</span>
                    <span className="text-slate-200 font-medium mt-0.5 block">
                      {b.durationMonths} Month{b.durationMonths > 1 ? 's' : ''} (From {b.startDate})
                    </span>
                    <span className="text-slate-500 text-[10px] block">
                      Submitted: {new Date(b.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Quoted Estimate:</span>
                    <span className="text-slate-100 font-mono font-bold text-xs mt-0.5 block">
                      {b.quotedAmountPkr ? formatCurrency(b.quotedAmountPkr, currency) : 'TBD by Commercials'}
                    </span>
                  </div>
                </div>

                {b.notes && (
                  <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                      Client Campaign Requirements & Notes:
                    </span>
                    {b.notes}
                  </div>
                )}

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 mr-2 font-mono">
                      Administrator Decision:
                    </span>
                    {b.status !== 'Rejected' && (
                      <button
                        onClick={() => onUpdateBookingStatus(b.bookingId, 'Rejected')}
                        className="px-3 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded text-xs transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Decline Request
                      </button>
                    )}
                    {b.status !== 'Approved & Reserved' && (
                      <button
                        onClick={() => onUpdateBookingStatus(b.bookingId, 'Approved & Reserved')}
                        className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve & Mark Site Reserved
                      </button>
                    )}
                    {b.status !== 'Pending Admin Confirmation' && (
                      <button
                        onClick={() => onUpdateBookingStatus(b.bookingId, 'Pending Admin Confirmation' as any)}
                        className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded text-xs transition-colors"
                      >
                        Reset to Pending
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <span>Enterprise Booking System</span>
            <span className="text-slate-600">|</span>
            <span>Sync: http://app2.blaze.com.pk/</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
