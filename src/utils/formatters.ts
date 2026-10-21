import { Currency } from '../types/mediaAsset';

export const PKR_TO_USD_RATE = 0.0036; // Approx 1 USD = ~278 PKR

export function formatCurrency(amountPkr: number, currency: Currency = 'PKR'): string {
  if (currency === 'USD') {
    const usd = Math.round(amountPkr * PKR_TO_USD_RATE);
    return `$${usd.toLocaleString('en-US')}`;
  }

  // PKR formatting: If >= 10,000,000 show in Crores, if >= 100,000 show in Lakhs
  if (amountPkr >= 10000000) {
    const crore = (amountPkr / 10000000).toFixed(2);
    return `₨ ${crore} Cr`;
  }
  if (amountPkr >= 100000) {
    const lakh = (amountPkr / 100000).toFixed(2);
    return `₨ ${lakh} Lac`;
  }
  return `₨ ${amountPkr.toLocaleString('en-PK')}`;
}

export function formatFullCurrency(amountPkr: number, currency: Currency = 'PKR'): string {
  if (currency === 'USD') {
    const usd = Math.round(amountPkr * PKR_TO_USD_RATE);
    return `$${usd.toLocaleString('en-US')}`;
  }
  return `₨ ${amountPkr.toLocaleString('en-PK')}`;
}

export function formatNumberCompact(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}k`;
  }
  return num.toString();
}

export function calculateCPM(monthlyRentalPkr: number, dailyGrossImpressions: number): number {
  if (!dailyGrossImpressions || dailyGrossImpressions <= 0) return 0;
  const monthlyGrossImpressions = dailyGrossImpressions * 30;
  return Number(((monthlyRentalPkr / monthlyGrossImpressions) * 1000).toFixed(1));
}
