const SUPPORTED_CATEGORIES = new Set([
  'kg',
  'cz',
  'pc',
  'tdq',
  'wsdcg',
  'mcs',
  'pir',
  'sj',
  'ywbj',
]);

export function isSupportedCategory(category: string): boolean {
  return SUPPORTED_CATEGORIES.has(category);
}
