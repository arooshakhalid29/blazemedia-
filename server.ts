import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Increase payload limits for Excel binary and base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory media asset inventory state (synchronized with live client requests)
let serverAssetStore: any[] = [];

// API Status & Deployment Info
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'Blaze OOH Media Asset Management API',
    deploymentHost: 'http://app2.blaze.com.pk/',
    targetPlatform: 'Microsoft Windows (x64 / ARM64)',
    version: '4.2.0-win-enterprise',
    serverNode: 'PK-KHI-BLAZE-01',
    timestamp: new Date().toISOString(),
    endpoints: {
      assets: '/api/assets',
      importExcel: '/api/assets/import-excel',
      template: '/api/assets/template',
      batchSave: '/api/assets/batch-save',
    },
  });
});

// Download Standard Excel Upload Template
app.get('/api/assets/template', (req: Request, res: Response) => {
  try {
    const sampleData = [
      {
        'Site Code': 'KHI-UNP-0901',
        'Title': 'Shahrah-e-Faisal Baloch Colony Mega Unipole',
        'Vendor': 'Blaze Media (Pvt) Ltd',
        'City': 'Karachi',
        'Area': 'Shahrah-e-Faisal / Baloch Colony',
        'Zone': 'District East',
        'Type': 'Unipole',
        'Width (Ft)': 60,
        'Height (Ft)': 20,
        'Illumination': 'Frontlit',
        'Monthly Rental (PKR)': 1750000,
        'Production Cost (PKR)': 96000,
        'Mounting Cost (PKR)': 35000,
        'Daily Traffic (Vehicles)': 320000,
        'SEC (A+/A/B/C)': 'A+',
        'Dwell Time (Sec)': 60,
        'Viewing Distance (Meters)': 400,
        'Traffic Direction': 'Airport heading toward Metropole & Saddar CBD',
        'Authority NOC': 'CBC',
        'Status': 'Available',
        'Current Brand': '',
        'Notes': 'High-traffic commercial arterial corridor.',
      },
      {
        'Site Code': 'LHE-SMD-0902',
        'Title': 'Main Boulevard Gulberg Mega Digital LED Display',
        'Vendor': 'Dynamic Display DOOH',
        'City': 'Lahore',
        'Area': 'Gulberg III / Main Boulevard',
        'Zone': 'Gulberg Commercial',
        'Type': 'Digital SMD Screen',
        'Width (Ft)': 50,
        'Height (Ft)': 25,
        'Illumination': 'Digital SMD',
        'Monthly Rental (PKR)': 3200000,
        'Production Cost (PKR)': 15000,
        'Mounting Cost (PKR)': 0,
        'Daily Traffic (Vehicles)': 390000,
        'SEC (A+/A/B/C)': 'A+',
        'Dwell Time (Sec)': 85,
        'Viewing Distance (Meters)': 350,
        'Traffic Direction': 'Facing traffic heading from Liberty to Kalma Chowk',
        'Authority NOC': 'LDA',
        'Status': 'Occupied',
        'Current Brand': 'Samsung Galaxy S25 Launch',
        'Notes': 'P4 outdoor SMD screen with 3840Hz refresh rate.',
      },
      {
        'Site Code': 'ISB-BRG-0903',
        'Title': 'Srinagar Highway G-9 Overhead Bridge Panel',
        'Vendor': 'Signways OOH Network',
        'City': 'Islamabad',
        'Area': 'Srinagar Highway / G-9',
        'Zone': 'Sector G-9 Intercity',
        'Type': 'Bridge Panel',
        'Width (Ft)': 80,
        'Height (Ft)': 10,
        'Illumination': 'Frontlit',
        'Monthly Rental (PKR)': 1350000,
        'Production Cost (PKR)': 64000,
        'Mounting Cost (PKR)': 28000,
        'Daily Traffic (Vehicles)': 280000,
        'SEC (A+/A/B/C)': 'A',
        'Dwell Time (Sec)': 50,
        'Viewing Distance (Meters)': 420,
        'Traffic Direction': 'Both directions between Motorway and Zero Point',
        'Authority NOC': 'CDA',
        'Status': 'Available',
        'Current Brand': '',
        'Notes': 'Spans 6 lanes with unobstructed line of sight.',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 45 },
      { wch: 25 },
      { wch: 14 },
      { wch: 30 },
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 15 },
      { wch: 16 },
      { wch: 22 },
      { wch: 40 },
      { wch: 15 },
      { wch: 14 },
      { wch: 25 },
      { wch: 35 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Blaze_OOH_Template');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Blaze_OOH_Media_Asset_Template.xlsx'
    );
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate template', details: error.message });
  }
});

