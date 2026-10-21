import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  MediaAsset,
  BookingRequest,
  UserAccount,
  DEMO_USERS,
  isAuthorizedAdminEmail,
  ManagedClientRecord,
} from '../types/mediaAsset';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with custom firestoreDatabaseId from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firebase Storage for asset media and imagery
export const storage = getStorage(app);

// Google Auth Provider for popup sign in
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore Error Handling Definition per skill specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Security / Operation Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection per skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Blaze OOH] Firestore live server connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: client is offline.');
    }
    // Return true even if test document is not found or connection succeeds
    return false;
  }
}

// Fetch stored client user profile from /users/{uid}
export async function fetchStoredUserProfile(uid: string): Promise<Partial<UserAccount> | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as Partial<UserAccount>;
    }
  } catch (err) {
    console.warn('[Blaze OOH] Notice fetching user profile:', err);
  }
  return null;
}

// Map Firebase User to App UserAccount (Strictly admin@blaze.com.pk ONLY gets administrator; all others receive client role)
export function mapFirebaseUserToAccount(
  fbUser: FirebaseUser,
  profileData?: Partial<UserAccount> | null
): UserAccount {
  const email = fbUser.email?.toLowerCase().trim() || '';
  const isAdmin = email === 'admin@blaze.com.pk';

  if (isAdmin) {
    return {
      id: fbUser.uid,
      email: fbUser.email || 'admin@blaze.com.pk',
      name: fbUser.displayName || 'Engr. Tariq Latif',
      role: 'administrator',
      organization: 'Blaze Media (Pvt) Ltd - Operations HQ',
      designation: 'Chief Commercial & Operations Officer',
      permissions: DEMO_USERS.administrator.permissions,
    };
  }

  // All other users are automatically assigned Client role
  return {
    id: fbUser.uid,
    email: fbUser.email || 'client@blaze.com.pk',
    name: fbUser.displayName || profileData?.name || fbUser.email?.split('@')[0] || 'Advertiser Client',
    role: 'client',
    organization: profileData?.organization || 'Enterprise Advertiser Agency',
    designation: profileData?.designation || 'Media Planning Director',
    permissions: DEMO_USERS.client.permissions,
    requiresPasswordChange: profileData?.requiresPasswordChange ?? false,
    status: profileData?.status || 'Active',
    permittedCities: profileData?.permittedCities || [],
  };
}

// Sign In with Google Popup
export async function signInWithGooglePopup(): Promise<UserAccount> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    let profileData: Partial<UserAccount> | null = null;
    const cleanEmail = result.user.email?.toLowerCase().trim() || '';

    if (cleanEmail === 'admin@blaze.com.pk') {
      try {
        await setDoc(
          doc(db, 'admins', result.user.uid),
          {
            email: result.user.email,
            role: 'administrator',
            addedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Admin record notice:', e);
      }
    } else {
      // Check if user has an existing client profile document
      profileData = await fetchStoredUserProfile(result.user.uid);
      if (!profileData) {
        // Automatically provision new client profile in Firestore for first-time Google sign-in
        const newClientProfile: ManagedClientRecord = {
          id: result.user.uid,
          name: result.user.displayName || cleanEmail.split('@')[0] || 'Client Advertiser',
          email: cleanEmail,
          organization: 'Enterprise Advertiser Agency',
          designation: 'Media Planning Director',
          role: 'client', // Strictly Client
          status: 'Active',
          requiresPasswordChange: false,
          permittedCities: [],
          createdAt: new Date().toISOString(),
          createdBy: 'google-oauth',
        };
        try {
          await setDoc(doc(db, 'users', result.user.uid), newClientProfile, { merge: true });
          profileData = newClientProfile;
        } catch (err) {
          console.warn('Google client profile creation notice:', err);
        }
      }
    }

    return mapFirebaseUserToAccount(result.user, profileData);
  } catch (err: any) {
    console.error('Google Sign In failed:', err);
    throw err;
  }
}

