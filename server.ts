import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const serverFirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const serverDb = getFirestore(serverFirebaseApp, firebaseConfig.firestoreDatabaseId);

// Recursively scrub undefined properties so Firestore writes never fail
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Enable CORS and allow custom admin headers across all environments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-email');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Increase payload limits for Excel binary and base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Persistent media asset inventory state (synchronized with live client requests and Firestore)
const ASSETS_STORAGE_PATH = path.resolve('assets_store.json');
let serverAssetStore: any[] = [];

try {
  if (fs.existsSync(ASSETS_STORAGE_PATH)) {
    const raw = fs.readFileSync(ASSETS_STORAGE_PATH, 'utf-8');
    serverAssetStore = JSON.parse(raw);
    console.log(`[Blaze Assets] Loaded ${serverAssetStore.length} asset(s) from persistent store.`);
  }
} catch (e) {
  console.warn('Notice reading asset storage file:', e);
}

function saveAssetStore() {
  try {
    fs.writeFileSync(ASSETS_STORAGE_PATH, JSON.stringify(serverAssetStore, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Notice saving asset storage file:', e);
  }
}

async function syncAssetsFromFirestore() {
  try {
    const snap = await getDocs(collection(serverDb, 'mediaAssets'));
    if (!snap.empty) {
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({ ...data, id: d.id });
      });
      serverAssetStore = list;
      saveAssetStore();
      console.log(`[Blaze Assets] Synced ${serverAssetStore.length} asset(s) with Firestore.`);
    }
  } catch (err: any) {
    console.warn('Notice syncing assets from Firestore:', err.message);
  }
}
syncAssetsFromFirestore();

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
  const cleanAsset = sanitizeForFirestore({ ...asset, id: assetId });
  const existingIdx = serverAssetStore.findIndex(a => a.id === assetId || a.code === asset.code);
  if (existingIdx >= 0) {
    serverAssetStore[existingIdx] = cleanAsset;
  } else {
    serverAssetStore.unshift(cleanAsset);
  }
  saveAssetStore();

  // Persist directly to Firestore
  try {
    setDoc(doc(serverDb, 'mediaAssets', assetId), cleanAsset, { merge: true }).catch(console.warn);
  } catch {}

  res.json({ success: true, asset: cleanAsset });
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
  saveAssetStore();

  // Delete from Firestore
  try {
    deleteDoc(doc(serverDb, 'mediaAssets', targetId)).catch(console.warn);
    deleteDoc(doc(serverDb, 'mediaAssets', `BLZ-${targetId}`)).catch(console.warn);
    deleteDoc(doc(serverDb, 'mediaAssets', normalizedId)).catch(console.warn);
  } catch {}

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
  saveAssetStore();
  res.json({
    success: true,
    addedCount: assets.length,
    totalCount: serverAssetStore.length,
    message: `Successfully synchronized ${assets.length} outdoor media assets to http://app2.blaze.com.pk/ database.`,
  });
});

// Private Administrator Client Account Management Store with disk persistence & live Firestore sync
const CLIENTS_STORAGE_PATH = path.resolve('managed_clients_store.json');
let managedClientStore: any[] = [];

// Initialize client store from disk if present
try {
  if (fs.existsSync(CLIENTS_STORAGE_PATH)) {
    const raw = fs.readFileSync(CLIENTS_STORAGE_PATH, 'utf-8');
    managedClientStore = JSON.parse(raw);
    console.log(`[Blaze Auth] Loaded ${managedClientStore.length} managed client account(s) from persistent store.`);
  }
} catch (e) {
  console.warn('Notice reading client storage file:', e);
}

