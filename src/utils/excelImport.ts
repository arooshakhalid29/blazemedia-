import * as XLSX from 'xlsx';
import {
  MediaAsset,
  City,
  MediaType,
  IlluminationType,
  SECCategory,
  AssetStatus,
  AuthorityNOC,
} from '../types/mediaAsset';
import { getPakistanCityMeta } from '../data/pakistanCities';
import unipoleImg from '../assets/images/unipole_billboard_1790581927863.jpg';
import doohSmdImg from '../assets/images/dooh_smd_screen_1790581912551.jpg';
import bridgePanelImg from '../assets/images/bridge_panel_1790581944286.jpg';
import gantryImg from '../assets/images/gantry_urban_1790581956476.jpg';

export interface ImportValidationResult {
  validAssets: MediaAsset[];
  errors: { row: number; field: string; message: string }[];
  totalRows: number;
}

// Downloadable standard Blaze OOH Excel template
export function generateSampleExcelTemplate(): Uint8Array {
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
      'Vendor Rate (PKR)': 1200000,
      'Blaze Rate (PKR)': 1750000,
      'Production Cost (PKR)': 96000,
      'Mounting Cost (PKR)': 35000,
      'Daily Traffic (Vehicles)': 320000,
      'SEC (A+/A/B/C)': 'A+',
      'Dwell Time (Sec)': 60,
      'Viewing Distance (Meters)': 400,
      'Traffic Direction': 'Airport heading toward Metropole & Saddar CBD',
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
      'Vendor Rate (PKR)': 2200000,
      'Blaze Rate (PKR)': 3200000,
      'Production Cost (PKR)': 15000,
      'Mounting Cost (PKR)': 0,
      'Daily Traffic (Vehicles)': 390000,
      'SEC (A+/A/B/C)': 'A+',
      'Dwell Time (Sec)': 85,
      'Viewing Distance (Meters)': 350,
      'Traffic Direction': 'Facing traffic heading from Liberty to Kalma Chowk',
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
      'Vendor Rate (PKR)': 900000,
      'Blaze Rate (PKR)': 1350000,
      'Production Cost (PKR)': 64000,
      'Mounting Cost (PKR)': 28000,
      'Daily Traffic (Vehicles)': 280000,
      'SEC (A+/A/B/C)': 'A',
      'Dwell Time (Sec)': 50,
      'Viewing Distance (Meters)': 420,
      'Traffic Direction': 'Both directions between Motorway and Zero Point',
      'Status': 'Available',
      'Current Brand': '',
      'Notes': 'Spans 6 lanes with unobstructed line of sight.',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 15 }, // Site Code
    { wch: 45 }, // Title
    { wch: 25 }, // Vendor
    { wch: 14 }, // City
    { wch: 30 }, // Area
    { wch: 20 }, // Zone
    { wch: 18 }, // Type
    { wch: 12 }, // Width
    { wch: 12 }, // Height
    { wch: 15 }, // Illumination
    { wch: 18 }, // Vendor Rate (PKR)
    { wch: 18 }, // Blaze Rate (PKR)
    { wch: 20 }, // Production
    { wch: 20 }, // Mounting
    { wch: 22 }, // Daily Traffic
    { wch: 15 }, // SEC
    { wch: 16 }, // Dwell Time
    { wch: 22 }, // Viewing Distance
    { wch: 40 }, // Traffic Direction
    { wch: 14 }, // Status
    { wch: 25 }, // Current Brand
    { wch: 35 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Blaze_OOH_Template');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

// Parses raw ArrayBuffer or binary string into validated MediaAssets
export function parseExcelToAssets(fileBuffer: ArrayBuffer | Uint8Array): ImportValidationResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const validAssets: MediaAsset[] = [];
  const errors: { row: number; field: string; message: string }[] = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1, 1-indexed

    // Case-insensitive / tolerant column finder
    const getVal = (...keys: string[]): any => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return row[k];
        const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const rowKey of Object.keys(row)) {
          if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerK) {
            return row[rowKey];
          }
        }
      }
      return '';
    };

    const title = String(getVal('Title', 'Site Name', 'Description', 'SiteTitle') || '').trim();
    const cityRaw = String(getVal('City', 'Hub', 'Location City') || 'Karachi').trim();
    const area = String(getVal('Area', 'Location', 'Road', 'Landmark') || '').trim();
    const vendorRaw = String(getVal('Vendor', 'Concessionaire', 'Supplier', 'Media Vendor', 'Owner') || 'Blaze Media (Pvt) Ltd').trim();

    if (!title) {
      errors.push({ row: rowNum, field: 'Title', message: 'Missing required Site Title.' });
      return;
    }
    if (!area) {
      errors.push({ row: rowNum, field: 'Area', message: 'Missing required Area/Road landmark.' });
      return;
    }

    // City normalization across all Pakistan cities
    const cityMeta = getPakistanCityMeta(cityRaw);
    const city: City = cityMeta.name;

    // Type normalization
    let type: MediaType = 'Billboard';
    const typeRaw = String(getVal('Type', 'Media Type', 'Format', 'Structure') || 'Billboard').toLowerCase();
    if (typeRaw.includes('smd')) {
      type = 'Digital SMD Screen';
    } else if (typeRaw.includes('digital screen') || typeRaw.includes('screen') || typeRaw.includes('digital') || typeRaw.includes('led') || typeRaw.includes('dooh')) {
      type = 'Digital Screen';
    } else if (typeRaw.includes('billboard') || typeRaw.includes('board') || typeRaw.includes('hoarding')) {
      type = 'Billboard';
    } else if (typeRaw.includes('unipole') || typeRaw.includes('monopole')) {
      type = 'Unipole';
    } else if (typeRaw.includes('bridge') || typeRaw.includes('flyover')) {
      type = 'Bridge Panel';
    } else if (typeRaw.includes('gantry') || typeRaw.includes('portal')) {
      type = 'Gantry';
    } else if (typeRaw.includes('cantilever')) {
      type = 'Cantilever';
    } else if (typeRaw.includes('wrap') || typeRaw.includes('mural') || typeRaw.includes('building')) {
      type = 'Building Wrap';
    } else if (typeRaw.includes('metro') || typeRaw.includes('shelter') || typeRaw.includes('transit')) {
      type = 'Metro Bus Shelter';
    }

    // Illumination normalization
    let illumination: IlluminationType = 'Frontlit';
    const illumRaw = String(getVal('Illumination', 'Lighting', 'Light') || '').toLowerCase();
    if (type === 'Digital Screen' || type === 'Digital SMD Screen' || illumRaw.includes('smd') || illumRaw.includes('digital')) {
      illumination = 'Digital SMD';
    } else if (illumRaw.includes('backlit') || illumRaw.includes('back')) {
      illumination = 'Backlit';
    } else if (illumRaw.includes('non') || illumRaw.includes('unlit')) {
      illumination = 'Non-lit';
    }

    // Dimensions
    const widthFt = Math.max(5, Number(getVal('Width (Ft)', 'Width', 'W', 'WidthFt')) || 60);
    const heightFt = Math.max(4, Number(getVal('Height (Ft)', 'Height', 'H', 'HeightFt')) || 20);
    const totalSqFt = widthFt * heightFt;

    // Costs: Vendor Rate & Blaze Rate consistent with approved Blaze rate list
    const rawBlazeRate = Number(getVal('Blaze Rate (PKR)', 'Blaze Rate', 'Monthly Rental (PKR)', 'Monthly Rental', 'Rental', 'Rate', 'Cost')) || 1200000;
    const rawVendorRate = Number(getVal('Vendor Rate (PKR)', 'Vendor Rate', 'Vendor Cost', 'Cost Rate')) || Math.round(rawBlazeRate * 0.7);
    let blazeRatePkr = Math.max(50000, rawBlazeRate);
    const vendorRatePkr = Math.max(30000, rawVendorRate);
    if (blazeRatePkr < vendorRatePkr) {
      blazeRatePkr = Math.round(vendorRatePkr * 1.25);
    }
    const monthlyRentalPkr = blazeRatePkr;
    const productionCostPkr = Number(getVal('Production Cost (PKR)', 'Production', 'Printing')) || Math.round(totalSqFt * 80);
    const mountingCostPkr = Number(getVal('Mounting Cost (PKR)', 'Mounting', 'Installation')) || 30000;

    // Profiling
    let secCategory: SECCategory = 'A';
    const secRaw = String(getVal('SEC (A+/A/B/C)', 'SEC', 'Class') || 'A').toUpperCase();
    if (secRaw.includes('A+')) secCategory = 'A+';
    else if (secRaw.includes('B')) secCategory = 'B';
    else if (secRaw.includes('C')) secCategory = 'C';

    const dailyTrafficVehicles = Math.max(10000, Number(getVal('Daily Traffic (Vehicles)', 'Daily Traffic', 'Traffic', 'Vehicles')) || 250000);
    const dailyGrossImpressions = Math.round(dailyTrafficVehicles * 2.2);
    const dwellTimeSec = Number(getVal('Dwell Time (Sec)', 'Dwell Time', 'Dwell')) || 60;
    const viewingDistanceMeters = Number(getVal('Viewing Distance (Meters)', 'Viewing Distance', 'Distance')) || 350;
    const trafficDirection = String(getVal('Traffic Direction', 'Facing', 'Direction') || 'Facing arterial traffic corridor').trim();

    // Authority NOC
    let authorityNoc: AuthorityNOC = cityMeta.defaultAuthorityNoc || 'CBC';
    const nocRaw = String(getVal('Authority NOC', 'NOC', 'Authority', 'Municipal Authority') || '').toUpperCase();
    if (nocRaw.includes('KMC')) authorityNoc = 'KMC';
    else if (nocRaw.includes('LDA')) authorityNoc = 'LDA';
    else if (nocRaw.includes('CDA')) authorityNoc = 'CDA';
    else if (nocRaw.includes('DHA')) authorityNoc = 'DHA';
    else if (nocRaw.includes('PHA')) authorityNoc = 'PHA';
    else if (nocRaw.includes('RDA')) authorityNoc = 'RDA';
    else if (nocRaw.includes('NHA')) authorityNoc = 'NHA';

    // Status
    let status: AssetStatus = 'Available';
    const statusRaw = String(getVal('Status', 'Availability') || '').toLowerCase();
    if (statusRaw.includes('occup') || statusRaw.includes('book')) status = 'Occupied';
    else if (statusRaw.includes('reserv') || statusRaw.includes('hold')) status = 'Reserved';

    const currentBrandOccupant = String(getVal('Current Brand', 'Brand', 'Occupant') || '').trim();
    const notes = String(getVal('Notes', 'Remarks') || '').trim();

    // Generate code if not provided
    const cityCode = city.slice(0, 3).toUpperCase();
    const typeCode =
      type === 'Digital Screen' || type === 'Digital SMD Screen'
        ? 'SMD'
        : type === 'Billboard'
        ? 'BLB'
        : type === 'Bridge Panel'
        ? 'BRG'
        : type === 'Gantry'
        ? 'GNT'
        : 'UNP';
    const existingCode = String(getVal('Site Code', 'Code', 'ID') || '').trim();
    const code = existingCode || `${cityCode}-${typeCode}-${Math.floor(100 + Math.random() * 900)}`;

    // Select suitable image
    let imageUrl = unipoleImg;
    if (type === 'Digital Screen' || type === 'Digital SMD Screen') imageUrl = doohSmdImg;
    else if (type === 'Bridge Panel') imageUrl = bridgePanelImg;
    else if (type === 'Gantry') imageUrl = gantryImg;
    else if (type === 'Billboard') imageUrl = unipoleImg;

    const coordinates = {
      lat: cityMeta.lat + (Math.random() - 0.5) * 0.04,
      lng: cityMeta.lng + (Math.random() - 0.5) * 0.04,
    };

    const asset: MediaAsset = {
      id: `BLZ-${code}-${Date.now()}-${index}`,
      code,
      title,
      vendor: vendorRaw,
      city,
      area,
      zone: String(getVal('Zone') || `${city} Commercial Corridor`).trim(),
      type,
      dimensions: { widthFt, heightFt, totalSqFt },
      orientation: 'Landscape',
      sides: 2,
      illumination,
      cost: {
        monthlyRentalPkr: blazeRatePkr,
        vendorRatePkr,
        blazeRatePkr,
        productionCostPkr,
        mountingCostPkr,
        taxRatePercent: cityMeta.taxRatePercent || (cityMeta.province === 'Sindh' ? 13 : 16),
      },
      profiling: {
        secCategory,
        dailyTrafficVehicles,
        dailyGrossImpressions,
        dwellTimeSec,
        viewingDistanceMeters,
        trafficDirection,
        targetDemographics: ['Corporate Executives', 'Commuters', 'Shoppers'],
        clutterLevel: 'Low (Solo Prime)',
        peakCongestionHours: '08:30 AM - 11:00 AM & 05:30 PM - 09:00 PM',
        surroundingLandmarks: [area, `${city} Commercial Spine`],
      },
      coordinates,
      authorityNoc,
      status,
      currentBrandOccupant: currentBrandOccupant || undefined,
      imageUrl,
      techSpecs: {
        structureType: 'Heavy Galvanized Steel Frame',
        generatorBackup: true,
        generatorKva: 20,
        lightFixtures: 'High Lumen Weatherproof LED Floodlights',
        foundationType: 'Reinforced Deep Concrete Foundation',
      },
      notes: notes || undefined,
    };

    validAssets.push(asset);
  });

  return {
    validAssets,
    errors,
    totalRows: rawRows.length,
  };
}