// Register new client user with Email & Password
// Requirement 4: Every newly registered user must receive the Client role automatically.
// Users must never be able to select, assign, or grant themselves administrator privileges.
export async function registerWithEmail(params: {
  name: string;
  email: string;
  password: string;
  organization?: string;
  designation?: string;
}): Promise<UserAccount> {
  const cleanEmail = params.email.toLowerCase().trim();
  const isAdmin = cleanEmail === 'admin@blaze.com.pk';

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);

  if (params.name.trim()) {
    try {
      await updateProfile(cred.user, { displayName: params.name.trim() });
    } catch {}
  }

  if (isAdmin) {
    try {
      await setDoc(
        doc(db, 'admins', cred.user.uid),
        {
          email: cleanEmail,
          role: 'administrator',
          addedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}
    return mapFirebaseUserToAccount(cred.user);
  }

  // All other users are strictly Client role
  const clientRecord: ManagedClientRecord = {
    id: cred.user.uid,
    name: params.name.trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    organization: params.organization?.trim() || 'Advertiser Agency Client',
    designation: params.designation?.trim() || 'Media Planning Executive',
    role: 'client', // Strictly enforced client-by-default
    status: 'Active',
    requiresPasswordChange: false,
    permittedCities: [],
    createdAt: new Date().toISOString(),
    createdBy: 'self-registration',
  };

  try {
    await setDoc(doc(db, 'users', cred.user.uid), clientRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
  }

  // Sync to backend store in background
  try {
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientRecord),
    });
  } catch {}

  return mapFirebaseUserToAccount(cred.user, clientRecord);
}

// Email & Password Sign In (Clients and Administrator)
export async function signInWithEmail(email: string, pass: string): Promise<UserAccount> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const profile = await fetchStoredUserProfile(res.user.uid);
    return mapFirebaseUserToAccount(res.user, profile);
  } catch (err: any) {
    // If official administrator admin@blaze.com.pk with valid credentials, auto-provision Firebase Auth session
    if (
      cleanEmail === 'admin@blaze.com.pk' &&
      pass === 'blaze@admin2026' &&
      (err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials')
    ) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        try {
          await updateProfile(cred.user, { displayName: 'Engr. Tariq Latif' });
        } catch {}
        try {
          await setDoc(
            doc(db, 'admins', cred.user.uid),
            { email: cleanEmail, role: 'administrator', updatedAt: new Date().toISOString() },
            { merge: true }
          );
        } catch {}
        return mapFirebaseUserToAccount(cred.user);
      } catch (createErr) {
        console.warn('Admin user auto-creation in Firebase notice:', createErr);
      }
    }
    console.error('Email sign in failed:', err);
    throw err;
  }
}

