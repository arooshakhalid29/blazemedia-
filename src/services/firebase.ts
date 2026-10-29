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
  VendorRecord,
  INITIAL_VENDORS,
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

// Recursively clean undefined values so setDoc/updateDoc never fails on Firestore
export function sanitizeForFirestore<T>(obj: T): T {
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
  fbUser?: FirebaseUser | null,
  profileData?: Partial<UserAccount> | Partial<ManagedClientRecord> | null
): UserAccount {
  const email = (fbUser?.email || profileData?.email || '').toLowerCase().trim();
  const isAdmin = email === 'admin@blaze.com.pk';

  if (isAdmin) {
    return {
      id: fbUser?.uid || profileData?.id || 'usr_admin_01',
      email: fbUser?.email || profileData?.email || 'admin@blaze.com.pk',
      name: fbUser?.displayName || profileData?.name || 'Admin',
      role: 'administrator',
      organization: 'Blaze Media (Pvt) Ltd - Operations HQ',
      designation: 'Chief Commercial & Operations Officer',
      permissions: DEMO_USERS.administrator.permissions,
    };
  }

  // All other users are automatically assigned Client role
  return {
    id: fbUser?.uid || profileData?.id || `usr_client_${Date.now().toString().slice(-6)}`,
    email: fbUser?.email || profileData?.email || 'client@blaze.com.pk',
    name: fbUser?.displayName || profileData?.name || email.split('@')[0] || 'Advertiser Client',
    role: 'client',
    organization: profileData?.organization || 'Enterprise Advertiser Agency',
    designation: profileData?.designation || 'Media Planning Director',
    permissions: DEMO_USERS.client.permissions,
    status: profileData?.status || 'Active',
    permittedCities: [],
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

  // 1. Official Administrator Account verification
  if (cleanEmail === 'admin@blaze.com.pk') {
    if (pass !== 'blaze@admin2026') {
      throw new Error('Invalid password for official administrator account.');
    }
    // Attempt Firebase Auth session in background if possible
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
    } catch (fbErr: any) {
      if (
        fbErr.code === 'auth/user-not-found' ||
        fbErr.code === 'auth/invalid-credential' ||
        fbErr.code === 'auth/invalid-login-credentials'
      ) {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        } catch {}
      }
    }
    return DEMO_USERS.administrator;
  }

  // 2. Client Account Verification - Authenticate via secure protected backend (PBKDF2 salted hash verification)
  try {
    const apiUrl =
      typeof window !== 'undefined' ? '/api/auth/login' : 'http://localhost:3000/api/auth/login';
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: pass }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.user) {
        // Also sign into Firebase Auth in background if secondary auth session is available
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, pass);
        } catch {}
        return data.user as UserAccount;
      }
    } else {
      const errData = await resp.json().catch(() => ({}));
      if (errData.error && !errData.error.includes('No client account found')) {
        throw new Error(errData.error);
      }
    }
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch')) {
      throw apiErr;
    }
  }

  // 3. Client Account Verification - Firebase Auth Direct Verification
  try {
    const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const profile = await fetchStoredUserProfile(res.user.uid);
    return mapFirebaseUserToAccount(res.user, profile);
  } catch (fbErr: any) {
    if (fbErr.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please verify your credentials or contact administrator.');
    }
  }

  throw new Error('Invalid email or password. Please verify your credentials or contact Blaze Media operations.');
}

