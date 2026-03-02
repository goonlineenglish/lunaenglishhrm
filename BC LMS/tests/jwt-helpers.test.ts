import { describe, it, expect, beforeAll } from 'vitest';
import { signJwt, verifyJwt } from '@/lib/auth/jwt-helpers';

// Mock JWT_SECRET for testing
beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long-for-testing-purposes';
  }
});

describe('JWT Helpers', () => {
  it('should sign and verify a valid token', async () => {
    const payload = {
      sub: 'user1',
      jti: 'sess1',
      email: 'test@test.com',
      role: 'TEACHER' as const,
      school: null,
    };

    const token = await signJwt(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature

    const verified = await verifyJwt(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('user1');
    expect(verified?.jti).toBe('sess1');
    expect(verified?.email).toBe('test@test.com');
    expect(verified?.role).toBe('TEACHER');
    expect(verified?.school).toBeNull();
    expect(verified?.iat).toBeDefined();
    expect(verified?.exp).toBeDefined();
  });

  it('should return null for invalid token', async () => {
    const result = await verifyJwt('invalid-token');
    expect(result).toBeNull();
  });

  it('should return null for malformed token', async () => {
    const result = await verifyJwt('header.payload'); // Missing signature
    expect(result).toBeNull();
  });

  it('should sign tokens with different payloads correctly', async () => {
    const payload1 = {
      sub: 'user1',
      jti: 'sess1',
      email: 'user1@test.com',
      role: 'ADMIN' as const,
      school: null,
    };

    const payload2 = {
      sub: 'user2',
      jti: 'sess2',
      email: 'user2@test.com',
      role: 'MANAGER' as const,
      school: 'School A',
    };

    const token1 = await signJwt(payload1);
    const token2 = await signJwt(payload2);

    expect(token1).not.toBe(token2); // Different tokens

    const verified1 = await verifyJwt(token1);
    const verified2 = await verifyJwt(token2);

    expect(verified1?.sub).toBe('user1');
    expect(verified1?.role).toBe('ADMIN');
    expect(verified2?.sub).toBe('user2');
    expect(verified2?.role).toBe('MANAGER');
    expect(verified2?.school).toBe('School A');
  });
});
