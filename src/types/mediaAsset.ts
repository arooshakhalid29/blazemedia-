export type City = string;

export type MediaType =
  | 'Billboard'
  | 'Digital Screen'
  | 'Unipole'
  | 'Digital SMD Screen'
  | 'Bridge Panel'
  | 'Gantry'
  | 'Cantilever'
  | 'Building Wrap'
  | 'Metro Bus Shelter';

export type IlluminationType =
  | 'Digital SMD'
  | 'Frontlit'
  | 'Backlit'
  | 'Non-lit';

export type SECCategory = 'A+' | 'A' | 'B' | 'C';

export type AssetStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';

export type AuthorityNOC =
  | 'CBC'
  | 'KMC'
  | 'LDA'
  | 'CDA'
  | 'DHA'
  | 'PHA'
  | 'NHA'
  | 'RDA';

export interface Dimensions {
  widthFt: number;
  heightFt: number;
  totalSqFt: number;
}

export interface CommercialCost {
  monthlyRentalPkr: number; // Equals blazeRatePkr for backward compatibility
  vendorRatePkr?: number; // Cost rate paid to media vendor/concessionaire
  blazeRatePkr?: number; // Official Blaze rate card / quotation rate
  productionCostPkr: number;
  mountingCostPkr: number;
  taxRatePercent: number; // e.g. 13% for SRB or 16% for PRA
  digitalSlotSec?: number; // e.g. 15s for DOOH
  spotsPerDay?: number; // e.g. 180 spots per day
}

export function getVendorRate(cost: CommercialCost): number {
  return cost.vendorRatePkr ?? Math.round(cost.monthlyRentalPkr * 0.7);
}

export function getBlazeRate(cost: CommercialCost): number {
  return cost.blazeRatePkr ?? cost.monthlyRentalPkr;
}

export interface MediaProfiling {
  secCategory: SECCategory;
  dailyTrafficVehicles: number;
  dailyGrossImpressions: number;
  dwellTimeSec: number;
  viewingDistanceMeters: number;
  trafficDirection: string;
  targetDemographics: string[];
  clutterLevel: 'Low (Solo Prime)' | 'Moderate' | 'High Density Corridor';
  peakCongestionHours: string;
  surroundingLandmarks: string[];
}

export interface TechnicalSpecs {
  structureType: string;
  pixelPitch?: string; // for SMD, e.g., "P4 HD Outdoor" or "P6 Outdoor Waterproof"
  refreshRate?: string; // e.g., "3840Hz"
  operatingHours?: string; // e.g., "06:00 AM - 02:00 AM"
  generatorBackup: boolean;
  generatorKva?: number;
  lightFixtures?: string;
  foundationType: string;
}

export interface MediaAsset {
  id: string; // e.g., "KHI-UNP-0101"
  code: string; // Blaze internal inventory reference code
  title: string;
  vendor: string; // Concessionaire / Media Vendor name
  city: City;
  area: string;
  zone: string;
  type: MediaType;
  dimensions: Dimensions;
  orientation: 'Landscape' | 'Portrait' | 'Curved';
  sides: number;
  illumination: IlluminationType;
  cost: CommercialCost;
  profiling: MediaProfiling;
  coordinates: {
    lat: number;
    lng: number;
  };
  authorityNoc?: AuthorityNOC | string;
  status: AssetStatus;
  currentBrandOccupant?: string;
  bookedUntil?: string;
  imageUrl: string;
  nightImageUrl?: string;
  galleryImages?: string[];
  techSpecs: TechnicalSpecs;
  notes?: string;
  isUserCreated?: boolean;
  createdAt?: string;
}

export interface FilterState {
  searchQuery: string;
  selectedCities: City[];
  selectedVendors: string[];
  selectedTypes: MediaType[];
  selectedIlluminations: IlluminationType[];
  selectedSECs: SECCategory[];
  selectedStatuses: AssetStatus[];
  minAreaSqFt: number;
  maxAreaSqFt: number;
  minMonthlyCostPkr: number;
  maxMonthlyCostPkr: number;
  minDailyTraffic: number;
  selectedAuthorities?: AuthorityNOC[];
  selectedDemographic: string;
}

