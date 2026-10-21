import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  City,
  MediaType,
  MediaAsset,
  FilterState,
  MediaPlanItem,
  ViewMode,
  Currency,
  UserAccount,
  UserRole,
  DEMO_USERS,
  BookingRequest,
  INITIAL_BOOKINGS,
  STANDARD_VENDORS,
  AssetStatus,
  isAuthorizedAdminEmail,
} from './types/mediaAsset';
import { LEGACY_DUMMY_ASSET_IDS } from './data/mockAssets';
import { WindowsTitleBar } from './components/desktop/WindowsTitleBar';
import { DesktopRibbon } from './components/desktop/DesktopRibbon';
import { FilterDock } from './components/desktop/FilterDock';
import { WindowsStatusBar } from './components/desktop/WindowsStatusBar';
import { AssetGridView } from './components/views/AssetGridView';
import { AssetTableView } from './components/views/AssetTableView';
import { AssetMapView } from './components/views/AssetMapView';
import { AudienceAnalyticsView } from './components/views/AudienceAnalyticsView';
import { CampaignCartModal } from './components/views/CampaignCartModal';
import { AssetDetailModal } from './components/modals/AssetDetailModal';
import { NewAssetModal } from './components/modals/NewAssetModal';
import { ExcelImportModal } from './components/modals/ExcelImportModal';
import { LoginModal } from './components/modals/LoginModal';
import { BookingsModal } from './components/modals/BookingsModal';
import { EditAssetModal } from './components/modals/EditAssetModal';
import { BookingRequestModal } from './components/modals/BookingRequestModal';
import { PakistanCitiesModal } from './components/modals/PakistanCitiesModal';
import { ManageClientsModal } from './components/modals/ManageClientsModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { StartingLoginWindow } from './components/modals/StartingLoginWindow';
import { DeleteAssetConfirmationModal } from './components/modals/DeleteAssetConfirmationModal';
import { CheckCircle2, AlertCircle, Info, ShieldCheck, User } from 'lucide-react';
import {
  testFirestoreConnection,
  purgeLegacyDummyData,
  subscribeToMediaAssets,
  persistMediaAsset,
  removeMediaAsset,
  persistBatchMediaAssets,
  subscribeToBookings,
  persistBookingRequest,
  updateBookingStatus,
  auth,
  mapFirebaseUserToAccount,
  fetchStoredUserProfile,
  signOutFromFirebase,
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  selectedCities: [],
  selectedVendors: [],
  selectedTypes: [],
  selectedIlluminations: [],
  selectedSECs: [],
  selectedStatuses: [],
  minAreaSqFt: 0,
  maxAreaSqFt: 5000,
  minMonthlyCostPkr: 0,
  maxMonthlyCostPkr: 4500000,
  minDailyTraffic: 0,
  selectedDemographic: '',
};