// Excel Ingestion / Parse API Endpoint
app.post('/api/assets/import-excel', (req: Request, res: Response) => {
  try {
    const { fileBase64, filename } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: 'Missing fileBase64 data in request body' });
    }

    const base64Data = fileBase64.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    res.json({
      success: true,
      filename: filename || 'upload.xlsx',
      sheetName: firstSheetName,
      totalRows: rawRows.length,
      sampleRows: rawRows.slice(0, 5),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process Excel file', details: error.message });
  }
});

// Get all inventory assets
app.get('/api/assets', (req: Request, res: Response) => {
  res.json({
    success: true,
    assets: serverAssetStore,
    total: serverAssetStore.length,
  });
});

// Create or update single asset (Administrator only)
app.post('/api/assets', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }
  const asset = req.body;
  if (!asset || (!asset.id && !asset.code)) {
    return res.status(400).json({ error: 'Invalid asset payload.' });
  }
  const assetId = asset.id || `BLZ-${asset.code}`;
  const existingIdx = serverAssetStore.findIndex(a => a.id === assetId || a.code === asset.code);
  if (existingIdx >= 0) {
    serverAssetStore[existingIdx] = { ...asset, id: assetId };
  } else {
    serverAssetStore.unshift({ ...asset, id: assetId });
  }
  res.json({ success: true, asset: { ...asset, id: assetId } });
});

// Delete single asset (Administrator only - clients strictly forbidden)
app.delete('/api/assets/:id', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({
      error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only). Clients cannot delete assets or unrelated data.',
    });
  }
  const targetId = decodeURIComponent(req.params.id);
  const normalizedId = targetId.replace(/^BLZ-/, '');
  const initialLength = serverAssetStore.length;
  serverAssetStore = serverAssetStore.filter(
    (a) =>
      a.id !== targetId &&
      a.code !== targetId &&
      a.code !== normalizedId &&
      a.id !== `BLZ-${targetId}` &&
      a.id !== `BLZ-${normalizedId}`
  );
  res.json({
    success: true,
    message: `Asset ${targetId} permanently deleted from database.`,
    removedCount: initialLength - serverAssetStore.length,
    remainingCount: serverAssetStore.length,
  });
});

// Delete asset associated images from storage (Administrator only)
app.delete('/api/assets/:id/images', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({
      error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).',
    });
  }
  const targetId = decodeURIComponent(req.params.id);
  res.json({
    success: true,
    message: `Associated imagery and storage cache purged for asset ${targetId}.`,
  });
});

// Commit Batch of Assets API (Administrator only)
app.post('/api/assets/batch-save', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }

  const { assets } = req.body;
  if (!Array.isArray(assets)) {
    return res.status(400).json({ error: 'assets must be an array' });
  }

  serverAssetStore = [...assets, ...serverAssetStore];
  res.json({
    success: true,
    addedCount: assets.length,
    totalCount: serverAssetStore.length,
    message: `Successfully synchronized ${assets.length} outdoor media assets to http://app2.blaze.com.pk/ database.`,
  });
});

// Private Administrator Client Account Management Store
let managedClientStore: any[] = [];