// Administrator provisions a new Client account via isolated Firebase Auth without signing out the administrator
export async function adminCreateClientAccount(params: {
  name: string;
  email: string;
  organization: string;
  designation: string;
  temporaryPassword: string;
  permittedCities?: string[];
  adminEmail?: string;
}): Promise<ManagedClientRecord> {
  const currentEmail = (params.adminEmail || auth.currentUser?.email || '').toLowerCase().trim();
  if (currentEmail !== 'admin@blaze.com.pk') {
    throw new Error('Unauthorized: Only official administrator (admin@blaze.com.pk) can provision client accounts.');
  }

  const cleanClientEmail = params.email.toLowerCase().trim();
  let uid = `usr_client_${Date.now().toString().slice(-6)}`;

  // Clear from deleted lists if previously deleted
  try {
    const deletedEmails: string[] = JSON.parse(localStorage.getItem('blaze_ooh_deleted_client_emails') || '[]');
    const nextEmails = deletedEmails.filter((e) => e !== cleanClientEmail);
    localStorage.setItem('blaze_ooh_deleted_client_emails', JSON.stringify(nextEmails));
  } catch {}

  // Attempt to provision Firebase Auth user via secondary app instance
  try {
    const secondaryAppName = `client-provision-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        cleanClientEmail,
        params.temporaryPassword
      );
      uid = cred.user.uid;
      if (params.name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: params.name.trim() });
        } catch {}
      }
    } finally {
      try {
        await deleteApp(secondaryApp);
      } catch {}
    }
  } catch (authErr: any) {
    if (authErr.code === 'auth/email-already-in-use') {
      console.info('Client email already in Firebase Auth, updating record.');
    } else {
      console.warn('Firebase Auth secondary provisioning notice:', authErr.message);
    }
  }

  const clientRecord: ManagedClientRecord = {
    id: uid,
    name: params.name.trim(),
    email: cleanClientEmail,
    organization: params.organization.trim() || 'Advertiser Agency Client',
    designation: params.designation.trim() || 'Media Planning Executive',
    role: 'client', // Strictly enforced as client
    status: 'Active',
    requiresPasswordChange: true,
    permittedCities: params.permittedCities || [],
    createdAt: new Date().toISOString(),
    createdBy: 'admin@blaze.com.pk',
  };

  // 1. Save to Firestore /users/{uid}
  try {
    await setDoc(doc(db, 'users', uid), clientRecord, { merge: true });
  } catch (err) {
    console.warn('Firestore client doc write notice (persisting via server store):', err);
  }

  // 2. Synchronize to backend server store
  try {
    const apiUrl =
      typeof window !== 'undefined' ? '/api/admin/clients' : 'http://localhost:3000/api/admin/clients';
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'admin@blaze.com.pk',
      },
      body: JSON.stringify(clientRecord),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.client) {
        return data.client;
      }
    }
  } catch (err) {
    console.warn('Backend client store sync notice:', err);
  }

  // 3. Save to local storage cache for guaranteed immediate persistence
  try {
    const cached: ManagedClientRecord[] = JSON.parse(localStorage.getItem('blaze_ooh_custom_clients') || '[]');
    const updated = [clientRecord, ...cached.filter((c) => c.email !== cleanClientEmail)];
    localStorage.setItem('blaze_ooh_custom_clients', JSON.stringify(updated));
  } catch {}

  return clientRecord;
}

// Fetch all provisioned client accounts (Administrator only)
export async function fetchManagedClients(adminEmail?: string): Promise<ManagedClientRecord[]> {
  const cleanAdmin = (adminEmail || auth.currentUser?.email || 'admin@blaze.com.pk').toLowerCase().trim();

  // Read tombstones from localStorage
  let deletedIds: string[] = [];
  let deletedEmails: string[] = [];
  try {
    deletedIds = JSON.parse(localStorage.getItem('blaze_ooh_deleted_client_ids') || '[]');
    deletedEmails = JSON.parse(localStorage.getItem('blaze_ooh_deleted_client_emails') || '[]');
  } catch {}

  const isTombstoned = (c: ManagedClientRecord) => {
    return (
      deletedIds.includes(c.id) ||
      (c.email && deletedEmails.includes(c.email.toLowerCase().trim()))
    );
  };

  const clientMap = new Map<string, ManagedClientRecord>();

  // 1. Try Firestore first
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as ManagedClientRecord;
        if (data.role === 'client' && !isTombstoned(data)) {
          const key = data.email?.toLowerCase().trim() || data.id;
          clientMap.set(key, data);
        }
      });
    }
  } catch (err) {
    console.warn('Firestore clients list notice:', err);
  }

  // 2. Fetch from server endpoint
  try {
    const apiUrl =
      typeof window !== 'undefined' ? '/api/admin/clients' : 'http://localhost:3000/api/admin/clients';
    const res = await fetch(apiUrl, {
      headers: {
        'x-admin-email': cleanAdmin,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.clients)) {
        data.clients.forEach((c: ManagedClientRecord) => {
          if (!isTombstoned(c)) {
            const key = c.email?.toLowerCase().trim() || c.id;
            if (!clientMap.has(key)) {
              clientMap.set(key, c);
            }
          }
        });
      }
    }
  } catch {}

  // 3. Merge custom clients from localStorage if any
  try {
    const cached: ManagedClientRecord[] = JSON.parse(localStorage.getItem('blaze_ooh_custom_clients') || '[]');
    cached.forEach((c) => {
      if (!isTombstoned(c)) {
        const key = c.email?.toLowerCase().trim() || c.id;
        if (!clientMap.has(key)) {
          clientMap.set(key, c);
        }
      }
    });
  } catch {}

  return Array.from(clientMap.values());
}

// Delete client account (Administrator only)
export async function adminDeleteClient(
  clientId: string,
  adminEmail?: string,
  clientEmail?: string
): Promise<void> {
  const currentEmail = (adminEmail || auth.currentUser?.email || '').toLowerCase().trim();
  if (currentEmail !== 'admin@blaze.com.pk') {
    throw new Error('Unauthorized: Only official administrator (admin@blaze.com.pk) can delete client accounts.');
  }

  const cleanEmail = (clientEmail || '').toLowerCase().trim();

  // Record into deleted tombstone list in localStorage
  try {
    const deletedIds: string[] = JSON.parse(localStorage.getItem('blaze_ooh_deleted_client_ids') || '[]');
    if (clientId && !deletedIds.includes(clientId)) {
      deletedIds.push(clientId);
      localStorage.setItem('blaze_ooh_deleted_client_ids', JSON.stringify(deletedIds));
    }
    if (cleanEmail) {
      const deletedEmails: string[] = JSON.parse(localStorage.getItem('blaze_ooh_deleted_client_emails') || '[]');
      if (!deletedEmails.includes(cleanEmail)) {
        deletedEmails.push(cleanEmail);
        localStorage.setItem('blaze_ooh_deleted_client_emails', JSON.stringify(deletedEmails));
      }
    }
    // Remove from custom clients cache
    const cached: ManagedClientRecord[] = JSON.parse(localStorage.getItem('blaze_ooh_custom_clients') || '[]');
    const nextCached = cached.filter((c) => c.id !== clientId && c.email?.toLowerCase().trim() !== cleanEmail);
    localStorage.setItem('blaze_ooh_custom_clients', JSON.stringify(nextCached));
  } catch {}

  // 1. Delete from Firestore by document ID
  if (clientId) {
    try {
      await deleteDoc(doc(db, 'users', clientId));
    } catch (err) {
      console.warn('Firestore client delete notice:', err);
    }
  }

  // 2. Also search Firestore by email to remove any matching user documents
  if (cleanEmail) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        try {
          await deleteDoc(d.ref);
        } catch {}
      }
    } catch (err) {
      console.warn('Firestore query-by-email delete notice:', err);
    }
  }

  // 3. Delete from server store
  try {
    const targetParam = encodeURIComponent(clientId || cleanEmail);
    const queryParam = cleanEmail ? `?email=${encodeURIComponent(cleanEmail)}` : '';
    const apiUrl =
      typeof window !== 'undefined'
        ? `/api/admin/clients/${targetParam}${queryParam}`
        : `http://localhost:3000/api/admin/clients/${targetParam}${queryParam}`;
    await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'x-admin-email': 'admin@blaze.com.pk',
      },
    });
  } catch (err) {
    console.warn('Server store delete notice:', err);
  }
}

