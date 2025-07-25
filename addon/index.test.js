const addon = require('./index');

describe('addon manifest', () => {
  test('has expected id', () => {
    expect(addon.manifest.id).toBe('org.montana.openaitv');
  });
});