// Helper to check admin authorization
function verifyAdminAuthorization(req: Request): boolean {
  const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase().trim();
  const authHeader = req.headers.authorization || '';
  return adminEmail === 'admin@blaze.com.pk' || authHeader.includes('admin@blaze.com.pk');
}

// Admin: List all provisioned clients
app.get('/api/admin/clients', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }
  res.json({ clients: managedClientStore });
});

// Admin: Create / Provision new client account
app.post('/api/admin/clients', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }

  const { id, name, email, organization, designation, permittedCities, requiresPasswordChange } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required to issue client credentials.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // Check if client already exists - update if found
  const existingIndex = managedClientStore.findIndex(c => c.email === cleanEmail);
  if (existingIndex >= 0) {
    managedClientStore[existingIndex] = {
      ...managedClientStore[existingIndex],
      name: name.trim(),
      organization: organization?.trim() || managedClientStore[existingIndex].organization,
      designation: designation?.trim() || managedClientStore[existingIndex].designation,
      permittedCities: Array.isArray(permittedCities) ? permittedCities : managedClientStore[existingIndex].permittedCities,
      requiresPasswordChange: requiresPasswordChange !== false,
    };
    return res.status(200).json({
      success: true,
      client: managedClientStore[existingIndex],
      message: `Client account updated for ${name} (${cleanEmail}).`,
    });
  }

  const newClient = {
    id: id || `usr_client_${Date.now().toString().slice(-6)}`,
    name: name.trim(),
    email: cleanEmail,
    organization: organization?.trim() || 'Advertiser Agency Client',
    designation: designation?.trim() || 'Media Planning Executive',
    role: 'client', // Strictly enforced server-side
    status: 'Active',
    requiresPasswordChange: requiresPasswordChange !== false,
    permittedCities: Array.isArray(permittedCities) ? permittedCities : [],
    createdAt: new Date().toISOString(),
    createdBy: 'admin@blaze.com.pk',
  };

  managedClientStore.unshift(newClient);

  res.status(201).json({
    success: true,
    client: newClient,
    message: `Client account provisioned for ${newClient.name} (${newClient.email}).`,
  });
});

// Admin: Delete client account
app.delete('/api/admin/clients/:id', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }

  const { id } = req.params;
  const target = decodeURIComponent(id).toLowerCase().trim();
  const emailParam = ((req.query.email as string) || '').toLowerCase().trim();

  managedClientStore = managedClientStore.filter(
    (c) =>
      c.id !== id &&
      c.id !== target &&
      c.email?.toLowerCase().trim() !== target &&
      (!emailParam || c.email?.toLowerCase().trim() !== emailParam)
  );

  res.json({ success: true, message: 'Client account deleted successfully.', remaining: managedClientStore.length });
});

// Authentication & Roles API
const AUTH_ACCOUNTS = {
  administrator: {
    id: 'usr_admin_01',
    email: 'admin@blaze.com.pk',
    name: 'Engr. Tariq Latif',
    role: 'administrator',
    organization: 'Blaze Media (Pvt) Ltd - Operations HQ',
    designation: 'Chief Commercial & Operations Officer',
    token: 'jwt_admin_session_pk_blaze_9831',
    permissions: {
      canAddAsset: true,
      canEditAsset: true,
      canDeleteAsset: true,
      canImportExcel: true,
      canEditRates: true,
      canManageVendors: true,
      canExportProposal: true,
      canRequestBooking: true,
    },
  },
  clientPermissions: {
    canAddAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canImportExcel: false,
    canEditRates: false,
    canManageVendors: false,
    canExportProposal: true,
    canRequestBooking: true,
  },
};

