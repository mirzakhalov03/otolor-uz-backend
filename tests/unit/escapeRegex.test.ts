import { escapeRegex } from '../../src/utils/escapeRegex';

describe('utils/escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
    expect(escapeRegex('(a+)+$')).toBe('\\(a\\+\\)\\+\\$');
  });

  it('leaves plain text untouched', () => {
    expect(escapeRegex('Aziz Rahmatullayev')).toBe('Aziz Rahmatullayev');
  });
});
