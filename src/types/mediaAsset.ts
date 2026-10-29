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

export function normalizeMediaAsset(raw: any): MediaAsset {
  if (!raw || typeof raw !== 'object') {
    return {
      id: 'BLZ-UNKNOWN',
      code: 'UNKNOWN',
      title: 'Untitled Asset',
      vendor: 'Blaze Media (Pvt) Ltd',
      city: 'Karachi',
      area: 'General',
      zone: 'General',
      type: 'Billboard',
      dimensions: { widthFt: 0, heightFt: 0, totalSqFt: 0 },
      orientation: 'Landscape',
      sides: 1,
      illumination: 'Frontlit',
      cost: {
        monthlyRentalPkr: 0,
        blazeRatePkr: 0,
        vendorRatePkr: 0,
        productionCostPkr: 0,
        mountingCostPkr: 0,
        taxRatePercent: 13,
      },
      profiling: {
        secCategory: 'A',
        dailyTrafficVehicles: 0,
        dailyGrossImpressions: 0,
        dwellTimeSec: 0,
        viewingDistanceMeters: 0,
        trafficDirection: '',
        targetDemographics: [],
        clutterLevel: 'Low (Solo Prime)',
        peakCongestionHours: '',
        surroundingLandmarks: [],
      },
      coordinates: { lat: 24.8607, lng: 67.0011 },
      status: 'Available',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      techSpecs: {
        structureType: 'Steel Truss',
        generatorBackup: false,
        foundationType: 'Concrete',
      },
    };
  }

  const width = Number(raw.dimensions?.widthFt) || 0;
  const height = Number(raw.dimensions?.heightFt) || 0;
  const totalSqFt = Number(raw.dimensions?.totalSqFt) || (width && height ? width * height : 0);

  const monthlyRentalPkr = Number(raw.cost?.monthlyRentalPkr ?? raw.cost?.blazeRatePkr) || 0;
  const blazeRatePkr = Number(raw.cost?.blazeRatePkr ?? raw.cost?.monthlyRentalPkr) || 0;
  const vendorRatePkr = Number(raw.cost?.vendorRatePkr) || Math.round(monthlyRentalPkr * 1.2);

  return {
    ...raw,
    id: raw.id || (raw.code ? `BLZ-${raw.code}` : `BLZ-${Date.now()}`),
    code: raw.code || (typeof raw.id === 'string' ? raw.id.replace(/^BLZ-/, '') : 'SITE'),
    title: raw.title || 'Outdoor Display Asset',
    vendor: raw.vendor || 'Blaze Media (Pvt) Ltd',
    city: raw.city || 'Karachi',
    area: raw.area || '',
    zone: raw.zone || '',
    type: raw.type || 'Billboard',
    orientation: raw.orientation || 'Landscape',
    sides: Number(raw.sides) || 1,
    illumination: raw.illumination || 'Frontlit',
    dimensions: {
      widthFt: width,
      heightFt: height,
      totalSqFt: totalSqFt,
    },
    cost: {
      monthlyRentalPkr,
      blazeRatePkr,
      vendorRatePkr,
      productionCostPkr: Number(raw.cost?.productionCostPkr) || 0,
      mountingCostPkr: Number(raw.cost?.mountingCostPkr) || 0,
      taxRatePercent: Number(raw.cost?.taxRatePercent) || 13,
      digitalSlotSec: raw.cost?.digitalSlotSec ? Number(raw.cost.digitalSlotSec) : undefined,
      spotsPerDay: raw.cost?.spotsPerDay ? Number(raw.cost.spotsPerDay) : undefined,
    },
    profiling: {
      secCategory: raw.profiling?.secCategory || 'A',
      dailyTrafficVehicles: Number(raw.profiling?.dailyTrafficVehicles) || 0,
      dailyGrossImpressions: Number(raw.profiling?.dailyGrossImpressions) || 0,
      dwellTimeSec: Number(raw.profiling?.dwellTimeSec) || 0,
      viewingDistanceMeters: Number(raw.profiling?.viewingDistanceMeters) || 0,
      trafficDirection: raw.profiling?.trafficDirection || '',
      targetDemographics: Array.isArray(raw.profiling?.targetDemographics) ? raw.profiling.targetDemographics : [],
      clutterLevel: raw.profiling?.clutterLevel || 'Low (Solo Prime)',
      peakCongestionHours: raw.profiling?.peakCongestionHours || '',
      surroundingLandmarks: Array.isArray(raw.profiling?.surroundingLandmarks) ? raw.profiling.surroundingLandmarks : [],
    },
    coordinates: {
      lat: Number(raw.coordinates?.lat) || 24.8607,
      lng: Number(raw.coordinates?.lng) || 67.0011,
    },
    status: raw.status || 'Available',
    imageUrl: raw.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    techSpecs: {
      structureType: raw.techSpecs?.structureType || 'Steel Frame',
      generatorBackup: raw.techSpecs?.generatorBackup === true,
      foundationType: raw.techSpecs?.foundationType || 'Concrete',
      pixelPitch: raw.techSpecs?.pixelPitch,
      refreshRate: raw.techSpecs?.refreshRate,
      operatingHours: raw.techSpecs?.operatingHours,
      generatorKva: raw.techSpecs?.generatorKva,
      lightFixtures: raw.techSpecs?.lightFixtures,
    },
  };
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
  updatedAt?: string;
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
  requiresPasswordChange?: boolean;
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
    name: 'Admin',
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

export interface VendorRecord {
  id: string;
  name: string;
  code: string;
  city: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  commissionRatePercent?: number;
  status: 'Active' | 'Inactive';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export const INITIAL_VENDORS: VendorRecord[] = [
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