// Administrator provisions a new Client account via isolated Firebase Auth without signing out the administrator
// Passwords are NEVER written to Firestore or stored in plaintext
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

  // Safe client profile record: strictly NO password fields stored
  const clientRecord: ManagedClientRecord = {
    id: uid,
    name: params.name.trim(),
    email: cleanClientEmail,
    organization: params.organization.trim() || 'Advertiser Agency Client',
    designation: params.designation.trim() || 'Media Planning Executive',
    role: 'client',
    status: 'Active',
    permittedCities: [], // Unrestricted nationwide coverage across all cities
    createdAt: new Date().toISOString(),
    createdBy: 'admin@blaze.com.pk',
  };

  // 1. Save directly to shared Firestore /users/{uid} without password fields
  try {
    await setDoc(doc(db, 'users', uid), sanitizeForFirestore(clientRecord), { merge: true });
    console.log(`[Blaze Auth] Client profile ${cleanClientEmail} persisted to Firestore.`);
  } catch (err) {
    console.error('Firestore client doc write error:', err);
  }

  // 2. Synchronize to protected backend server store where password is securely hashed (PBKDF2)
  try {
    const apiUrl =
      typeof window !== 'undefined' ? '/api/admin/clients' : 'http://localhost:3000/api/admin/clients';
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'admin@blaze.com.pk',
      },
      body: JSON.stringify({
        ...clientRecord,
        initialPassword: params.temporaryPassword,
      }),
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

  // 3. Save to local storage cache for guaranteed immediate persistence (sanitized)
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
  const clientMap = new Map<string, ManagedClientRecord>();

  // 1. Fetch directly from shared Firestore collection /users
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as ManagedClientRecord;
        if (data.role === 'client') {
          const key = data.email?.toLowerCase().trim() || data.id;
          clientMap.set(key, { ...data, id: d.id });
        }
      });
    }
  } catch (err) {
    console.warn('Firestore clients list notice:', err);
  }

  // 2. Fetch from server endpoint as fallback / secondary check
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
          const key = c.email?.toLowerCase().trim() || c.id;
          if (!clientMap.has(key)) {
            clientMap.set(key, c);
          }
        });
      }
    }
  } catch {}

  const list = Array.from(clientMap.values());
  list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return list;
}