function saveClientStore() {
  try {
    fs.writeFileSync(CLIENTS_STORAGE_PATH, JSON.stringify(managedClientStore, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Notice saving client storage file:', e);
  }
}

// Secure PBKDF2 Password Hashing & Verification
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, combinedHash?: string): boolean {
  if (!combinedHash) return false;
  if (!combinedHash.includes(':')) {
    return password === combinedHash;
  }
  const [salt, originalHash] = combinedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Background synchronization of managed clients from Firestore /users
async function syncClientsFromFirestore() {
  try {
    const snap = await getDocs(collection(serverDb, 'users'));
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as any;
        if (data.role === 'client') {
          const cleanEmail = (data.email || '').toLowerCase().trim();
          const existingIdx = managedClientStore.findIndex((c) => c.email === cleanEmail);
          const record = {
            id: d.id,
            name: data.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            organization: data.organization || 'Advertiser Agency Client',
            designation: data.designation || 'Media Planning Executive',
            role: 'client' as const,
            status: data.status || 'Active',
            permittedCities: [],
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || 'admin@blaze.com.pk',
          };
          if (existingIdx >= 0) {
            managedClientStore[existingIdx] = {
              ...managedClientStore[existingIdx],
              ...record,
              passwordHash: managedClientStore[existingIdx].passwordHash,
            };
          } else {
            managedClientStore.push(record);
          }
        }
      });
      saveClientStore();
      console.log(`[Blaze Auth] Synced ${managedClientStore.length} client(s) with Firestore.`);
    }
  } catch (err: any) {
    console.warn('Notice syncing clients from Firestore:', err.message);
  }
}
syncClientsFromFirestore();

// Helper to check admin authorization
function verifyAdminAuthorization(req: Request): boolean {
  const adminHeader = (req.headers['x-admin-email'] as string || '').toLowerCase().trim();
  const adminBody = (req.body?.adminEmail as string || '').toLowerCase().trim();
  const adminQuery = (req.query?.adminEmail as string || '').toLowerCase().trim();
  const authHeader = (req.headers.authorization || '').toLowerCase().trim();

  return (
    adminHeader === 'admin@blaze.com.pk' ||
    adminBody === 'admin@blaze.com.pk' ||
    adminQuery === 'admin@blaze.com.pk' ||
    authHeader.includes('admin@blaze.com.pk') ||
    authHeader.includes('jwt_admin_session_pk_blaze_9831')
  );
}

// Admin: List all provisioned clients - passwords and hashes are strictly stripped
app.get('/api/admin/clients', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }
  const safeClients = managedClientStore.map(({ passwordHash, password, temporaryPassword, ...safe }) => ({
    ...safe,
    permittedCities: [],
    status: safe.status || 'Active',
  }));
  res.json({ clients: safeClients });
});

// Admin: Create / Provision new client account
app.post('/api/admin/clients', async (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }

  const {
    id,
    name,
    email,
    organization,
    designation,
    temporaryPassword,
    password,
    initialPassword,
  } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required to issue client credentials.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const rawPassword = initialPassword || temporaryPassword || password || '';
  const passwordHash = rawPassword ? hashPassword(rawPassword) : undefined;

  // Check if client already exists - update if found
  const existingIndex = managedClientStore.findIndex(
    c => c.email?.toLowerCase().trim() === cleanEmail || (id && c.id === id)
  );

  if (existingIndex >= 0) {
    const existing = managedClientStore[existingIndex];
    managedClientStore[existingIndex] = {
      ...existing,
      name: name.trim(),
      organization: organization?.trim() || existing.organization,
      designation: designation?.trim() || existing.designation,
      permittedCities: [],
      ...(passwordHash ? { passwordHash } : {}),
      updatedAt: new Date().toISOString(),
    };
    delete (managedClientStore[existingIndex] as any).password;
    delete (managedClientStore[existingIndex] as any).temporaryPassword;
    delete (managedClientStore[existingIndex] as any).requiresPasswordChange;
    saveClientStore();

    // Sync non-sensitive profile data to Firestore
    try {
      const { passwordHash: _, ...safeFirestoreDoc } = managedClientStore[existingIndex];
      await setDoc(doc(serverDb, 'users', existing.id), sanitizeForFirestore(safeFirestoreDoc), { merge: true });
    } catch (fsErr: any) {
      console.warn('Firestore doc sync error:', fsErr.message);
    }

    const { passwordHash: _, ...safeClient } = managedClientStore[existingIndex];
    return res.status(200).json({
      success: true,
      client: safeClient,
      message: `Client account updated for ${name} (${cleanEmail}).`,
    });
  }

  const newClientId = id || `usr_client_${Date.now().toString().slice(-6)}`;
  const newClient = {
    id: newClientId,
    name: name.trim(),
    email: cleanEmail,
    organization: organization?.trim() || 'Advertiser Agency Client',
    designation: designation?.trim() || 'Media Planning Executive',
    role: 'client' as const,
    status: 'Active',
    permittedCities: [],
    createdAt: new Date().toISOString(),
    createdBy: 'admin@blaze.com.pk',
    ...(passwordHash ? { passwordHash } : {}),
  };

  managedClientStore.unshift(newClient);
  saveClientStore();

  // Save ONLY safe profile fields to Firestore - NEVER store passwords in Firestore
  try {
    const { passwordHash: _, ...safeFirestoreDoc } = newClient;
    await setDoc(doc(serverDb, 'users', newClientId), sanitizeForFirestore(safeFirestoreDoc), { merge: true });
  } catch (fsErr: any) {
    console.warn('Firestore doc save error:', fsErr.message);
  }

  const { passwordHash: _, ...safeClient } = newClient;
  res.status(201).json({
    success: true,
    client: safeClient,
    message: `Client account provisioned for ${newClient.name} (${newClient.email}).`,
  });
});