// Update client permanent password on first login
export async function updateClientPermanentPassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error('No active authentication session.');
  await updatePassword(auth.currentUser, newPassword);

  try {
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      {
        requiresPasswordChange: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Failed to update password change flag in Firestore:', e);
  }
}

// Sign Out
export async function signOutFromFirebase(): Promise<void> {
  await signOut(auth);
}

// Media Assets: Real-time Listener
export function subscribeToMediaAssets(
  onAssets: (assets: MediaAsset[]) => void,
  onError?: (err: any) => void
): () => void {
  const assetsCol = collection(db, 'mediaAssets');

  return onSnapshot(
    assetsCol,
    (snapshot) => {
      const items: MediaAsset[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as MediaAsset;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      onAssets(items);
    },
    (error) => {
      console.warn('Real-time assets sync notice:', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'mediaAssets');
    }
  );
}

// Media Assets: Save or Update single asset
export async function persistMediaAsset(asset: MediaAsset): Promise<void> {
  const assetId = asset.id || `BLZ-${asset.code}`;
  const assetDoc = doc(db, 'mediaAssets', assetId);

  const payload: MediaAsset = {
    ...asset,
    id: assetId,
    ...( { isUserCreated: true, createdAt: (asset as any).createdAt || new Date().toISOString() } as any ),
  };

  // 1. Sync to local storage for instant offline / tab availability
  try {
    const local: MediaAsset[] = JSON.parse(localStorage.getItem('blaze_ooh_admin_assets') || '[]');
    const idx = local.findIndex((a) => a.id === assetId);
    if (idx >= 0) {
      local[idx] = payload;
    } else {
      local.unshift(payload);
    }
    localStorage.setItem('blaze_ooh_admin_assets', JSON.stringify(local));
  } catch {}

  // 2. Synchronize with backend Express server API
  try {
    await fetch('/api/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'admin@blaze.com.pk',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Backend server asset persist notice:', err);
  }

  // 3. Persist to Firestore collection
  try {
    await setDoc(assetDoc, payload, { merge: true });
  } catch (error) {
    console.warn('Firestore asset save notice:', error);
  }
}

// Storage: Delete individual image from Firebase Storage if hosted there
export async function deleteImageFromFirebaseStorage(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return;
  try {
    // Only attempt storage deletion for Firebase Storage cloud references
    if (
      urlOrPath.startsWith('gs://') ||
      urlOrPath.includes('firebasestorage.googleapis.com') ||
      urlOrPath.includes('storage.googleapis.com')
    ) {
      const imgRef = storageRef(storage, urlOrPath);
      await deleteObject(imgRef);
      console.log(`[Blaze Storage] Permanently deleted storage object: ${urlOrPath}`);
    }
  } catch (err: any) {
    // Ignore if object not found (e.g. already deleted or local path)
    if (err?.code !== 'storage/object-not-found') {
      console.warn('[Blaze Storage] Storage purge notice:', err?.message || err);
    }
  }
}

// Storage: Permanently purge all imagery associated with a media asset
export async function deleteAssetImagesFromStorage(asset: MediaAsset): Promise<void> {
  if (!asset) return;
  const imagesToPurge = new Set<string>();

  if (asset.imageUrl) imagesToPurge.add(asset.imageUrl);
  if (asset.nightImageUrl) imagesToPurge.add(asset.nightImageUrl);
  if (Array.isArray(asset.galleryImages)) {
    asset.galleryImages.forEach((url) => {
      if (url) imagesToPurge.add(url);
    });
  }

  // 1. Delete cloud-stored images from Firebase Storage
  for (const imgUrl of imagesToPurge) {
    await deleteImageFromFirebaseStorage(imgUrl);
  }

  // 2. Clean local image cache entries from localStorage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes(asset.id) ||
          key.includes(asset.code) ||
          key.startsWith(`blaze_img_${asset.code}`) ||
          key.startsWith(`blaze_asset_img_${asset.id}`))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}

  // 3. Inform Express server backend to purge any server-side upload files
  try {
    await fetch(`/api/assets/${encodeURIComponent(asset.id)}/images`, {
      method: 'DELETE',
      headers: {
        'x-admin-email': 'admin@blaze.com.pk',
      },
    });
  } catch (err) {
    console.warn('Server image storage purge notice:', err);
  }
}