export default function App() {
  // Media Assets State: initialized strictly with real admin data, free of dummy mock records
  const [assets, setAssets] = useState<MediaAsset[]>(() => {
    try {
      const stored = localStorage.getItem('blaze_ooh_admin_assets');
      if (stored) {
        const parsed: MediaAsset[] = JSON.parse(stored);
        return parsed.filter(
          (a) =>
            !LEGACY_DUMMY_ASSET_IDS.includes(a.id) &&
            !LEGACY_DUMMY_ASSET_IDS.includes(a.code) &&
            (a as any).isUserCreated === true
        );
      }
    } catch {}
    return [];
  });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [currentView, setCurrentView] = useState<ViewMode>('cards');
  const [currency, setCurrency] = useState<Currency>('PKR');
  const [isFilterDockOpen, setIsFilterDockOpen] = useState<boolean>(true);

  // Authentication State
  // Requirement 1: Starting window shows a professional login screen with Client Login and Administrator Login.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const storedAuth = localStorage.getItem('blaze_ooh_authenticated');
      return storedAuth === 'true';
    } catch {
      return false;
    }
  });

  // Zero-trust security: Only admin@blaze.com.pk can ever have the administrator role
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const stored = localStorage.getItem('blaze_ooh_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'administrator') {
          if (parsed.email?.toLowerCase().trim() === 'admin@blaze.com.pk') {
            return parsed;
          }
        } else if (parsed.role === 'client') {
          return parsed;
        }
      }
    } catch {}
    return DEMO_USERS.client;
  });

  // Bookings / Client Reservations state - no dummy data
  const [bookings, setBookings] = useState<BookingRequest[]>(() => {
    try {
      const stored = localStorage.getItem('blaze_ooh_bookings');
      if (stored) {
        const parsed: BookingRequest[] = JSON.parse(stored);
        return parsed.filter(
          (b) => b.bookingId !== 'BK-BLZ-782104' && b.bookingId !== 'BK-BLZ-761922'
        );
      }
    } catch {}
    return [];
  });

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalInitialMode, setLoginModalInitialMode] = useState<
    'client' | 'administrator' | 'signin' | 'register'
  >('client');
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState<boolean>(false);
  const [isManageClientsOpen, setIsManageClientsOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  const openLoginModal = (
    mode: 'client' | 'administrator' | 'signin' | 'register' = 'client'
  ) => {
    setLoginModalInitialMode(mode);
    setIsLoginModalOpen(true);
  };
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [bookingAsset, setBookingAsset] = useState<MediaAsset | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<MediaAsset | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Campaign Cart - clean starting state (empty array, no dummy items)
  const [cartItems, setCartItems] = useState<MediaPlanItem[]>(() => {
    try {
      const stored = localStorage.getItem('blaze_ooh_cart');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [selectedAssetForDetails, setSelectedAssetForDetails] =
    useState<MediaAsset | null>(null);
  const [isCartModalOpen, setIsCartModalOpen] = useState<boolean>(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState<boolean>(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState<boolean>(false);
  const [isCitiesModalOpen, setIsCitiesModalOpen] = useState<boolean>(false);

  // Synchronize localStorage
  useEffect(() => {
    try {
      localStorage.setItem('blaze_ooh_user', JSON.stringify(currentUser));
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('blaze_ooh_bookings', JSON.stringify(bookings));
    } catch {}
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem('blaze_ooh_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // Test Firestore Connection and Purge any legacy dummy mock assets on boot
  useEffect(() => {
    testFirestoreConnection();
    purgeLegacyDummyData().catch(console.warn);
  }, []);

  // Synchronize with backend Express server asset inventory store
  useEffect(() => {
    fetch('/api/assets')
      .then((res) => res.json())
      .then((data) => {
        if (data.assets && Array.isArray(data.assets) && data.assets.length > 0) {
          const cleanServerAssets: MediaAsset[] = data.assets.filter(
            (a: MediaAsset) =>
              !LEGACY_DUMMY_ASSET_IDS.includes(a.id) &&
              !LEGACY_DUMMY_ASSET_IDS.includes(a.code) &&
              (a as any).isUserCreated === true
          );
          if (cleanServerAssets.length > 0) {
            setAssets((prev) => {
              const map = new Map<string, MediaAsset>();
              cleanServerAssets.forEach((a) => map.set(a.id, a));
              prev.forEach((a) => map.set(a.id, a));
              return Array.from(map.values());
            });
          }
        }
      })
      .catch((err) => console.warn('Server assets initial fetch notice:', err));

    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        if (data.bookings && Array.isArray(data.bookings) && data.bookings.length > 0) {
          const clean = data.bookings.filter(
            (b: any) => b.bookingId !== 'BK-BLZ-782104' && b.bookingId !== 'BK-BLZ-761922'
          );
          if (clean.length > 0) {
            setBookings((prev) => {
              const map = new Map<string, BookingRequest>();
              clean.forEach((b: any) => map.set(b.bookingId, b));
              prev.forEach((b) => map.set(b.bookingId, b));
              return Array.from(map.values()).sort(
                (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
              );
            });
          }
        }
      })
      .catch((err) => console.warn('Server bookings initial fetch notice:', err));
  }, []);

  // Listen to Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let profile: Partial<UserAccount> | null = null;
        if (fbUser.email?.toLowerCase().trim() !== 'admin@blaze.com.pk') {
          profile = await fetchStoredUserProfile(fbUser.uid);
        }
        const account = mapFirebaseUserToAccount(fbUser, profile);
        setCurrentUser(account);
        setIsAuthenticated(true);
        try {
          localStorage.setItem('blaze_ooh_authenticated', 'true');
        } catch {}

        if (account.requiresPasswordChange) {
          setIsChangePasswordOpen(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization with Firestore Media Assets Collection
  // Whenever the Administrator registers, edits, or deletes an asset, both clients and admin immediately see it!
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToMediaAssets(
      (liveAssets) => {
        if (!isMounted) return;
        const cleanAssets = liveAssets.filter(
          (a) =>
            !LEGACY_DUMMY_ASSET_IDS.includes(a.id) &&
            !LEGACY_DUMMY_ASSET_IDS.includes(a.code) &&
            (a as any).isUserCreated === true
        );
        setAssets(cleanAssets);
        try {
          localStorage.setItem('blaze_ooh_admin_assets', JSON.stringify(cleanAssets));
        } catch {}
      },
      (err) => {
        console.warn('Live assets sync notice:', err);
      }
    );
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Real-time synchronization with Firestore Bookings Collection
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToBookings(
      (liveBookings) => {
        if (!isMounted) return;
        const cleanBookings = liveBookings.filter(
          (b) => b.bookingId !== 'BK-BLZ-782104' && b.bookingId !== 'BK-BLZ-761922'
        );
        setBookings(cleanBookings);
        try {
          localStorage.setItem('blaze_ooh_bookings', JSON.stringify(cleanBookings));
        } catch {}
      },
      (err) => {
        console.warn('Live bookings sync notice:', err);
      }
    );
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (currentUser.role === 'administrator') {
          setIsNewAssetModalOpen(true);
        } else {
          showToast('Administrator privileges required to register new media assets.', 'info');
          setIsLoginModalOpen(true);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        if (currentUser.role === 'administrator') {
          setIsExcelImportModalOpen(true);
        } else {
          showToast('Administrator privileges required for Excel batch ingestion.', 'info');
          setIsLoginModalOpen(true);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsCartModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setIsLoginModalOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsBookingsModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSelectedAssetForDetails(null);
        setIsCartModalOpen(false);
        setIsNewAssetModalOpen(false);
        setIsExcelImportModalOpen(false);
        setIsLoginModalOpen(false);
        setIsBookingsModalOpen(false);
        setIsCitiesModalOpen(false);
        setEditingAsset(null);
        setBookingAsset(null);
        setAssetPendingDelete(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  // Update specific filter values
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.selectedCities.length > 0) count++;
    if (filters.selectedVendors.length > 0) count++;
    if (filters.selectedTypes.length > 0) count++;
    if (filters.selectedIlluminations.length > 0) count++;
    if (filters.selectedSECs.length > 0) count++;
    if (filters.selectedStatuses.length > 0) count++;
    if (filters.minAreaSqFt > 0) count++;
    if (filters.maxMonthlyCostPkr < 4500000) count++;
    if (filters.minDailyTraffic > 0) count++;
    if (filters.selectedDemographic) count++;
    return count;
  }, [filters]);

  // Inventory filtering logic
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // 1. Search Query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesQuery =
          asset.title.toLowerCase().includes(query) ||
          asset.code.toLowerCase().includes(query) ||
          asset.area.toLowerCase().includes(query) ||
          asset.city.toLowerCase().includes(query) ||
          (asset.vendor && asset.vendor.toLowerCase().includes(query)) ||
          asset.type.toLowerCase().includes(query) ||
          asset.profiling.trafficDirection.toLowerCase().includes(query) ||
          asset.profiling.surroundingLandmarks.some((lm) =>
            lm.toLowerCase().includes(query)
          );
        if (!matchesQuery) return false;
      }

      // 2. City filter
      if (
        filters.selectedCities.length > 0 &&
        !filters.selectedCities.includes(asset.city)
      ) {
        return false;
      }

      // 3. Vendor filter
      if (
        filters.selectedVendors.length > 0 &&
        !filters.selectedVendors.includes(asset.vendor)
      ) {
        return false;
      }

      // 4. Media Type filter
      if (
        filters.selectedTypes.length > 0 &&
        !filters.selectedTypes.includes(asset.type)
      ) {
        return false;
      }

      // 5. Illumination filter
      if (
        filters.selectedIlluminations.length > 0 &&
        !filters.selectedIlluminations.includes(asset.illumination)
      ) {
        return false;
      }

      // 6. SEC Class filter
      if (
        filters.selectedSECs.length > 0 &&
        !filters.selectedSECs.includes(asset.profiling.secCategory)
      ) {
        return false;
      }

      // 7. Status filter
      if (
        filters.selectedStatuses.length > 0 &&
        !filters.selectedStatuses.includes(asset.status)
      ) {
        return false;
      }

      // 8. Area (sq ft) filter
      if (asset.dimensions.totalSqFt < filters.minAreaSqFt) {
        return false;
      }

      // 9. Monthly cost filter
      if (asset.cost.monthlyRentalPkr > filters.maxMonthlyCostPkr) {
        return false;
      }

      // 10. Daily Traffic filter
      if (asset.profiling.dailyTrafficVehicles < filters.minDailyTraffic) {
        return false;
      }

      // 11. Demographic filter
      if (filters.selectedDemographic) {
        const matchesDemo = asset.profiling.targetDemographics.some((d) =>
          d.toLowerCase().includes(filters.selectedDemographic.toLowerCase())
        );
        if (!matchesDemo) return false;
      }

      return true;
    });
  }, [assets, filters]);

  // Aggregate stats
  const cityCounts = useMemo(() => {
    return assets.reduce((acc, a) => {
      acc[a.city] = (acc[a.city] || 0) + 1;
      return acc;
    }, {} as Record<City, number>);
  }, [assets]);

  const vendorCounts = useMemo(() => {
    return assets.reduce((acc, a) => {
      if (a.vendor) {
        acc[a.vendor] = (acc[a.vendor] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [assets]);

  const availableVendors = useMemo(() => {
    const set = new Set<string>();
    STANDARD_VENDORS.forEach((v) => set.add(v));
    assets.forEach((a) => {
      if (a.vendor) set.add(a.vendor);
    });
    return Array.from(set);
  }, [assets]);

  const typeCounts = useMemo(() => {
    return assets.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<MediaType, number>);
  }, [assets]);

  const totalDailyTraffic = useMemo(() => {
    return filteredAssets.reduce(
      (sum, a) => sum + a.profiling.dailyTrafficVehicles,
      0
    );
  }, [filteredAssets]);

  const totalDailyImpressions = useMemo(() => {
    return filteredAssets.reduce(
      (sum, a) => sum + a.profiling.dailyGrossImpressions,
      0
    );
  }, [filteredAssets]);

  // Cart operations
  const selectedAssetIdsInCart = useMemo(() => {
    return new Set(cartItems.map((item) => item.assetId));
  }, [cartItems]);

  const cartMonthlyTotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.asset.cost.monthlyRentalPkr,
      0
    );
  }, [cartItems]);

  const handleToggleCartItem = (asset: MediaAsset) => {
    if (selectedAssetIdsInCart.has(asset.id)) {
      setCartItems((prev) => prev.filter((item) => item.assetId !== asset.id));
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          assetId: asset.id,
          asset,
          durationMonths: 3,
          customDiscountPercent: 10,
          includeProduction: true,
          includeMounting: true,
        },
      ]);
    }
  };

  const handleBatchAddToCart = (selectedAssets: MediaAsset[]) => {
    setCartItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.assetId));
      const newItems: MediaPlanItem[] = [];

      selectedAssets.forEach((asset) => {
        if (!existingIds.has(asset.id)) {
          newItems.push({
            assetId: asset.id,
            asset,
            durationMonths: 3,
            customDiscountPercent: 10,
            includeProduction: true,
            includeMounting: true,
          });
        }
      });

      return [...prev, ...newItems];
    });
  };

  const handleUpdateDuration = (assetId: string, durationMonths: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.assetId === assetId ? { ...item, durationMonths } : item
      )
    );
  };

  const handleRemoveFromCart = (assetId: string) => {
    setCartItems((prev) => prev.filter((item) => item.assetId !== assetId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Role & Login handlers strictly enforcing admin@blaze.com.pk for administrator privileges
  const handleSwitchRole = (role: UserRole) => {
    if (role === 'administrator') {
      const fbUser = auth.currentUser;
      const isAuthAdmin = fbUser && fbUser.email?.toLowerCase().trim() === 'admin@blaze.com.pk';

      if (isAuthAdmin) {
        const adminUser = mapFirebaseUserToAccount(fbUser);
        setCurrentUser(adminUser);
        setIsAuthenticated(true);
        showToast(`Administrator privileges verified: ${adminUser.name}`);
        return;
      }

      showToast(
        'Access Denied: Only the official administrator (admin@blaze.com.pk) has administrative privileges.',
        'error'
      );
      openLoginModal('administrator');
      return;
    }

    // Switching to client perspective
    setCurrentUser(DEMO_USERS.client);
    showToast('Switched to Client Advertiser view.', 'info');
  };

  const handleLogin = (user: UserAccount) => {
    // Zero-trust enforcement: Only admin@blaze.com.pk can ever be administrator
    if (user.role === 'administrator' && user.email?.toLowerCase().trim() !== 'admin@blaze.com.pk') {
      showToast(
        'Security Blocked: Administrator privileges are strictly reserved for admin@blaze.com.pk.',
        'error'
      );
      return;
    }

    setCurrentUser(user);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('blaze_ooh_authenticated', 'true');
      localStorage.setItem('blaze_ooh_user', JSON.stringify(user));
    } catch {}

    showToast(`Successfully authenticated as ${user.name} (${user.role.toUpperCase()})`);

    // If client requires permanent password change on first login, prompt modal immediately
    if (user.requiresPasswordChange) {
      setIsChangePasswordOpen(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutFromFirebase();
    } catch {}
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('blaze_ooh_authenticated');
      localStorage.removeItem('blaze_ooh_user');
    } catch {}
    showToast('Signed out successfully. Returned to Authentication Portal.', 'info');
  };

  // Asset editing / deleting handlers (Administrator)
  const handleSaveEditedAsset = async (updated: MediaAsset) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setCartItems((prev) =>
      prev.map((item) =>
        item.assetId === updated.id ? { ...item, asset: updated } : item
      )
    );
    showToast(`Media site ${updated.code} specifications updated successfully.`);
    try {
      await persistMediaAsset(updated);
    } catch (err: any) {
      console.error('Failed to update asset in Firestore:', err);
    }
  };

  // Asset Deletion: Step 1 - Trigger Confirmation Dialog (Administrator only)
  const handleRequestDeleteAsset = (assetOrId: string | MediaAsset) => {
    // Zero-Trust Security Check: Clients are strictly forbidden from deleting assets
    const isAdmin =
      currentUser.role === 'administrator' &&
      currentUser.email?.toLowerCase().trim() === 'admin@blaze.com.pk';
    if (!isAdmin) {
      showToast(
        'Access Denied: Only the official administrator (admin@blaze.com.pk) can delete outdoor media assets. Clients cannot delete assets or unrelated data.',
        'error'
      );
      return;
    }

    const targetAsset =
      typeof assetOrId === 'string'
        ? assets.find((a) => a.id === assetOrId || a.code === assetOrId) ||
          assets.find(
            (a) =>
              a.id === `BLZ-${assetOrId}` ||
              a.code === assetOrId.replace(/^BLZ-/, '')
          )
        : assetOrId;

    if (!targetAsset) {
      showToast('Media asset not found in active inventory.', 'error');
      return;
    }

    setAssetPendingDelete(targetAsset);
  };

  // Asset Deletion: Step 2 - Execute permanent removal from database and storage once confirmed
  const handleConfirmDeleteAsset = async (asset: MediaAsset) => {
    const isAdmin =
      currentUser.role === 'administrator' &&
      currentUser.email?.toLowerCase().trim() === 'admin@blaze.com.pk';
    if (!isAdmin) {
      showToast(
        'Access Denied: Only administrators (admin@blaze.com.pk) can delete assets.',
        'error'
      );
      return;
    }

    setIsDeletingAsset(true);
    const assetId = asset.id;
    const targetCode = asset.code;

    // 1. Immediate optimistic state update for instantaneous responsive feel
    setAssets((prev) =>
      prev.filter(
        (a) =>
          a.id !== assetId &&
          a.code !== targetCode &&
          a.id !== `BLZ-${targetCode}`
      )
    );
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          item.assetId !== assetId &&
          item.asset.id !== assetId &&
          item.asset.code !== targetCode
      )
    );
    if (
      selectedAssetForDetails?.id === assetId ||
      selectedAssetForDetails?.code === targetCode
    ) {
      setSelectedAssetForDetails(null);
    }
    if (editingAsset?.id === assetId || editingAsset?.code === targetCode) {
      setEditingAsset(null);
    }

    try {
      // 2. Permanently remove from database (Firestore + backend API + local storage) and purge storage images
      await removeMediaAsset(assetId, targetCode, asset, currentUser);
      showToast(
        `Asset ${targetCode} (${asset.title}) and associated imagery permanently removed from database and storage.`,
        'success'
      );
      setAssetPendingDelete(null);
    } catch (err: any) {
      console.error('Failed to permanently delete asset:', err);
      showToast(
        `Failed to delete asset: ${err.message || 'Please check network and permissions.'}`,
        'error'
      );
      throw err;
    } finally {
      setIsDeletingAsset(false);
    }
  };

  // Booking handlers (Client & Admin)
  const handleBookingSubmitted = async (booking: any) => {
    setBookings((prev) => [booking, ...prev]);
    showToast(
      `Site reservation submitted for ${booking.assetCode}. Confirmation dispatched to commercial desk.`,
      'success'
    );
    try {
      await persistBookingRequest(booking);
    } catch (err: any) {
      console.error('Failed to save booking to Firestore:', err);
    }
  };

  const handleRequestCampaignBooking = async (
    items: MediaPlanItem[],
    clientNameStr: string,
    campaignTitleStr: string
  ) => {
    const newBookings: BookingRequest[] = items.map((item, idx) => ({
      bookingId: `BK-BLZ-${(Date.now() + idx).toString().slice(-6)}`,
      clientName: currentUser.name,
      organization: clientNameStr || currentUser.organization,
      contactEmail: currentUser.email,
      assetId: item.asset.id,
      assetCode: item.asset.code,
      brandName: campaignTitleStr || 'National Campaign',
      durationMonths: item.durationMonths,
      startDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      submittedAt: new Date().toISOString(),
      status: 'Pending Admin Confirmation',
      quotedAmountPkr: item.asset.cost.monthlyRentalPkr * item.durationMonths,
      notes: `Batch campaign proposal submission for ${item.durationMonths} months.`,
    }));

    setBookings((prev) => [...newBookings, ...prev]);
    showToast(
      `Submitted reservation requests for ${items.length} sites in campaign plan.`,
      'success'
    );
    try {
      for (const b of newBookings) {
        await persistBookingRequest(b);
      }
    } catch (err: any) {
      console.error('Failed to save campaign bookings:', err);
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: 'Approved & Reserved' | 'Rejected' | 'Pending Admin Confirmation' | string
  ) => {
    setBookings((prev) =>
      prev.map((b) => (b.bookingId === bookingId ? { ...b, status: newStatus as any } : b))
    );

    const booking = bookings.find((b) => b.bookingId === bookingId);
    if (booking && newStatus === 'Approved & Reserved') {
      const updatedAssets = assets.map((a) =>
        a.id === booking.assetId || a.code === booking.assetCode || a.id === `BLZ-${booking.assetCode}`
          ? { ...a, status: 'Reserved' as AssetStatus, currentBrandOccupant: booking.brandName }
          : a
      );
      setAssets(updatedAssets);
      showToast(
        `Booking ${bookingId} approved! Site ${booking.assetCode} marked as Reserved for ${booking.clientName}.`,
        'success'
      );
      const targetAsset = updatedAssets.find(
        (a) => a.id === booking.assetId || a.code === booking.assetCode
      );
      if (targetAsset) {
        persistMediaAsset(targetAsset).catch(console.error);
      }
    } else if (booking && (newStatus === 'Rejected' || newStatus === 'Pending Admin Confirmation')) {
      const updatedAssets = assets.map((a) =>
        (a.id === booking.assetId || a.code === booking.assetCode || a.id === `BLZ-${booking.assetCode}`) &&
        a.status === 'Reserved'
          ? { ...a, status: 'Available' as AssetStatus, currentBrandOccupant: undefined }
          : a
      );
      setAssets(updatedAssets);
      showToast(`Booking ${bookingId} status updated to ${newStatus}.`, 'info');
      const targetAsset = updatedAssets.find(
        (a) => a.id === booking.assetId || a.code === booking.assetCode
      );
      if (targetAsset) {
        persistMediaAsset(targetAsset).catch(console.error);
      }
    } else {
      showToast(`Booking ${bookingId} status updated to ${newStatus}.`, 'info');
    }

    try {
      await updateBookingStatus(bookingId, newStatus);
    } catch (err: any) {
      console.error('Failed to update booking status in Firestore:', err);
    }
  };

  // Add single new asset handler
  const handleAddNewAsset = async (newAsset: MediaAsset) => {
    setAssets((prev) => [newAsset, ...prev]);
    setSelectedAssetForDetails(newAsset);
    showToast(`Successfully registered new media asset ${newAsset.code}.`);
    try {
      await persistMediaAsset(newAsset);
    } catch (err: any) {
      console.error('Failed to save asset to Firestore:', err);
    }
  };

  // Import batch of assets from Excel handler
  const handleImportComplete = async (newAssets: MediaAsset[]) => {
    setAssets((prev) => [...newAssets, ...prev]);
    showToast(`Imported ${newAssets.length} media assets from Excel spreadsheet into database.`);
    try {
      await persistBatchMediaAssets(newAssets);
    } catch (err: any) {
      console.error('Failed to persist imported assets to Firestore:', err);
    }
  };

  // Export filtered inventory to CSV
  const handleExportCsv = () => {
    const headers = [
      'Inventory Code',
      'Title',
      'Vendor Concessionaire',
      'City',
      'Area',
      'Type',
      'Width (Ft)',
      'Height (Ft)',
      'Total Area (SqFt)',
      'Illumination',
      'Vendor Rate (PKR)',
      'Blaze Rate (PKR)',
      'Daily Traffic (Vehicles)',
      'Gross Daily Impressions',
      'SEC Rating',
      'Dwell Time (Sec)',
      'Status',
      'Traffic Direction',
    ];

    const rows = filteredAssets.map((a) => [
      a.code,
      `"${a.title}"`,
      `"${a.vendor}"`,
      a.city,
      `"${a.area}"`,
      a.type,
      a.dimensions.widthFt,
      a.dimensions.heightFt,
      a.dimensions.totalSqFt,
      a.illumination,
      a.cost.vendorRatePkr ?? Math.round(a.cost.monthlyRentalPkr * 0.7),
      a.cost.blazeRatePkr ?? a.cost.monthlyRentalPkr,
      a.profiling.dailyTrafficVehicles,
      a.profiling.dailyGrossImpressions,
      a.profiling.secCategory,
      a.profiling.dwellTimeSec,
      a.status,
      `"${a.profiling.trafficDirection}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Blaze_OOH_Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported inventory dataset to CSV format.');
  };

  // Requirement 1: Starting window shows professional login screen with Client Login and Administrator Login
  if (!isAuthenticated) {
    return <StartingLoginWindow onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Windows Native Title Bar & Menu Strip */}
      <WindowsTitleBar
        onOpenNewAssetModal={() => {
          if (currentUser.role === 'administrator') {
            setIsNewAssetModalOpen(true);
          } else {
            showToast('Administrator privileges required to add assets.', 'info');
            openLoginModal('administrator');
          }
        }}
        onOpenExcelImportModal={() => {
          if (currentUser.role === 'administrator') {
            setIsExcelImportModalOpen(true);
          } else {
            showToast('Administrator privileges required to import Excel data.', 'info');
            openLoginModal('administrator');
          }
        }}
        onExportCsv={handleExportCsv}
        onOpenCartModal={() => setIsCartModalOpen(true)}
        currentView={currentView}
        onViewChange={setCurrentView}
        onResetFilters={handleResetFilters}
        totalAssetsCount={assets.length}
        currentUser={currentUser}
        onOpenLoginModal={openLoginModal}
        onOpenBookingsModal={() => setIsBookingsModalOpen(true)}
        onOpenManageClients={() => setIsManageClientsOpen(true)}
        onSignOut={handleSignOut}
        onSwitchRole={handleSwitchRole}
      />

      {/* 2. Desktop Command Ribbon / Action Bar */}
      <DesktopRibbon
        currentView={currentView}
        onViewChange={setCurrentView}
        currency={currency}
        onCurrencyToggle={() =>
          setCurrency((prev) => (prev === 'PKR' ? 'USD' : 'PKR'))
        }
        searchQuery={filters.searchQuery}
        onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
        cartItemCount={cartItems.length}
        onOpenCartModal={() => setIsCartModalOpen(true)}
        onOpenNewAssetModal={() => {
          if (currentUser.role === 'administrator') {
            setIsNewAssetModalOpen(true);
          } else {
            showToast('Administrator privileges required to add assets.', 'info');
            openLoginModal('administrator');
          }
        }}
        onOpenExcelImportModal={() => {
          if (currentUser.role === 'administrator') {
            setIsExcelImportModalOpen(true);
          } else {
            showToast('Administrator privileges required to import Excel data.', 'info');
            openLoginModal('administrator');
          }
        }}
        onExportCsv={handleExportCsv}
        isFilterDockOpen={isFilterDockOpen}
        onToggleFilterDock={() => setIsFilterDockOpen((prev) => !prev)}
        onResetFilters={handleResetFilters}
        filteredCount={filteredAssets.length}
        totalCount={assets.length}
        activeFilterCount={activeFilterCount}
        currentUser={currentUser}
        onOpenLoginModal={openLoginModal}
        onOpenBookingsModal={() => setIsBookingsModalOpen(true)}
        onOpenManageClients={() => setIsManageClientsOpen(true)}
        selectedCitiesCount={filters.selectedCities.length}
        onOpenCitiesModal={() => setIsCitiesModalOpen(true)}
      />

      {/* 3. Main Split-Pane Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Collapsible Windows Filter Dock */}
        {isFilterDockOpen && (
          <FilterDock
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            cityCounts={cityCounts}
            vendorCounts={vendorCounts}
            availableVendors={availableVendors}
            typeCounts={typeCounts}
            currency={currency}
            totalFilteredCount={filteredAssets.length}
            onOpenCitiesModal={() => setIsCitiesModalOpen(true)}
          />
        )}

        {/* Center / Right: Dynamic Content Viewports */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/40 relative">
          {currentView === 'cards' && (
            <AssetGridView
              assets={filteredAssets}
              selectedAssetIdsInCart={selectedAssetIdsInCart}
              onToggleCartItem={handleToggleCartItem}
              onSelectAssetForDetails={setSelectedAssetForDetails}
              currency={currency}
              onResetFilters={handleResetFilters}
              currentUser={currentUser}
              onOpenEditModal={(asset) => setEditingAsset(asset)}
              onOpenBookingModal={(asset) => setBookingAsset(asset)}
              onDeleteAsset={handleRequestDeleteAsset}
            />
          )}

          {currentView === 'table' && (
            <AssetTableView
              assets={filteredAssets}
              selectedAssetIdsInCart={selectedAssetIdsInCart}
              onToggleCartItem={handleToggleCartItem}
              onSelectAssetForDetails={setSelectedAssetForDetails}
              currency={currency}
              onBatchAddToCart={handleBatchAddToCart}
              currentUser={currentUser}
              onOpenEditModal={(asset) => setEditingAsset(asset)}
              onOpenBookingModal={(asset) => setBookingAsset(asset)}
              onDeleteAsset={handleRequestDeleteAsset}
            />
          )}

          {currentView === 'map' && (
            <AssetMapView
              assets={filteredAssets}
              selectedAssetIdsInCart={selectedAssetIdsInCart}
              onToggleCartItem={handleToggleCartItem}
              onSelectAssetForDetails={setSelectedAssetForDetails}
              currency={currency}
            />
          )}

          {currentView === 'analytics' && (
            <AudienceAnalyticsView
              assets={filteredAssets}
              currency={currency}
              onSelectAssetForDetails={setSelectedAssetForDetails}
            />
          )}
        </main>
      </div>

      {/* 4. Windows Bottom Status Bar */}
      <WindowsStatusBar
        filteredCount={filteredAssets.length}
        totalCount={assets.length}
        totalDailyTraffic={totalDailyTraffic}
        totalDailyImpressions={totalDailyImpressions}
        cartItemCount={cartItems.length}
        cartMonthlyTotal={cartMonthlyTotal}
        currency={currency}
        onOpenCartModal={() => setIsCartModalOpen(true)}
        currentUser={currentUser}
        onOpenLoginModal={() => openLoginModal('signin')}
      />

      {/* 5. Modals & Inspectors */}
      {selectedAssetForDetails && (
        <AssetDetailModal
          asset={selectedAssetForDetails}
          onClose={() => setSelectedAssetForDetails(null)}
          isInCart={selectedAssetIdsInCart.has(selectedAssetForDetails.id)}
          onToggleCart={handleToggleCartItem}
          currency={currency}
          currentUser={currentUser}
          onOpenEditModal={(asset) => setEditingAsset(asset)}
          onOpenBookingModal={(asset) => setBookingAsset(asset)}
          onDeleteAsset={handleRequestDeleteAsset}
        />
      )}

      {isCartModalOpen && (
        <CampaignCartModal
          cartItems={cartItems}
          onUpdateDuration={handleUpdateDuration}
          onRemoveFromCart={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onClose={() => setIsCartModalOpen(false)}
          currency={currency}
          onSelectAssetForDetails={setSelectedAssetForDetails}
          currentUser={currentUser}
          onRequestCampaignBooking={handleRequestCampaignBooking}
        />
      )}

      {isNewAssetModalOpen && (
        <NewAssetModal
          onClose={() => setIsNewAssetModalOpen(false)}
          onAddAsset={handleAddNewAsset}
        />
      )}

      {isExcelImportModalOpen && (
        <ExcelImportModal
          onClose={() => setIsExcelImportModalOpen(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {isLoginModalOpen && (
        <LoginModal
          currentUser={currentUser}
          initialMode={loginModalInitialMode}
          onLogin={handleLogin}
          onClose={() => setIsLoginModalOpen(false)}
          onOpenManageClients={() => setIsManageClientsOpen(true)}
        />
      )}

      {/* Operations Administrator Client Account Management Console */}
      {isManageClientsOpen && (
        <ManageClientsModal
          currentUser={currentUser}
          onClose={() => setIsManageClientsOpen(false)}
        />
      )}

      {/* Client Temporary Password Update Modal on First Login */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          currentUser={currentUser}
          onPasswordChanged={(updatedUser) => {
            setCurrentUser(updatedUser);
            setIsChangePasswordOpen(false);
            showToast('Permanent password saved successfully. Welcome to Blaze OOH!');
          }}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}

      {isBookingsModalOpen && (
        <BookingsModal
          bookings={bookings}
          currentUser={currentUser}
          onUpdateBookingStatus={handleUpdateBookingStatus}
          onClose={() => setIsBookingsModalOpen(false)}
          currency={currency}
          onInspectAsset={(code) => {
            const found = assets.find((a) => a.code === code);
            if (found) {
              setSelectedAssetForDetails(found);
              setIsBookingsModalOpen(false);
            }
          }}
        />
      )}

      {editingAsset && (
        <EditAssetModal
          asset={editingAsset}
          onSave={handleSaveEditedAsset}
          onDelete={handleRequestDeleteAsset}
          onClose={() => setEditingAsset(null)}
        />
      )}

      {/* Permanent Media Asset Deletion Confirmation Dialog (Administrator only) */}
      {assetPendingDelete && (
        <DeleteAssetConfirmationModal
          asset={assetPendingDelete}
          currency={currency}
          currentUser={currentUser}
          isDeleting={isDeletingAsset}
          onConfirm={handleConfirmDeleteAsset}
          onCancel={() => {
            if (!isDeletingAsset) setAssetPendingDelete(null);
          }}
        />
      )}

      {bookingAsset && (
        <BookingRequestModal
          asset={bookingAsset}
          currentUser={currentUser}
          onClose={() => setBookingAsset(null)}
          onBookingSubmitted={handleBookingSubmitted}
        />
      )}

      {/* Pakistan Nationwide Cities Full Selector Dialog */}
      {isCitiesModalOpen && (
        <PakistanCitiesModal
          isOpen={isCitiesModalOpen}
          onClose={() => setIsCitiesModalOpen(false)}
          selectedCities={filters.selectedCities}
          onApplySelection={(newCities) => handleFilterChange({ selectedCities: newCities })}
          cityCounts={cityCounts}
        />
      )}

      {/* Windows Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-9 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 shadow-2xl rounded-lg p-3 max-w-sm flex items-start gap-2.5 text-xs text-slate-200">
            {toastMessage.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toastMessage.type === 'info' && (
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            {toastMessage.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-semibold text-slate-100 block">
                {toastMessage.type === 'success' ? 'System Notification' : 'Enterprise Notice'}
              </span>
              <span className="text-slate-300 text-[11px] leading-tight block">
                {toastMessage.text}
              </span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-500 hover:text-slate-300"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