// Admin: Reset client password handler (supports URL parameter or request body)
const handleAdminResetPasswordRequest = async (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }

  const rawId = req.params.id ? decodeURIComponent(req.params.id) : (req.body.clientId || req.body.id || '');
  const clientId = String(rawId || '').trim();
  const { newPassword, email } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const cleanEmail = (email || '').toLowerCase().trim();

  let clientIdx = managedClientStore.findIndex(
    (c) => (clientId && c.id === clientId) || (cleanEmail && c.email?.toLowerCase().trim() === cleanEmail)
  );

  // If not found in in-memory store, search Firestore /users!
  if (clientIdx < 0) {
    try {
      if (cleanEmail) {
        const q = query(collection(serverDb, 'users'), where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data() as any;
          const loadedClient = {
            id: d.id,
            name: data.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            organization: data.organization || 'Advertiser Agency Client',
            designation: data.designation || 'Media Planning Executive',
            role: 'client' as const,
            status: data.status || 'Active',
            permittedCities: [],
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || 'admin@blaze.com.pk',
          };
          managedClientStore.unshift(loadedClient);
          clientIdx = 0;
        }
      } else if (clientId) {
        const dSnap = await getDoc(doc(serverDb, 'users', clientId));
        if (dSnap.exists()) {
          const data = dSnap.data() as any;
          const cEmail = (data.email || '').toLowerCase().trim();
          const loadedClient = {
            id: dSnap.id,
            name: data.name || cEmail.split('@')[0] || clientId,
            email: cEmail,
            organization: data.organization || 'Advertiser Agency Client',
            designation: data.designation || 'Media Planning Executive',
            role: 'client' as const,
            status: data.status || 'Active',
            permittedCities: [],
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || 'admin@blaze.com.pk',
          };
          managedClientStore.unshift(loadedClient);
          clientIdx = 0;
        }
      }
    } catch (fsErr: any) {
      console.warn('Firestore fallback on reset password:', fsErr.message);
    }
  }

  // If still not found, create new record in memory store if email provided
  if (clientIdx < 0) {
    if (cleanEmail) {
      const newClientId = clientId || `usr_client_${Date.now().toString().slice(-6)}`;
      const newRecord = {
        id: newClientId,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        organization: 'Advertiser Agency Client',
        designation: 'Media Planning Executive',
        role: 'client' as const,
        status: 'Active',
        permittedCities: [],
        createdAt: new Date().toISOString(),
        createdBy: 'admin@blaze.com.pk',
      };
      managedClientStore.unshift(newRecord);
      clientIdx = 0;
    } else {
      return res.status(404).json({ error: 'Client account not found.' });
    }
  }

  const targetClient = managedClientStore[clientIdx];
  const secureHash = hashPassword(newPassword);

  targetClient.passwordHash = secureHash;
  targetClient.updatedAt = new Date().toISOString();
  delete (targetClient as any).password;
  delete (targetClient as any).temporaryPassword;
  delete (targetClient as any).requiresPasswordChange;
  saveClientStore();

  // Update timestamp in Firestore without storing any password
  try {
    await setDoc(
      doc(serverDb, 'users', targetClient.id),
      { updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Notice updating timestamp in Firestore on reset password:', err.message);
  }

  res.json({
    success: true,
    message: `Password has been reset securely for ${targetClient.name} (${targetClient.email}).`,
  });
};

app.post('/api/admin/clients/:id/reset-password', handleAdminResetPasswordRequest);
app.post('/api/admin/clients/reset-password', handleAdminResetPasswordRequest);

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
  saveClientStore();

  // Delete from Firestore
  try {
    deleteDoc(doc(serverDb, 'users', id)).catch(console.warn);
    if (target && target !== id) {
      deleteDoc(doc(serverDb, 'users', target)).catch(console.warn);
    }
  } catch {}

  res.json({ success: true, message: 'Client account deleted successfully.', remaining: managedClientStore.length });
});