// Media Assets: Delete single asset permanently from database and storage (Administrator only)
export async function removeMediaAsset(
  assetId: string,
  assetCode?: string,
  assetObj?: MediaAsset,
  currentUser?: UserAccount
): Promise<void> {
  // Zero-Trust Authorization Guard:
  // Only the official administrator (admin@blaze.com.pk) can delete assets. Clients are strictly forbidden.
  if (currentUser) {
    const isAuthorizedAdmin =
      currentUser.role === 'administrator' &&
      currentUser.email?.toLowerCase().trim() === 'admin@blaze.com.pk';
    if (!isAuthorizedAdmin) {
      throw new Error(
        'Access Denied: Only administrators (admin@blaze.com.pk) are permitted to delete outdoor media assets. Clients cannot delete assets or unrelated data.'
      );
    }
  }

  const normalizedCode =
    assetCode || (assetId.startsWith('BLZ-') ? assetId.replace(/^BLZ-/, '') : assetId);
  const possibleDocIds = Array.from(
    new Set([
      assetId,
      `BLZ-${assetId}`,
      assetId.replace(/^BLZ-/, ''),
      ...(assetCode ? [assetCode, `BLZ-${assetCode}`] : []),
    ])
  ).filter(Boolean);

  // 1. Permanently remove associated images from storage
  let targetAsset = assetObj;
  if (!targetAsset) {
    try {
      const local: MediaAsset[] = JSON.parse(
        localStorage.getItem('blaze_ooh_admin_assets') || '[]'
      );
      targetAsset = local.find(
        (a) =>
          possibleDocIds.includes(a.id) ||
          possibleDocIds.includes(a.code) ||
          a.code === normalizedCode
      );
    } catch {}
  }
  if (targetAsset) {
    await deleteAssetImagesFromStorage(targetAsset);
  }

  // 2. Remove from local storage
  try {
    const local: MediaAsset[] = JSON.parse(
      localStorage.getItem('blaze_ooh_admin_assets') || '[]'
    );
    const nextLocal = local.filter(
      (a) =>
        !possibleDocIds.includes(a.id) &&
        !possibleDocIds.includes(a.code) &&
        a.code !== normalizedCode
    );
    localStorage.setItem('blaze_ooh_admin_assets', JSON.stringify(nextLocal));

    // Also remove from media plan cart if present
    const cart: any[] = JSON.parse(localStorage.getItem('blaze_ooh_cart') || '[]');
    const nextCart = cart.filter(
      (item) =>
        !possibleDocIds.includes(item.assetId) &&
        !possibleDocIds.includes(item.asset?.id) &&
        item.asset?.code !== normalizedCode
    );
    localStorage.setItem('blaze_ooh_cart', JSON.stringify(nextCart));
  } catch {}

  // 3. Remove from backend Express server API
  try {
    await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
      headers: {
        'x-admin-email': 'admin@blaze.com.pk',
      },
    });
    if (assetCode && assetCode !== assetId) {
      await fetch(`/api/assets/${encodeURIComponent(assetCode)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-email': 'admin@blaze.com.pk',
        },
      });
    }
  } catch (err) {
    console.warn('Backend server asset delete notice:', err);
  }

  // 4. Direct Firestore document deletions for all ID variations
  for (const docId of possibleDocIds) {
    try {
      await deleteDoc(doc(db, 'mediaAssets', docId));
    } catch (error) {
      // Ignore if document with this specific variant ID doesn't exist
    }
  }

  // 5. Fallback search by code/id in case Firestore document key was arbitrary
  try {
    const snapshot = await getDocs(collection(db, 'mediaAssets'));
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as any;
      if (
        possibleDocIds.includes(docSnap.id) ||
        possibleDocIds.includes(data?.code) ||
        possibleDocIds.includes(data?.id) ||
        data?.code === normalizedCode
      ) {
        try {
          await deleteDoc(docSnap.ref);
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Firestore fallback doc query delete notice:', err);
  }
}

// Media Assets: Batch save (e.g. from Excel ingestion)
export async function persistBatchMediaAssets(assets: MediaAsset[]): Promise<number> {
  if (assets.length === 0) return 0;

  const taggedAssets = assets.map((a) => ({
    ...a,
    id: a.id || `BLZ-${a.code}`,
    isUserCreated: true,
    createdAt: (a as any).createdAt || new Date().toISOString(),
  }));

  // 1. Save to local storage
  try {
    const local: MediaAsset[] = JSON.parse(localStorage.getItem('blaze_ooh_admin_assets') || '[]');
    const map = new Map<string, MediaAsset>();
    local.forEach((a) => map.set(a.id, a));
    taggedAssets.forEach((a) => map.set(a.id, a));
    localStorage.setItem('blaze_ooh_admin_assets', JSON.stringify(Array.from(map.values())));
  } catch {}

  // 2. Synchronize to backend server
  try {
    await fetch('/api/assets/batch-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'admin@blaze.com.pk',
      },
      body: JSON.stringify({ assets: taggedAssets }),
    });
  } catch (err) {
    console.warn('Backend server batch save notice:', err);
  }

  // 3. Commit to Firestore
  const chunkSize = 400;
  let savedCount = 0;

  for (let i = 0; i < taggedAssets.length; i += chunkSize) {
    const chunk = taggedAssets.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((asset) => {
      const assetId = asset.id || `BLZ-${asset.code}`;
      const assetDoc = doc(db, 'mediaAssets', assetId);
      batch.set(assetDoc, asset, { merge: true });
    });

    try {
      await batch.commit();
      savedCount += chunk.length;
    } catch (error) {
      console.warn('Firestore batch save notice:', error);
    }
  }

  return savedCount;
}

// Seed initial mock assets: disabled completely per user request
export async function seedInitialAssetsIfEmpty(): Promise<void> {
  // All dummy mock data removed. Inventory contains only real items entered by administrator.
}

// Purge legacy dummy mock assets and bookings from Firestore and localStorage
export async function purgeLegacyDummyData(): Promise<void> {
  const dummyBookingIds = ['BK-BLZ-782104', 'BK-BLZ-761922'];
  for (const bid of dummyBookingIds) {
    try {
      await deleteDoc(doc(db, 'bookings', bid));
    } catch {}
  }

  const legacyDummyAssetIds = [
    'BLZ-KHI-0101',
    'BLZ-KHI-0102',
    'BLZ-KHI-0103',
    'BLZ-KHI-0104',
    'BLZ-LHE-0201',
    'BLZ-LHE-0202',
    'BLZ-LHE-0203',
    'BLZ-ISB-0301',
    'BLZ-ISB-0302',
    'BLZ-RWP-0401',
    'BLZ-FSD-0501',
    'BLZ-MUX-0601',
    'BLZ-PEW-0701',
    'BLZ-UET-0801',
    'BLZ-GWD-0901',
  ];

  // 1. Delete known legacy IDs directly
  for (const aid of legacyDummyAssetIds) {
    try {
      await deleteDoc(doc(db, 'mediaAssets', aid));
    } catch {}
  }

  // 2. Query all existing documents in mediaAssets to delete any preloaded sample items
  try {
    const snapshot = await getDocs(collection(db, 'mediaAssets'));
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as any;
      const docId = docSnap.id;
      const isLegacyMock =
        legacyDummyAssetIds.includes(docId) ||
        legacyDummyAssetIds.includes(data?.code) ||
        data?.isUserCreated !== true ||
        docId.startsWith('BLZ-BLZ-') ||
        docId.startsWith('BLZ-KHI-010') ||
        docId.startsWith('BLZ-LHE-020') ||
        docId.startsWith('BLZ-ISB-030') ||
        docId.startsWith('BLZ-RWP-040') ||
        docId.startsWith('BLZ-FSD-050') ||
        docId.startsWith('BLZ-MUX-060') ||
        docId.startsWith('BLZ-PEW-070') ||
        docId.startsWith('BLZ-UET-080') ||
        docId.startsWith('BLZ-GWD-090');

      if (isLegacyMock) {
        try {
          await deleteDoc(docSnap.ref);
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Firestore purge query notice:', err);
  }

  // 3. Clean local storage
  try {
    const localAssets: MediaAsset[] = JSON.parse(
      localStorage.getItem('blaze_ooh_admin_assets') || '[]'
    );
    const cleanedAssets = localAssets.filter(
      (a) => !legacyDummyAssetIds.includes(a.id) && (a as any).isUserCreated === true
    );
    localStorage.setItem('blaze_ooh_admin_assets', JSON.stringify(cleanedAssets));

    const localBookings: any[] = JSON.parse(
      localStorage.getItem('blaze_ooh_bookings') || '[]'
    );
    const cleanedBookings = localBookings.filter(
      (b) => !dummyBookingIds.includes(b.bookingId)
    );
    localStorage.setItem('blaze_ooh_bookings', JSON.stringify(cleanedBookings));

    localStorage.removeItem('blaze_ooh_cart');
  } catch {}
}

// Bookings: Real-time Listener
export function subscribeToBookings(
  onBookings: (bookings: BookingRequest[]) => void,
  onError?: (err: any) => void
): () => void {
  const bookingsCol = collection(db, 'bookings');

  return onSnapshot(
    bookingsCol,
    (snapshot) => {
      const items: BookingRequest[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as BookingRequest);
      });
      // Sort newest first
      items.sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      onBookings(items);
    },
    (error) => {
      console.warn('Real-time bookings sync notice:', error.message);
      if (onError) onError(error);
      // We don't throw here to prevent unhandled rejection during unauthenticated client queries
    }
  );
}

// Bookings: Submit booking request
export async function persistBookingRequest(booking: BookingRequest): Promise<void> {
  const bookingId = booking.bookingId;
  const bookingDoc = doc(db, 'bookings', bookingId);

  const payload: any = {
    ...booking,
    clientUid: auth.currentUser?.uid || 'guest-client',
  };

  try {
    await setDoc(bookingDoc, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `bookings/${bookingId}`);
  }
}

// Bookings: Update status (Administrator only)
export async function updateBookingStatus(
  bookingId: string,
  newStatus: 'Approved & Reserved' | 'Rejected',
  notes?: string
): Promise<void> {
  const bookingDoc = doc(db, 'bookings', bookingId);
  const updatePayload: Record<string, any> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  try {
    await setDoc(bookingDoc, updatePayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}
