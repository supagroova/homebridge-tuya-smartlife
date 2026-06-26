import { isSupportedCategory } from './supportedCategories';

describe('isSupportedCategory', () => {
  it.each(['kg', 'cz', 'pc', 'tdq'])('supports switch/outlet category %s', (category) => {
    expect(isSupportedCategory(category)).toBe(true);
  });

  it('supports temperature/humidity sensor category', () => {
    expect(isSupportedCategory('wsdcg')).toBe(true);
  });

  it.each(['mcs', 'pir', 'sj', 'ywbj'])('supports read-only sensor category %s', (category) => {
    expect(isSupportedCategory(category)).toBe(true);
  });

  it('supports thermostat category', () => {
    expect(isSupportedCategory('wk')).toBe(true);
  });

  it('does not support unrelated categories as HomeKit skeletons', () => {
    expect(isSupportedCategory('dj')).toBe(false);
  });
});