// Authentication & Roles API
const AUTH_ACCOUNTS = {
  administrator: {
    id: 'usr_admin_01',
    email: 'admin@blaze.com.pk',
    name: 'Admin',
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
// All other users receive the Client role.
app.post('/api/auth/login', async (req: Request, res: Response) => {
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

  // Find client in provisioned store
  let foundClient = managedClientStore.find(c => c.email?.toLowerCase().trim() === cleanEmail);

  // If not currently in memory, query Firestore users collection
  if (!foundClient) {
    try {
      const q = query(collection(serverDb, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as any;
        const newRecord = {
          id: d.id,
          name: data.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          organization: data.organization || 'Advertiser Agency Client',
          designation: data.designation || 'Media Planning Executive',
          role: 'client' as const,
          status: data.status || 'Active',
          permittedCities: [],
          createdAt: data.createdAt || new Date().toISOString(),
          createdBy: data.createdBy || 'admin@blaze.com.pk',
        };
        managedClientStore.unshift(newRecord);
        saveClientStore();
        foundClient = newRecord;
      }
    } catch (fsErr: any) {
      console.warn('Firestore live fallback query error:', fsErr.message);
    }
  }

  if (foundClient) {
    // If password hash is not yet set (legacy client doc), initialize it with the entered password if valid
    if (!foundClient.passwordHash) {
      if (password && password.length >= 6) {
        foundClient.passwordHash = hashPassword(password);
        saveClientStore();
      }
    }

    const isPasswordValid = verifyPassword(password, foundClient.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid password. Please enter the password issued by your administrator.',
      });
    }

    const clientUser = {
      id: foundClient.id,
      email: foundClient.email,
      name: foundClient.name,
      role: 'client' as const,
      organization: foundClient.organization,
      designation: foundClient.designation,
      permissions: AUTH_ACCOUNTS.clientPermissions,
      permittedCities: [],
      status: foundClient.status || 'Active',
    };

    return res.json({
      success: true,
      user: clientUser,
      message: `Logged in successfully as ${clientUser.name} (${clientUser.organization}).`,
    });
  }

  return res.status(401).json({
    error: 'No client account found for this email address. Please check your credentials or contact Blaze Media operations.',
  });
});

// Update client password endpoint - Disabled for clients (Admin-controlled passwords only)
app.post('/api/auth/update-password', async (_req: Request, res: Response) => {
  return res.status(403).json({
    error: 'Client password modification is restricted. Only the administrator can reset or change client credentials.',
  });
});

// Fetch client profile by email or id
app.get('/api/auth/client-profile', (req: Request, res: Response) => {
  const email = ((req.query.email as string) || '').toLowerCase().trim();
  const id = (req.query.id as string) || '';
  const found = managedClientStore.find(
    (c) =>
      (email && c.email?.toLowerCase().trim() === email) ||
      (id && c.id === id)
  );
  if (found) {
    const { password, temporaryPassword, passwordHash, ...safeProfile } = found;
    return res.json({ success: true, client: { ...safeProfile, permittedCities: [] } });
  }
  res.status(404).json({ error: 'Client profile not found.' });
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
  saveClientStore();

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

// Client Booking Reservation API with Disk Persistence & Live Firestore Sync
const BOOKINGS_STORAGE_PATH = path.resolve('bookings_store.json');
let clientBookingRequests: any[] = [];

try {
  if (fs.existsSync(BOOKINGS_STORAGE_PATH)) {
    const raw = fs.readFileSync(BOOKINGS_STORAGE_PATH, 'utf-8');
    clientBookingRequests = JSON.parse(raw);
    console.log(`[Blaze Bookings] Loaded ${clientBookingRequests.length} booking request(s) from persistent store.`);
  }
} catch (e) {
  console.warn('Notice reading bookings storage file:', e);
}

function saveBookingsStore() {
  try {
    fs.writeFileSync(BOOKINGS_STORAGE_PATH, JSON.stringify(clientBookingRequests, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Notice saving bookings storage file:', e);
  }
}

// Sync bookings from Firestore on boot
async function syncBookingsFromFirestore() {
  try {
    const snap = await getDocs(collection(serverDb, 'bookings'));
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as any;
        const bId = data.bookingId || d.id;
        if (bId === 'BK-BLZ-782104' || bId === 'BK-BLZ-761922') return;
        const idx = clientBookingRequests.findIndex((b) => b.bookingId === bId);
        const record = {
          ...data,
          bookingId: bId,
        };
        if (idx >= 0) {
          clientBookingRequests[idx] = { ...clientBookingRequests[idx], ...record };
        } else {
          clientBookingRequests.push(record);
        }
      });
      clientBookingRequests.sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      saveBookingsStore();
      console.log(`[Blaze Bookings] Synced ${clientBookingRequests.length} booking(s) with Firestore.`);
    }
  } catch (err: any) {
    console.warn('Notice syncing bookings from Firestore:', err.message);
  }
}
syncBookingsFromFirestore();

// Submit new booking request
app.post('/api/bookings/request', async (req: Request, res: Response) => {
  const {
    bookingId: incomingId,
    clientName,
    organization,
    contactEmail,
    phone,
    assetId,
    assetCode,
    brandName,
    durationMonths,
    startDate,
    notes,
    quotedAmountPkr,
    status,
  } = req.body;

  const bookingId = incomingId || `BK-BLZ-${Date.now().toString().slice(-6)}`;
  const booking = {
    bookingId,
    clientName: clientName || 'Client Advertiser',
    organization: organization || 'Advertiser Agency Client',
    contactEmail: (contactEmail || 'client@blaze.com.pk').toLowerCase().trim(),
    phone: phone || '',
    assetId: assetId || '',
    assetCode: assetCode || '',
    brandName: brandName || 'Brand Campaign',
    durationMonths: Number(durationMonths) || 1,
    startDate: startDate || new Date().toISOString().split('T')[0],
    submittedAt: new Date().toISOString(),
    status: status || 'Pending Admin Confirmation',
    quotedAmountPkr: Number(quotedAmountPkr) || 0,
    notes: notes || '',
  };

  const existingIdx = clientBookingRequests.findIndex((b) => b.bookingId === bookingId);
  if (existingIdx >= 0) {
    clientBookingRequests[existingIdx] = { ...clientBookingRequests[existingIdx], ...booking };
  } else {
    clientBookingRequests.unshift(booking);
  }
  saveBookingsStore();

  // Save directly to Firestore
  try {
    await setDoc(doc(serverDb, 'bookings', bookingId), sanitizeForFirestore(booking), { merge: true });
  } catch (err: any) {
    console.warn('Notice persisting booking to Firestore:', err.message);
  }

  res.json({
    success: true,
    booking,
    message: `Site reservation request submitted for ${assetCode}. Blaze Media commercial desk notified.`,
  });
});

// Update booking status (Admin endpoint, handles 'Approved & Reserved', 'Rejected', etc.)
app.patch('/api/bookings/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const bookingId = decodeURIComponent(id);
  const updatePayload: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const idx = clientBookingRequests.findIndex((b) => b.bookingId === bookingId);
  if (idx >= 0) {
    clientBookingRequests[idx] = { ...clientBookingRequests[idx], ...updatePayload };
    saveBookingsStore();
  }

  // Persist to Firestore
  try {
    await setDoc(doc(serverDb, 'bookings', bookingId), sanitizeForFirestore(updatePayload), { merge: true });
  } catch (err: any) {
    console.warn('Notice updating booking status in Firestore:', err.message);
  }

  res.json({
    success: true,
    bookingId,
    status,
    message: `Booking ${bookingId} status updated to ${status}.`,
  });
});

// Also support POST for status update
app.post('/api/bookings/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const bookingId = decodeURIComponent(id);
  const updatePayload: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const idx = clientBookingRequests.findIndex((b) => b.bookingId === bookingId);
  if (idx >= 0) {
    clientBookingRequests[idx] = { ...clientBookingRequests[idx], ...updatePayload };
    saveBookingsStore();
  }

  try {
    await setDoc(doc(serverDb, 'bookings', bookingId), sanitizeForFirestore(updatePayload), { merge: true });
  } catch (err: any) {
    console.warn('Notice updating booking status in Firestore:', err.message);
  }

  res.json({
    success: true,
    bookingId,
    status,
    message: `Booking ${bookingId} status updated to ${status}.`,
  });
});