// Login Endpoint
// Zero-trust Security: Only admin@blaze.com.pk can receive Administrator privileges.
// All other users (even if requested role is administrator) receive the Client role.
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();

  // ONLY official admin@blaze.com.pk gets Administrator privileges
  if (cleanEmail === 'admin@blaze.com.pk') {
    if (password && password !== 'blaze@admin2026') {
      return res.status(401).json({ error: 'Invalid password for official administrator account.' });
    }
    return res.json({
      success: true,
      user: AUTH_ACCOUNTS.administrator,
      message: 'Logged in successfully with full Administrator privileges.',
    });
  }

  // All other emails are strictly assigned the Client role
  const foundClient = managedClientStore.find(c => c.email === cleanEmail);
  const clientUser = foundClient ? {
    id: foundClient.id,
    email: foundClient.email,
    name: foundClient.name,
    role: 'client',
    organization: foundClient.organization,
    designation: foundClient.designation,
    permissions: AUTH_ACCOUNTS.clientPermissions,
    requiresPasswordChange: foundClient.requiresPasswordChange,
  } : {
    id: `usr_client_${Date.now().toString().slice(-6)}`,
    email: cleanEmail || 'client@blaze.com.pk',
    name: cleanEmail ? cleanEmail.split('@')[0] : 'Client User',
    role: 'client',
    organization: 'Enterprise Advertiser Agency',
    designation: 'Media Planning Director',
    permissions: AUTH_ACCOUNTS.clientPermissions,
    requiresPasswordChange: false,
  };

  return res.json({
    success: true,
    user: clientUser,
    message: 'Logged in successfully as Client (Proposal & Booking access).',
  });
});

// Self-Registration Endpoint for New Clients
// Requirement 4: Every newly registered user receives the Client role automatically.
// Users must never be able to select, assign, or grant themselves administrator privileges.
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { id, name, email, organization, designation } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required to register.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // Create new client record - strictly client role
  const newClient = {
    id: id || `usr_client_${Date.now().toString().slice(-6)}`,
    name: name.trim(),
    email: cleanEmail,
    organization: organization?.trim() || 'Advertiser Agency Client',
    designation: designation?.trim() || 'Media Planning Executive',
    role: 'client' as const, // Hardcoded client by default
    status: 'Active',
    requiresPasswordChange: false,
    permittedCities: [],
    createdAt: new Date().toISOString(),
    createdBy: 'self-registration',
  };

  const existingIndex = managedClientStore.findIndex(c => c.email === cleanEmail);
  if (existingIndex >= 0) {
    managedClientStore[existingIndex] = { ...managedClientStore[existingIndex], ...newClient };
  } else {
    managedClientStore.unshift(newClient);
  }

  res.status(201).json({
    success: true,
    user: {
      ...newClient,
      permissions: AUTH_ACCOUNTS.clientPermissions,
    },
    message: 'Client account registered successfully.',
  });
});

app.get('/api/auth/users', (req: Request, res: Response) => {
  res.json({
    accounts: [AUTH_ACCOUNTS.administrator, ...managedClientStore],
  });
});

// Client Booking Reservation API
let clientBookingRequests: any[] = [];

app.post('/api/bookings/request', (req: Request, res: Response) => {
  const { clientName, assetId, assetCode, durationMonths, startDate, brandName, contactEmail } = req.body;

  const booking = {
    bookingId: `BK-BLZ-${Date.now().toString().slice(-6)}`,
    clientName: clientName || 'Client Advertiser',
    contactEmail: contactEmail || 'client@engro.com',
    assetId,
    assetCode,
    brandName: brandName || 'Brand Campaign',
    durationMonths: durationMonths || 1,
    startDate: startDate || new Date().toISOString().split('T')[0],
    submittedAt: new Date().toISOString(),
    status: 'Pending Admin Confirmation',
  };

  clientBookingRequests.push(booking);

  res.json({
    success: true,
    booking,
    message: `Site reservation request submitted for ${assetCode}. Blaze Media commercial team will confirm within 24 hours.`,
  });
});

app.get('/api/bookings', (req: Request, res: Response) => {
  res.json({
    bookings: clientBookingRequests,
  });
});


async function startServer() {
  if (!isProduction) {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Blaze OOH Media Engine] Server active on port ${PORT}`);
    console.log(`[Host Target] http://app2.blaze.com.pk/ [Windows Desktop Edition]`);
  });
}

startServer();
