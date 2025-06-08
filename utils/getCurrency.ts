import * as Localization from 'expo-localization';

const currencyMap: Record<string, string> = {
  NG: 'NGN',
  US: 'USD',
  GB: 'GBP',
  KE: 'KES',
  GH: 'GHS',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  CM: 'XAF',
  CI: 'XOF',
  SN: 'XOF',
  RW: 'RWF',
  UG: 'UGX',
  ZA: 'ZAR',
  IN: 'INR',
  CN: 'CNY',
  JP: 'JPY',
  CA: 'CAD',
  AU: 'AUD',
};

export const getCountryAndCurrency = () => {
  const country = Localization.region || 'US'; // fallback
  const currency = currencyMap[country] || 'USD'; // fallback
  return { country, currency };
};
