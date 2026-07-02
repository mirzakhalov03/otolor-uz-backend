describe('auth.service', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'pw';
  });

  it('verifies correct credentials and rejects wrong ones', async () => {
    const { authService } = await import('../../src/services/auth.service');
    expect(authService.verifyCredentials('admin', 'pw')).toBe(true);
    expect(authService.verifyCredentials('admin', 'nope')).toBe(false);
    expect(authService.verifyCredentials('nope', 'pw')).toBe(false);
  });

  it('signs a token that it can verify back to the admin payload', async () => {
    const { authService } = await import('../../src/services/auth.service');
    const token = authService.signToken();
    const payload = authService.verifyToken(token);
    expect(payload.role).toBe('admin');
    expect(payload.sub).toBe('admin');
  });

  it('throws 401 on an invalid token', async () => {
    const { authService } = await import('../../src/services/auth.service');
    expect(() => authService.verifyToken('garbage')).toThrow();
  });
});