export interface MediaPlanItem {
  assetId: string;
  asset: MediaAsset;
  durationMonths: number;
  customDiscountPercent: number;
  includeProduction: boolean;
  includeMounting: boolean;
  notes?: string;
}

export type ViewMode = 'cards' | 'table' | 'map' | 'analytics' | 'cart';

export type Currency = 'PKR' | 'USD';

export type UserRole = 'administrator' | 'client';

export interface UserPermissions {
  canAddAsset: boolean;
  canEditAsset: boolean;
  canDeleteAsset: boolean;
  canImportExcel: boolean;
  canEditRates: boolean;
  canManageVendors: boolean;
  canExportProposal: boolean;
  canRequestBooking: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  designation: string;
  permissions: UserPermissions;
  requiresPasswordChange?: boolean;
  permittedCities?: string[];
  status?: 'Active' | 'Suspended';
  createdAt?: string;
  createdBy?: string;
}

export interface ManagedClientRecord {
  id: string;
  name: string;
  email: string;
  organization: string;
  designation: string;
  role: 'client';
  status: 'Active' | 'Suspended';
  requiresPasswordChange: boolean;
  permittedCities?: string[];
  createdAt: string;
  createdBy: string;
  lastLoginAt?: string;
}

export const AUTHORIZED_ADMIN_EMAILS = [
  'admin@blaze.com.pk',
] as const;

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === 'admin@blaze.com.pk';
}

export function createDefaultClientAccount(params: {
  id: string;
  email: string;
  name?: string;
  organization?: string;
  designation?: string;
}): UserAccount {
  return {
    id: params.id,
    email: params.email,
    name: params.name?.trim() || params.email.split('@')[0],
    role: 'client',
    organization: params.organization?.trim() || 'Advertiser Agency Client',
    designation: params.designation?.trim() || 'Media Planning Executive',
    permissions: {
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
}

export const ADMIN_PERMISSIONS: UserPermissions = {
  canAddAsset: true,
  canEditAsset: true,
  canDeleteAsset: true,
  canImportExcel: true,
  canEditRates: true,
  canManageVendors: true,
  canExportProposal: true,
  canRequestBooking: true,
};

export const CLIENT_PERMISSIONS: UserPermissions = {
  canAddAsset: false,
  canEditAsset: false,
  canDeleteAsset: false,
  canImportExcel: false,
  canEditRates: false,
  canManageVendors: false,
  canExportProposal: true,
  canRequestBooking: true,
};

export const DEMO_USERS: Record<string, UserAccount> = {
  administrator: {
    id: 'usr_admin_01',
    email: 'admin@blaze.com.pk',
    name: 'Engr. Tariq Latif',
    role: 'administrator',
    organization: 'Blaze Media (Pvt) Ltd - Operations HQ',
    designation: 'Chief Commercial & Operations Officer',
    permissions: ADMIN_PERMISSIONS,
  },
  client: {
    id: 'usr_client_default',
    email: '',
    name: 'Client User',
    role: 'client',
    organization: 'Advertiser / Agency Client',
    designation: 'Media Planner',
    permissions: CLIENT_PERMISSIONS,
  },
};

export const STANDARD_VENDORS = [
  'Blaze Media (Pvt) Ltd',
  'Signways OOH Network',
  'Dawn Outdoor Media',
  'Adgroup Media Pakistan',
  'Prime Signage Networks',
  'Metropole Media Network',
  'Dynamic Display DOOH',
] as const;

export interface BookingRequest {
  bookingId: string;
  clientName: string;
  organization: string;
  contactEmail: string;
  phone?: string;
  assetId: string;
  assetCode: string;
  brandName: string;
  durationMonths: number;
  startDate: string;
  notes?: string;
  submittedAt: string;
  status: 'Pending Admin Confirmation' | 'Approved & Reserved' | 'Rejected';
  quotedAmountPkr?: number;
}

export const INITIAL_BOOKINGS: BookingRequest[] = [];