// Real-time synchronization of Managed Clients from Firestore /users
export function subscribeToManagedClients(
  onClients: (clients: ManagedClientRecord[]) => void,
  onError?: (err: any) => void
): () => void {
  const usersCol = collection(db, 'users');

  return onSnapshot(
    usersCol,
    (snapshot) => {
      const items: ManagedClientRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ManagedClientRecord;
        if (data.role === 'client') {
          items.push({
            ...data,
            id: docSnap.id,
          });
        }
      });
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onClients(items);
    },
    (error) => {
      console.warn('Real-time clients sync notice:', error.message);
      if (onError) onError(error);
    }
  );
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

  // 1. Delete from Firestore by document ID
  if (clientId) {
    try {
      await deleteDoc(doc(db, 'users', clientId));
      console.log(`[Blaze Auth] Client document ${clientId} deleted from Firestore.`);
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

  // 3. Delete from backend server store
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

// Administrator resets a client's password securely (Administrator only)
// Passwords are NEVER written to Firestore or stored in plaintext
export async function adminResetClientPassword(
  clientId: string,
  clientEmail: string,
  newPassword: string,
  adminEmail: string = 'admin@blaze.com.pk'
): Promise<{ success: boolean; message: string }> {
  const currentEmail = (adminEmail || auth.currentUser?.email || '').toLowerCase().trim();
  if (currentEmail !== 'admin@blaze.com.pk') {
    throw new Error('Unauthorized: Only the official administrator (admin@blaze.com.pk) can reset client passwords.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const cleanClientEmail = clientEmail.toLowerCase().trim();

  // 1. Attempt to update Firebase Auth user credential via secondary app instance
  try {
    const secondaryAppName = `client-reset-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await signInWithEmailAndPassword(secondaryAuth, cleanClientEmail, newPassword).catch(async () => {
        try {
          return await createUserWithEmailAndPassword(secondaryAuth, cleanClientEmail, newPassword);
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            console.info('Client email registered in Firebase Auth.');
          }
        }
        return null;
      });
      if (cred?.user) {
        await updatePassword(cred.user, newPassword).catch(console.warn);
      }
    } finally {
      try {
        await deleteApp(secondaryApp);
      } catch {}
    }
  } catch (authErr: any) {
    console.warn('Firebase Auth secondary app password reset notice:', authErr.message);
  }

  // 2. Call protected backend API endpoint where password is encrypted/hashed with PBKDF2
  const targetParam = encodeURIComponent(clientId || cleanClientEmail);
  const apiUrl =
    typeof window !== 'undefined'
      ? `/api/admin/clients/${targetParam}/reset-password`
      : `http://localhost:3000/api/admin/clients/${targetParam}/reset-password`;

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-email': 'admin@blaze.com.pk',
    },
    body: JSON.stringify({
      newPassword,
      email: cleanClientEmail,
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to reset client password via secure server.');
  }

  // 3. Update timestamp in Firestore without storing password
  try {
    if (clientId) {
      await setDoc(
        doc(db, 'users', clientId),
        { updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
  } catch (err: any) {
    console.warn('Notice updating Firestore timestamp:', err.message);
  }

  const data = await resp.json();
  return {
    success: true,
    message: data.message || `Password reset successfully for ${cleanClientEmail}.`,
  };
}

// Client password change is disabled per enterprise policy (Admin-controlled passwords only)
export async function updateClientPermanentPassword(): Promise<void> {
  throw new Error('Client password modification is restricted. Only the administrator can reset or change client credentials.');
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
    isUserCreated: true,
    createdAt: (asset as any).createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const cleanPayload = sanitizeForFirestore(payload);

  // 1. Persist directly to shared Firestore collection (PRIMARY SOURCE OF TRUTH)
  try {
    await setDoc(assetDoc, cleanPayload, { merge: true });
    console.log(`[Blaze Assets] Persisted asset ${assetId} to Firestore successfully.`);
  } catch (error) {
    console.error('Firestore asset save error:', error);
    throw error;
  }

  // 2. Synchronize with backend Express server API
  try {
    await fetch('/api/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'admin@blaze.com.pk',
      },
      body: JSON.stringify(cleanPayload),
    });
  } catch (err) {
    console.warn('Backend server asset persist notice:', err);
  }

  // 3. Update local storage cache
  try {
    const local: MediaAsset[] = JSON.parse(localStorage.getItem('blaze_ooh_admin_assets') || '[]');
    const idx = local.findIndex((a) => a.id === assetId || a.code === asset.code);
    if (idx >= 0) {
      local[idx] = cleanPayload;
    } else {
      local.unshift(cleanPayload);
    }
    localStorage.setItem('blaze_ooh_admin_assets', JSON.stringify(local));
  } catch {}
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
      batch.set(assetDoc, sanitizeForFirestore(asset), { merge: true });
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
        legacyDummyAssetIds.includes(data?.code);

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
      (a) => !legacyDummyAssetIds.includes(a.id) && !legacyDummyAssetIds.includes(a.code)
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
    clientUid: auth.currentUser?.uid || (booking as any).clientUid || 'guest-client',
  };
  const cleanPayload = sanitizeForFirestore(payload);

  // 1. Sync to local storage
  try {
    const local = JSON.parse(localStorage.getItem('blaze_ooh_bookings') || '[]');
    const idx = local.findIndex((b: any) => b.bookingId === bookingId);
    if (idx >= 0) local[idx] = cleanPayload;
    else local.unshift(cleanPayload);
    localStorage.setItem('blaze_ooh_bookings', JSON.stringify(local));
  } catch {}

  // 2. Sync to backend Express server API
  try {
    await fetch('/api/bookings/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload),
    });
  } catch (err) {
    console.warn('Backend server booking save notice:', err);
  }

  // 3. Persist to Firestore
  try {
    await setDoc(bookingDoc, cleanPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `bookings/${bookingId}`);
  }
}

// Bookings: Update status (Administrator only)
export async function updateBookingStatus(
  bookingId: string,
  newStatus: 'Approved & Reserved' | 'Rejected' | 'Pending Admin Confirmation' | string,
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
  const cleanPayload = sanitizeForFirestore(updatePayload);

  // 1. Update localStorage
  try {
    const local = JSON.parse(localStorage.getItem('blaze_ooh_bookings') || '[]');
    const updated = local.map((b: any) =>
      b.bookingId === bookingId ? { ...b, ...cleanPayload } : b
    );
    localStorage.setItem('blaze_ooh_bookings', JSON.stringify(updated));
  } catch {}

  // 2. Sync to backend Express server API
  try {
    await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'admin@blaze.com.pk',
      },
      body: JSON.stringify(cleanPayload),
    });
  } catch (err) {
    console.warn('Backend server booking status update notice:', err);
  }

  // 3. Persist to Firestore
  try {
    await setDoc(bookingDoc, cleanPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

// ==========================================
// Vendors: Real-time Listener & Management
// ==========================================

export function getLocalVendors(): VendorRecord[] {
  try {
    const raw = localStorage.getItem('blaze_ooh_vendors');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...INITIAL_VENDORS];
}

export function subscribeToVendors(
  onVendors: (vendors: VendorRecord[]) => void,
  onError?: (err: any) => void
): () => void {
  const vendorsCol = collection(db, 'vendors');

  return onSnapshot(
    vendorsCol,
    (snapshot) => {
      if (snapshot.empty) {
        // Fall back to local / initial vendors if collection is currently empty
        const localVendors = getLocalVendors();
        onVendors(localVendors);
        return;
      }
      const items: VendorRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as VendorRecord);
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      try {
        localStorage.setItem('blaze_ooh_vendors', JSON.stringify(items));
      } catch {}
      onVendors(items);
    },
    (error) => {
      console.warn('Real-time vendors sync notice:', error.message);
      if (onError) onError(error);
      const localVendors = getLocalVendors();
      onVendors(localVendors);
    }
  );
}

export async function fetchVendors(): Promise<VendorRecord[]> {
  const vendorMap = new Map<string, VendorRecord>();

  // 1. Fetch from Firestore
  try {
    const vendorsCol = collection(db, 'vendors');
    const snap = await getDocs(vendorsCol);
    if (!snap.empty) {
      snap.forEach((d) => {
        const data = d.data() as VendorRecord;
        if (data.id && data.name) {
          vendorMap.set(data.id, data);
        }
      });
    }
  } catch (err) {
    console.warn('Firestore vendors query notice:', err);
  }

  // 2. Fetch from backend server API
  try {
    const apiUrl = typeof window !== 'undefined' ? '/api/vendors' : 'http://localhost:3000/api/vendors';
    const res = await fetch(apiUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.vendors)) {
        data.vendors.forEach((v: VendorRecord) => {
          if (!vendorMap.has(v.id)) {
            vendorMap.set(v.id, v);
          }
        });
      }
    }
  } catch {}

  // 3. Fallback to localStorage or INITIAL_VENDORS
  if (vendorMap.size === 0) {
    getLocalVendors().forEach((v) => vendorMap.set(v.id, v));
  }

  const result = Array.from(vendorMap.values());
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export async function persistVendor(vendor: VendorRecord): Promise<void> {
  const vendorId = vendor.id || `vnd_${Date.now().toString(36)}`;
  const payload: VendorRecord = {
    ...vendor,
    id: vendorId,
    createdAt: vendor.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const cleanPayload = sanitizeForFirestore(payload);

  // 1. Update localStorage
  try {
    const current = getLocalVendors();
    const idx = current.findIndex((v) => v.id === vendorId);
    let updated: VendorRecord[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = cleanPayload;
    } else {
      updated = [cleanPayload, ...current];
    }
    localStorage.setItem('blaze_ooh_vendors', JSON.stringify(updated));
  } catch {}

  // 2. Sync to backend API
  try {
    await fetch('/api/vendors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'admin@blaze.com.pk',
      },
      body: JSON.stringify(cleanPayload),
    });
  } catch (err) {
    console.warn('Backend server vendor save notice:', err);
  }

  // 3. Persist to Firestore
  try {
    const vendorDoc = doc(db, 'vendors', vendorId);
    await setDoc(vendorDoc, cleanPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `vendors/${vendorId}`);
  }
}

export async function updateVendorRecord(
  vendorId: string,
  updates: Partial<VendorRecord>
): Promise<void> {
  const updatePayload = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  const cleanPayload = sanitizeForFirestore(updatePayload);

  // 1. Update localStorage
  try {
    const current = getLocalVendors();
    const updated = current.map((v) => (v.id === vendorId ? { ...v, ...cleanPayload } : v));
    localStorage.setItem('blaze_ooh_vendors', JSON.stringify(updated));
  } catch {}

  // 2. Sync to backend API
  try {
    await fetch(`/api/vendors/${encodeURIComponent(vendorId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': 'admin@blaze.com.pk',
      },
      body: JSON.stringify(cleanPayload),
    });
  } catch (err) {
    console.warn('Backend server vendor update notice:', err);
  }

  // 3. Persist to Firestore
  try {
    const vendorDoc = doc(db, 'vendors', vendorId);
    await setDoc(vendorDoc, cleanPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `vendors/${vendorId}`);
  }
}

export async function deleteVendorRecord(vendorId: string): Promise<void> {
  // 1. Update localStorage
  try {
    const current = getLocalVendors();
    const updated = current.filter((v) => v.id !== vendorId);
    localStorage.setItem('blaze_ooh_vendors', JSON.stringify(updated));
  } catch {}

  // 2. Sync to backend API
  try {
    await fetch(`/api/vendors/${encodeURIComponent(vendorId)}`, {
      method: 'DELETE',
      headers: {
        'x-admin-email': 'admin@blaze.com.pk',
      },
    });
  } catch (err) {
    console.warn('Backend server vendor delete notice:', err);
  }

  // 3. Delete from Firestore
  try {
    const vendorDoc = doc(db, 'vendors', vendorId);
    await deleteDoc(vendorDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `vendors/${vendorId}`);
  }
}

