import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Layers,
  Percent,
  Check,
  RotateCcw,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { VendorRecord, MediaAsset, UserAccount } from '../../types/mediaAsset';
import {
  persistVendor,
  updateVendorRecord,
  deleteVendorRecord,
} from '../../services/firebase';

interface ManageVendorsModalProps {
  currentUser: UserAccount;
  vendors: VendorRecord[];
  assets: MediaAsset[];
  onClose: () => void;
  onVendorsUpdated?: (vendors: VendorRecord[]) => void;
  onRefreshAssets?: () => void;
}

const COMMON_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
];

export const ManageVendorsModal: React.FC<ManageVendorsModalProps> = ({
  currentUser,
  vendors,
  assets,
  onClose,
  onVendorsUpdated,
  onRefreshAssets,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Form State
  const [editingVendor, setEditingVendor] = useState<VendorRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCity, setFormCity] = useState('Karachi');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCommission, setFormCommission] = useState<number | ''>('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formNotes, setFormNotes] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Deletion prompt state
  const [pendingDeleteVendor, setPendingDeleteVendor] = useState<VendorRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser.role === 'administrator';

  // Compute active sites per vendor
  const vendorSiteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a) => {
      if (a.vendor) {
        counts[a.vendor] = (counts[a.vendor] || 0) + 1;
      }
    });
    return counts;
  }, [assets]);

  // Filtered vendors list
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== 'All' && v.status !== statusFilter) return false;
      if (selectedCityFilter !== 'All' && v.city !== selectedCityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = v.name.toLowerCase().includes(q);
        const matchCode = v.code.toLowerCase().includes(q);
        const matchCity = v.city.toLowerCase().includes(q);
        const matchPerson = v.contactPerson?.toLowerCase().includes(q);
        const matchPhone = v.phone?.toLowerCase().includes(q);
        const matchEmail = v.email?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCity && !matchPerson && !matchPhone && !matchEmail) {
          return false;
        }
      }
      return true;
    });
  }, [vendors, statusFilter, selectedCityFilter, searchQuery]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormName('');
    setFormCode('');
    setFormCity('Karachi');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCommission('');
    setFormStatus('Active');
    setFormNotes('');
    setErrorMsg('');
    setActiveTab('create');
  };

  // Open Edit Form
  const handleOpenEdit = (v: VendorRecord) => {
    setEditingVendor(v);
    setFormName(v.name);
    setFormCode(v.code || '');
    setFormCity(v.city || 'Karachi');
    setFormContactPerson(v.contactPerson || '');
    setFormPhone(v.phone || '');
    setFormEmail(v.email || '');
    setFormAddress(v.address || '');
    setFormCommission(v.commissionRatePercent !== undefined ? v.commissionRatePercent : '');
    setFormStatus(v.status || 'Active');
    setFormNotes(v.notes || '');
    setErrorMsg('');
    setActiveTab('edit');
  };

  // Submit Create or Edit
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Vendor Legal Name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const vendorCode = (
      formCode.trim() ||
      formName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 4)
    ).toUpperCase();

    try {
      if (activeTab === 'create') {
        const newRecord: VendorRecord = {
          id: `vnd_${Date.now().toString(36)}`,
          name: formName.trim(),
          code: vendorCode,
          city: formCity,
          contactPerson: formContactPerson.trim() || 'Operations Manager',
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          commissionRatePercent: formCommission === '' ? 0 : Number(formCommission),
          status: formStatus,
          notes: formNotes.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await persistVendor(newRecord);
        setSuccessMsg(`Vendor "${newRecord.name}" added and saved to database successfully.`);
        if (onVendorsUpdated) {
          onVendorsUpdated([newRecord, ...vendors]);
        }
      } else if (activeTab === 'edit' && editingVendor) {
        const updates: Partial<VendorRecord> = {
          name: formName.trim(),
          code: vendorCode,
          city: formCity,
          contactPerson: formContactPerson.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          commissionRatePercent: formCommission === '' ? 0 : Number(formCommission),
          status: formStatus,
          notes: formNotes.trim(),
          updatedAt: new Date().toISOString(),
        };

        await updateVendorRecord(editingVendor.id, updates);
        setSuccessMsg(`Vendor "${formName}" updated successfully in database.`);
        if (onVendorsUpdated) {
          const updatedList = vendors.map((v) =>
            v.id === editingVendor.id ? { ...v, ...updates } : v
          );
          onVendorsUpdated(updatedList);
        }
        if (onRefreshAssets) {
          onRefreshAssets();
        }
      }

      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('list');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save vendor:', err);
      setErrorMsg(err.message || 'Could not save vendor to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!pendingDeleteVendor) return;
    setIsDeleting(true);
    setErrorMsg('');
    try {
      await deleteVendorRecord(pendingDeleteVendor.id);
      setSuccessMsg(`Vendor "${pendingDeleteVendor.name}" removed from database.`);
      if (onVendorsUpdated) {
        const remaining = vendors.filter((v) => v.id !== pendingDeleteVendor.id);
        onVendorsUpdated(remaining);
      }
      setPendingDeleteVendor(null);
      setTimeout(() => {
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to delete vendor:', err);
      setErrorMsg(err.message || 'Could not remove vendor from database.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden font-sans">
        {/* Windows Classic Modal Title Bar */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>Media Concessionaire & Vendor Directory</span>
                <span className="text-[10px] text-amber-400 font-mono px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/30 rounded">
                  Admin Authority
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded p-1 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="bg-red-950/80 border-b border-red-800/80 px-4 py-2 text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Top Subheader / Navigation Strip */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('list');
                setErrorMsg('');
              }}
              className={`px-3 py-1 rounded transition-colors font-medium cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vendors Directory ({vendors.length})
            </button>
            <button
              onClick={handleOpenCreate}
              className={`px-3 py-1 rounded transition-colors font-medium flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Vendor</span>
            </button>
            {activeTab === 'edit' && editingVendor && (
              <span className="px-3 py-1 rounded bg-slate-800 text-amber-400 font-medium">
                Editing: {editingVendor.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{vendors.filter((v) => v.status === 'Active').length} Active</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" />
              <span>{assets.length} Total Inventory Sites</span>
            </span>
          </div>
        </div>

        {/* Tab 1: Vendors Directory (List View) */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter / Search Bar */}
            <div className="p-3 bg-slate-950/20 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by vendor name, code, contact person, city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded pl-8 pr-7 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCityFilter}
                  onChange={(e) => setSelectedCityFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-300"
                >
                  <option value="All">All Hubs ({COMMON_CITIES.length})</option>
                  {COMMON_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-300"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Concessionaires</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Vendor</span>
                </button>
              </div>
            </div>

            {/* Vendors Table */}
            <div className="flex-1 overflow-y-auto">
              {filteredVendors.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  <Building2 className="w-10 h-10 mx-auto text-slate-700 mb-2 opacity-50" />
                  <p className="font-medium text-slate-400">No media concessionaires found.</p>
                  <p className="mt-1 text-slate-500">
                    Try adjusting your search criteria or register a new vendor.
                  </p>
                  <button
                    onClick={handleOpenCreate}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add First Vendor
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-800 z-10">
                    <tr>
                      <th className="py-2 px-3">Vendor / Concessionaire</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">City Hub</th>
                      <th className="py-2 px-3">Primary Contact</th>
                      <th className="py-2 px-3 text-center">Active Sites</th>
                      <th className="py-2 px-3 text-center">Comm. %</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {filteredVendors.map((v) => {
                      const siteCount = vendorSiteCounts[v.name] || 0;
                      return (
                        <tr
                          key={v.id}
                          className="hover:bg-slate-800/40 transition-colors font-sans text-xs group"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                              {v.name}
                            </div>
                            {v.address && (
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5 text-slate-600" />
                                <span>{v.address}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700/80 text-[10px] font-bold">
                              {v.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-medium">
                            {v.city}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            <div>{v.contactPerson || '—'}</div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                              {v.phone && (
                                <span className="flex items-center gap-0.5">
                                  <Phone className="w-2.5 h-2.5 text-slate-600" /> {v.phone}
                                </span>
                              )}
                              {v.email && (
                                <span className="flex items-center gap-0.5">
                                  <Mail className="w-2.5 h-2.5 text-slate-600" /> {v.email}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                siteCount > 0
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                  : 'text-slate-500'
                              }`}
                            >
                              {siteCount} {siteCount === 1 ? 'site' : 'sites'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {v.commissionRatePercent ? `${v.commissionRatePercent}%` : '15%'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                v.status === 'Active'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(v)}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                                title="Edit Vendor Specifications"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setPendingDeleteVendor(v)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                title="Delete Vendor from Directory"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2 & 3: Add / Edit Vendor Form */}
        {(activeTab === 'create' || activeTab === 'edit') && (
          <form onSubmit={handleSaveVendor} className="flex-1 flex flex-col overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>{activeTab === 'create' ? 'Register New Media Concessionaire' : `Edit Concessionaire: ${editingVendor?.name}`}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Changes will be committed directly to Firestore database and live synchronization engine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2.5 py-1 bg-slate-800 rounded border border-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendor Legal Name */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Vendor / Concessionaire Legal Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Signways OOH Network"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-medium"
                />
              </div>

              {/* Vendor Code */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Vendor Short Code / Initials (2–5 Chars)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="e.g. SGW, BLZ, DWN"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-amber-400 font-mono font-bold placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Used as inventory prefix code for outdoor assets
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Primary City Hub */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Primary Regional Hub <span className="text-red-400">*</span>
                </label>
                <select
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                >
                  {COMMON_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commission Rate */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Commission / Tariff Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder=""
                    value={formCommission === '' ? '' : formCommission}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormCommission(val === '' ? '' : Math.max(0, Math.min(100, Number(val))));
                    }}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded pl-3 pr-7 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    %
                  </span>
                </div>
              </div>

              {/* Operational Status */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Operational Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="Active">Active Concessionaire</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Contact Person */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Key Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Khurram Shahzad"
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Contact Phone / Mobile
                </label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  placeholder="concession@vendor.com.pk"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Concessionaire Head Office / Yard Address
              </label>
              <input
                type="text"
                placeholder="e.g. Suite 402, Commercial Plaza, Main Boulevard, Gulberg III, Lahore"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Operational Notes & Tariff Terms
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Exclusive concession for bridge banners along Shahrah-e-Faisal. Standard 30-day payment term."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors cursor-pointer"
              >
                Back to List
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{activeTab === 'create' ? 'Save Vendor to Database' : 'Update Vendor in Database'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Delete Confirmation Modal Overlay */}
        {pendingDeleteVendor && (
          <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-60 animate-fadeIn">
            <div className="bg-slate-900 border border-red-800/80 rounded-lg shadow-2xl p-5 max-w-md w-full text-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-950 border border-red-800 flex items-center justify-center text-red-400 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-300">
                    Delete Concessionaire / Vendor?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-semibold text-slate-100">
                      "{pendingDeleteVendor.name}"
                    </span>{' '}
                    from the active vendor directory?
                  </p>
                </div>
              </div>

              {/* Linked site warning */}
              {(vendorSiteCounts[pendingDeleteVendor.name] || 0) > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Active Sites Linked</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 font-mono">
                    There are {vendorSiteCounts[pendingDeleteVendor.name]} outdoor media asset(s) currently assigned to this vendor. Deleting the vendor will not delete the media assets, but will remove this concessionaire from directory listings.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setPendingDeleteVendor(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