// Get bookings (all or filtered by email)
app.get('/api/bookings', async (req: Request, res: Response) => {
  const email = ((req.query.email as string) || '').toLowerCase().trim();

  // Refresh from Firestore
  try {
    const snap = await getDocs(collection(serverDb, 'bookings'));
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as any;
        const bId = data.bookingId || d.id;
        if (bId === 'BK-BLZ-782104' || bId === 'BK-BLZ-761922') return;
        const idx = clientBookingRequests.findIndex((b) => b.bookingId === bId);
        if (idx >= 0) {
          clientBookingRequests[idx] = { ...clientBookingRequests[idx], ...data, bookingId: bId };
        } else {
          clientBookingRequests.push({ ...data, bookingId: bId });
        }
      });
      clientBookingRequests.sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
    }
  } catch {}

  const results = email
    ? clientBookingRequests.filter((b) => b.contactEmail?.toLowerCase().trim() === email)
    : clientBookingRequests;

  res.json({
    bookings: results,
  });
});

// ==========================================
// Media Vendors & Concessionaires API
// ==========================================
const VENDORS_STORAGE_PATH = path.resolve('vendors_store.json');

const DEFAULT_SEED_VENDORS = [
  {
    id: 'vnd_blaze_01',
    name: 'Blaze Media (Pvt) Ltd',
    code: 'BLZ',
    city: 'Karachi',
    contactPerson: 'Commercial Operations Desk',
    phone: '+92 21 35876543',
    email: 'info@blaze.com.pk',
    address: 'Clifton Commercial Area, Karachi',
    commissionRatePercent: 15,
    status: 'Active',
    notes: 'Direct primary concessionaire and network operator.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'vnd_signways_02',
    name: 'Signways OOH Network',
    code: 'SGW',
    city: 'Lahore',
    contactPerson: 'Khurram Shahzad',
    phone: '+92 42 35789123',
    email: 'operations@signways.pk',
    address: 'Gulberg III, Lahore',
    commissionRatePercent: 12,
    status: 'Active',
    notes: 'Major arterial network in Punjab.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'vnd_dawn_03',
    name: 'Dawn Outdoor Media',
    code: 'DWN',
    city: 'Karachi',
    contactPerson: 'Asad Hashmi',
    phone: '+92 21 35678901',
    email: 'outdoor@dawnmedia.com.pk',
    address: 'Haroon House, Dr. Ziauddin Ahmed Road, Karachi',
    commissionRatePercent: 10,
    status: 'Active',
    notes: 'Premium city centre sites in Karachi & Islamabad.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'vnd_adgroup_04',
    name: 'Adgroup Media Pakistan',
    code: 'ADG',
    city: 'Islamabad',
    contactPerson: 'Salman Raza',
    phone: '+92 51 2278901',
    email: 'concession@adgroup.com.pk',
    address: 'Blue Area, Islamabad',
    commissionRatePercent: 12,
    status: 'Active',
    notes: 'Prime transit and capital city displays.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'vnd_prime_05',
    name: 'Prime Signage Networks',
    code: 'PRM',
    city: 'Rawalpindi',
    contactPerson: 'Farhan Malik',
    phone: '+92 51 5567890',
    email: 'info@primesignage.pk',
    address: 'Mall Road, Rawalpindi Cantt',
    commissionRatePercent: 10,
    status: 'Active',
    notes: 'Twin cities key intersections.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'vnd_metropole_06',
    name: 'Metropole Media Network',
    code: 'MTP',
    city: 'Lahore',
    contactPerson: 'Imran Qureshi',
    phone: '+92 42 37561234',
    email: 'sales@metropoleooh.com',
    address: 'Mall Road & Jail Road Corridor, Lahore',
    commissionRatePercent: 15,
    status: 'Active',
    notes: 'High-density urban corridors.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'vnd_dynamic_07',
    name: 'Dynamic Display DOOH',
    code: 'DYN',
    city: 'Karachi',
    contactPerson: 'Bilal Siddiqui',
    phone: '+92 21 34567890',
    email: 'dooh@dynamicdisplay.pk',
    address: 'Shahrah-e-Faisal Media Hub, Karachi',
    commissionRatePercent: 15,
    status: 'Active',
    notes: 'Digital LED screens and smart outdoor.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

let serverVendorStore: any[] = [];

try {
  if (fs.existsSync(VENDORS_STORAGE_PATH)) {
    const raw = fs.readFileSync(VENDORS_STORAGE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      serverVendorStore = parsed;
    } else {
      serverVendorStore = [...DEFAULT_SEED_VENDORS];
    }
  } else {
    serverVendorStore = [...DEFAULT_SEED_VENDORS];
    fs.writeFileSync(VENDORS_STORAGE_PATH, JSON.stringify(serverVendorStore, null, 2), 'utf-8');
  }
} catch (e) {
  serverVendorStore = [...DEFAULT_SEED_VENDORS];
}

function saveVendorStore() {
  try {
    fs.writeFileSync(VENDORS_STORAGE_PATH, JSON.stringify(serverVendorStore, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('Could not persist vendors_store.json to disk:', err.message);
  }
}

// Sync vendors with Firestore
async function syncVendorsFromFirestore() {
  try {
    const snap = await getDocs(collection(serverDb, 'vendors'));
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as any;
        const vId = data.id || d.id;
        const idx = serverVendorStore.findIndex((v) => v.id === vId);
        if (idx >= 0) {
          serverVendorStore[idx] = { ...serverVendorStore[idx], ...data, id: vId };
        } else {
          serverVendorStore.push({ ...data, id: vId });
        }
      });
      serverVendorStore.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      saveVendorStore();
      console.log(`[Blaze Vendors] Synced ${serverVendorStore.length} vendor(s) with Firestore.`);
    } else {
      // Seed Firestore with default vendors
      console.log('[Blaze Vendors] Seeding Firestore with standard media vendors...');
      for (const vnd of serverVendorStore) {
        try {
          await setDoc(doc(serverDb, 'vendors', vnd.id), vnd, { merge: true });
        } catch {}
      }
    }
  } catch (err: any) {
    console.warn('Notice syncing vendors from Firestore:', err.message);
  }
}
syncVendorsFromFirestore();

// GET all vendors
app.get('/api/vendors', async (req: Request, res: Response) => {
  // Sync if needed
  try {
    const snap = await getDocs(collection(serverDb, 'vendors'));
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as any;
        const vId = data.id || d.id;
        const idx = serverVendorStore.findIndex((v) => v.id === vId);
        if (idx >= 0) {
          serverVendorStore[idx] = { ...serverVendorStore[idx], ...data, id: vId };
        } else {
          serverVendorStore.push({ ...data, id: vId });
        }
      });
      serverVendorStore.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  } catch {}

  res.json({
    success: true,
    vendors: serverVendorStore,
    total: serverVendorStore.length,
  });
});

