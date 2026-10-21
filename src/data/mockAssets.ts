import { MediaAsset } from '../types/mediaAsset';

// Legacy dummy asset IDs for clean-up / purging
export const LEGACY_DUMMY_ASSET_IDS: string[] = [
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

// All dummy assets removed per user instruction.
// Inventory contains only real outdoor media assets created or imported by the Administrator.
export const INITIAL_MEDIA_ASSETS: MediaAsset[] = [];
