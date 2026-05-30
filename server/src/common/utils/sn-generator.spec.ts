import { generateSn } from './sn-generator';

describe('generateSn', () => {
  it('should generate a string starting with default prefix "CL"', () => {
    const sn = generateSn();
    expect(sn).toMatch(/^CL\d{14}[A-Z0-9]{4}$/);
  });

  it('should use a custom prefix', () => {
    const sn = generateSn('TX');
    expect(sn.startsWith('TX')).toBe(true);
    expect(sn).toHaveLength(2 + 14 + 4);
  });

  it('should generate unique values on successive calls', () => {
    const results = new Set(Array.from({ length: 50 }, () => generateSn()));
    expect(results.size).toBe(50);
  });
});