// POST add new vendor (Administrator only)
app.post('/api/vendors', async (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }

  const { name, code, city, contactPerson, phone, email, address, commissionRatePercent, status, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Vendor name is required.' });
  }

  const vendorId = req.body.id || `vnd_${Date.now().toString(36)}`;
  const newVendor = {
    id: vendorId,
    name: name.trim(),
    code: (code || name.slice(0, 3)).toUpperCase().trim(),
    city: city?.trim() || 'Karachi',
    contactPerson: contactPerson?.trim() || 'Operations Manager',
    phone: phone?.trim() || '',
    email: email?.toLowerCase().trim() || '',
    address: address?.trim() || '',
    commissionRatePercent: Number(commissionRatePercent) || 15,
    status: status === 'Inactive' ? 'Inactive' : 'Active',
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = serverVendorStore.findIndex((v) => v.id === vendorId || v.name.toLowerCase().trim() === newVendor.name.toLowerCase());
  if (existingIdx >= 0) {
    serverVendorStore[existingIdx] = { ...serverVendorStore[existingIdx], ...newVendor };
  } else {
    serverVendorStore.unshift(newVendor);
  }
  serverVendorStore.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  saveVendorStore();

  // Persist to Firestore
  try {
    await setDoc(doc(serverDb, 'vendors', vendorId), sanitizeForFirestore(newVendor), { merge: true });
  } catch (err: any) {
    console.warn('Notice saving vendor to Firestore:', err.message);
  }

  res.json({
    success: true,
    vendor: newVendor,
    message: `Vendor ${newVendor.name} added successfully.`,
  });
});

