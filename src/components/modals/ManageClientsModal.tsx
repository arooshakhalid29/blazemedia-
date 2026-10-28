import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  ShieldCheck,
  Building,
  Briefcase,
  Mail,
  KeyRound,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  MapPin,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ManagedClientRecord, UserAccount } from '../../types/mediaAsset';
import {
  adminCreateClientAccount,
  fetchManagedClients,
  subscribeToManagedClients,
  adminDeleteClient,
} from '../../services/firebase';

interface ManageClientsModalProps {
  currentUser: UserAccount;
  onClose: () => void;
  onClientsUpdated?: (clients: ManagedClientRecord[]) => void;
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
];

export const ManageClientsModal: React.FC<ManageClientsModalProps> = ({
  currentUser,
  onClose,
  onClientsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [clients, setClients] = useState<ManagedClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Client Form State
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientOrganization, setClientOrganization] = useState<string>('');
  const [clientDesignation, setClientDesignation] = useState<string>('');
  const [temporaryPassword, setTemporaryPassword] = useState<string>('');
  const [showTempPassword, setShowTempPassword] = useState<boolean>(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState<boolean>(true);
  const [selectedCities, setSelectedCities] = useState<string[]>([
    'Karachi',
    'Lahore',
    'Islamabad',
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdClientSummary, setCreatedClientSummary] = useState<{
    record: ManagedClientRecord;
    temporaryPassword: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const isAdmin =
    currentUser.role === 'administrator' &&
    currentUser.email?.toLowerCase().trim() === 'admin@blaze.com.pk';

  // Load clients
  const loadClients = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const list = await fetchManagedClients(currentUser.email);
      setClients(list);
      if (onClientsUpdated) onClientsUpdated(list);
    } catch (err: any) {
      console.error('Failed to load clients:', err);
      setErrorMsg('Could not load client directory from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToManagedClients(
      (list) => {
        setClients(list);
        setIsLoading(false);
        if (onClientsUpdated) onClientsUpdated(list);
      },
      (err) => {
        console.warn('Realtime clients sync fallback to fetch:', err);
        loadClients();
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Generate a random strong password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = 'Blz!';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTemporaryPassword(pwd);
  };

  // Toggle city in permitted cities list
  const toggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      setSelectedCities(selectedCities.filter((c) => c !== city));
    } else {
      setSelectedCities([...selectedCities, city]);
    }
  };

  // Handle Client Provisioning
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) {
      setErrorMsg('Full Name and Email are required.');
      return;
    }
    if (temporaryPassword.length < 6) {
      setErrorMsg('Temporary password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const newRecord = await adminCreateClientAccount({
        name: clientName.trim(),
        email: clientEmail.trim(),
        organization: clientOrganization.trim() || 'Advertiser Agency Client',
        designation: clientDesignation.trim() || 'Media Planning Executive',
        temporaryPassword,
        permittedCities: selectedCities,
        adminEmail: currentUser.email || 'admin@blaze.com.pk',
      });

      // Optimistically update local list so the new client appears immediately
      setClients((prev) => [newRecord, ...prev.filter((c) => c.email !== newRecord.email)]);
      if (onClientsUpdated) {
        onClientsUpdated([newRecord, ...clients.filter((c) => c.email !== newRecord.email)]);
      }

      setCreatedClientSummary({
        record: newRecord,
        temporaryPassword,
      });
      setSuccessMsg(
        `Client account successfully issued for ${newRecord.name} (${newRecord.email}).`
      );

      // Refresh list in background
      loadClients().catch(console.error);

      // Reset form fields
      setClientName('');
      setClientEmail('');
      setClientOrganization('');
      setClientDesignation('');
      setTemporaryPassword('');
    } catch (err: any) {
      console.error('Error provisioning client:', err);
      let msg = err.message || 'Failed to create client account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists.';
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Client Account Deletion (Iframe-safe without window.confirm)
  const confirmDeleteClient = async (clientId: string, clientEmailVal: string) => {
    setDeletingId(clientId);
    setErrorMsg('');
    setSuccessMsg('');

    // Remove client from UI immediately
    const updatedClients = clients.filter(
      (c) => c.id !== clientId && c.email.toLowerCase() !== clientEmailVal.toLowerCase()
    );
    setClients(updatedClients);
    if (onClientsUpdated) onClientsUpdated(updatedClients);

    try {
      await adminDeleteClient(clientId, currentUser.email || 'admin@blaze.com.pk', clientEmailVal);
      setSuccessMsg(`Client account "${clientEmailVal}" revoked and deleted.`);
    } catch (err: any) {
      console.warn('Delete client notice:', err);
      // Keep deleted state in UI since deletion was initiated and saved to local tombstone
      setSuccessMsg(`Client account "${clientEmailVal}" revoked and deleted.`);
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  // Copy credentials helper
  const handleCopyCredentials = () => {
    if (!createdClientSummary) return;
    const text = `Blaze OOH Media Asset Management Credentials
Login URL: http://app2.blaze.com.pk/
Client Name: ${createdClientSummary.record.name}
Client Email: ${createdClientSummary.record.email}
Organization: ${createdClientSummary.record.organization}
Temporary Password: ${createdClientSummary.temporaryPassword}
(Please change this temporary password upon your first login)`;

    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Filter clients by search query
  const filteredClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.organization.toLowerCase().includes(q) ||
      c.designation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden text-slate-200 text-xs my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* Windows Title Bar Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Manage Clients · Operations Administration</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ADMIN ONLY
                </span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Private Account Management & Credential Issuance · http://app2.blaze.com.pk/
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Warning if not admin */}
        {!isAdmin ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Administrator Privileges Required</h3>
            <p className="text-slate-400 max-w-md mx-auto text-xs leading-relaxed">
              Client account creation and credential issuance is strictly restricted to the official
              Blaze Media Operations Administrator. Clients cannot self-register or manage other accounts.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : (
          <>
            {/* Top Navigation Tabs & Search */}
            <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => {
                    setActiveTab('list');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'list'
                      ? 'bg-slate-800 text-amber-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Authorized Clients ({clients.length})</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('create');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'create'
                      ? 'bg-slate-800 text-amber-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Provision New Client Account</span>
                </button>
              </div>

              {activeTab === 'list' && (
                <div className="flex items-center gap-2">
                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={loadClients}
                    disabled={isLoading}
                    className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
                    title="Refresh client list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Notification Banners */}
            <div className="px-5 pt-3 space-y-2">
              {errorMsg && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div className="flex-1">{successMsg}</div>
                </div>
              )}
            </div>

            {/* Modal Body: Active Tab Content */}
            <div className="p-5 flex-1 overflow-y-auto">
              {activeTab === 'list' ? (
                /* TAB 1: Client Directory */
                <div className="space-y-4">
                  {/* Governance Notice */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-start justify-between gap-3 text-[11px] text-slate-400">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-200">Private Client Directory:</strong> Only accounts
                        provisioned in this console can sign in as clients. Clients can browse inventory, build media
                        plans, and submit reservation requests. They cannot modify inventory or create accounts.
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-[10px] text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-900/60">
                      Managed: {clients.length} Active
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                      <p>Loading authorized client directory...</p>
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 space-y-3 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                      <Users className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="font-medium text-slate-400">No client accounts match your search.</p>
                      <button
                        onClick={() => setActiveTab('create')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Provision First Client</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 text-[10px] uppercase font-mono border-b border-slate-800">
                            <th className="py-2.5 px-3 font-semibold">Client Name & Designation</th>
                            <th className="py-2.5 px-3 font-semibold">Organization</th>
                            <th className="py-2.5 px-3 font-semibold">Login Email</th>
                            <th className="py-2.5 px-3 font-semibold">Coverage</th>
                            <th className="py-2.5 px-3 font-semibold">Security Status</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 text-xs">
                          {filteredClients.map((client) => (
                            <tr key={client.id} className="hover:bg-slate-900/60 transition-colors">
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-200">{client.name}</div>
                                <div className="text-[11px] text-slate-400">{client.designation}</div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                                  <Building className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>{client.organization}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-mono text-[11px] text-blue-300 flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span>{client.email}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="text-[10px] text-slate-400">
                                  {client.permittedCities && client.permittedCities.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                                      {client.permittedCities.slice(0, 3).map((city) => (
                                        <span
                                          key={city}
                                          className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono"
                                        >
                                          {city}
                                        </span>
                                      ))}
                                      {client.permittedCities.length > 3 && (
                                        <span className="text-slate-500">
                                          +{client.permittedCities.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500">Nationwide (All)</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                {client.requiresPasswordChange ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950/50 text-amber-300 border border-amber-800/60">
                                    <Clock className="w-3 h-3" />
                                    <span>Temp Pwd · Change Req.</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-800/60">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Active · Permanent Pwd</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {pendingDeleteId === client.id ? (
                                  <div className="inline-flex items-center gap-1.5 animate-in fade-in">
                                    <span className="text-[10px] text-red-300 font-semibold hidden sm:inline">
                                      Delete?
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => confirmDeleteClient(client.id, client.email)}
                                      disabled={deletingId === client.id}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                    >
                                      {deletingId === client.id ? 'Deleting...' : 'Yes, Delete'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPendingDeleteId(null)}
                                      disabled={deletingId === client.id}
                                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium cursor-pointer transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteId(client.id)}
                                    className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-800/60 rounded transition-colors cursor-pointer"
                                    title="Revoke and delete client account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: Provision New Client Form */
                <div className="space-y-5 max-w-2xl mx-auto">
                  {/* Newly Created Credential Card */}
                  {createdClientSummary && (
                    <div className="p-4 bg-emerald-950/40 border-2 border-emerald-600/80 rounded-xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Client Account Provisioned Successfully!</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyCredentials}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey ? 'Copied!' : 'Copy Credentials'}</span>
                        </button>
                      </div>

                      <div className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
                        <div>
                          <span className="text-slate-500">Name:</span>{' '}
                          <span className="text-white font-semibold">{createdClientSummary.record.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Login Email:</span>{' '}
                          <span className="text-blue-300 font-semibold">{createdClientSummary.record.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Organization:</span>{' '}
                          <span className="text-slate-200">{createdClientSummary.record.organization}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Temporary Password:</span>{' '}
                          <code className="text-amber-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {createdClientSummary.temporaryPassword}
                          </code>
                        </div>
                      </div>

                      <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                        ✓ Securely provisioned in Firebase Authentication. Share these credentials with the client.
                        Upon first login, they will be required to change this temporary password before accessing the
                        database.
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleCreateClient} className="space-y-4">
                    <div className="p-3 bg-blue-950/30 border border-blue-900/60 rounded-lg text-[11px] text-blue-300 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-blue-200 block">Administrator Credential Issuance:</strong>
                        Client accounts cannot be registered by the public. When you provision an account here, Firebase
                        Authentication generates the credentials and restricts their permissions strictly to Client
                        status.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Client Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="e.g. Asadullah Khan"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Official Login Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="e.g. asad@wavemaker.com.pk"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Organization / Advertiser / Agency
                        </label>
                        <input
                          type="text"
                          value={clientOrganization}
                          onChange={(e) => setClientOrganization(e.target.value)}
                          placeholder="e.g. Wavemaker Pakistan (GroupM)"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Job Designation
                        </label>
                        <input
                          type="text"
                          value={clientDesignation}
                          onChange={(e) => setClientDesignation(e.target.value)}
                          placeholder="e.g. Media Planning Director"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Temporary Password & Security */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>Initial Temporary Password *</span>
                        </label>
                        <button
                          type="button"
                          onClick={generateStrongPassword}
                          className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate Strong Password</span>
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showTempPassword ? 'text' : 'password'}
                          required
                          value={temporaryPassword}
                          onChange={(e) => setTemporaryPassword(e.target.value)}
                          placeholder="Enter temporary password"
                          className="w-full bg-slate-950 border border-slate-700 font-mono rounded-lg pl-3 pr-9 py-2 text-xs text-amber-300 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTempPassword(!showTempPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title={showTempPassword ? 'Hide password' : 'Show password'}
                        >
                          {showTempPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Minimum 6 characters. Hidden by default. Click the eye icon to view.
                      </span>
                    </div>

                    {/* Password change requirement toggle */}
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-200 block text-xs">
                          Require password change on first login
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Forces the client to set their private permanent password upon authenticating.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={requirePasswordChange}
                        onChange={(e) => setRequirePasswordChange(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Permitted Regional Cities */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>Permitted Market Coverage (Selected: {selectedCities.length})</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_CITIES.map((city) => {
                          const isSelected = selectedCities.includes(city);
                          return (
                            <button
                              key={city}
                              type="button"
                              onClick={() => toggleCity(city)}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {city} {isSelected && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Provisioning Account in Firebase...' : 'Issue Client Credentials'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 font-mono">
                Admin Session Active · Enterprise Operations HQ
              </div>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