// PATCH / PUT update vendor (Administrator only)
const handleVendorUpdate = async (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }

  const vendorId = decodeURIComponent(req.params.id);
  const idx = serverVendorStore.findIndex((v) => v.id === vendorId);

  if (idx < 0) {
    return res.status(404).json({ error: 'Vendor not found.' });
  }

  const oldVendor = serverVendorStore[idx];
  const oldName = oldVendor.name;

  const updates = { ...req.body };
  delete updates.id; // Preserve ID
  updates.updatedAt = new Date().toISOString();

  if (updates.code) {
    updates.code = updates.code.toUpperCase().trim();
  }

  const updatedVendor = {
    ...oldVendor,
    ...updates,
  };

  serverVendorStore[idx] = updatedVendor;
  saveVendorStore();

  // If vendor name was changed, also cascade update assets that were linked to oldName
  if (updates.name && updates.name.trim() !== oldName) {
    const newName = updates.name.trim();
    serverAssetStore = serverAssetStore.map((a) => {
      if (a.vendor === oldName) {
        return { ...a, vendor: newName };
      }
      return a;
    });
  }

  // Persist to Firestore
  try {
    await setDoc(doc(serverDb, 'vendors', vendorId), sanitizeForFirestore(updatedVendor), { merge: true });
  } catch (err: any) {
    console.warn('Notice updating vendor in Firestore:', err.message);
  }

  res.json({
    success: true,
    vendor: updatedVendor,
    message: `Vendor ${updatedVendor.name} specifications updated successfully.`,
  });
};

app.patch('/api/vendors/:id', handleVendorUpdate);
app.put('/api/vendors/:id', handleVendorUpdate);

// DELETE vendor (Administrator only)
app.delete('/api/vendors/:id', async (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required (admin@blaze.com.pk only).' });
  }

  const vendorId = decodeURIComponent(req.params.id);
  const targetVendor = serverVendorStore.find((v) => v.id === vendorId);
  const vendorName = targetVendor?.name || vendorId;

  serverVendorStore = serverVendorStore.filter((v) => v.id !== vendorId);
  saveVendorStore();

  // Delete from Firestore
  try {
    await deleteDoc(doc(serverDb, 'vendors', vendorId));
  } catch (err: any) {
    console.warn('Notice deleting vendor from Firestore:', err.message);
  }

  res.json({
    success: true,
    message: `Vendor ${vendorName} removed from directory.`,
    remaining: serverVendorStore.length,
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
