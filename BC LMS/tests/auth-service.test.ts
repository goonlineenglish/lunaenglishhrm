import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '@/lib/services/auth-service';

describe('Auth Service', () => {
  describe('Password Hashing & Comparison', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      // Hash should not be the plaintext
      expect(hash).not.toBe(password);
      // Hash should be a bcrypt hash (60+ characters, starts with $2)
      expect(hash).toMatch(/^\$2[aby]\$.{56}$/);
    });

    it('should compare correct password successfully', async () => {
      const password = 'securepassword456';
      const hash = await hashPassword(password);
      const match = await comparePassword(password, hash);

      expect(match).toBe(true);
    });

    it('should reject wrong password', async () => {
      const password = 'correctpassword';
      const hash = await hashPassword(password);
      const wrongPassword = 'wrongpassword';

      const match = await comparePassword(wrongPassword, hash);
      expect(match).toBe(false);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'samepassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Hashes should be different (due to random salt)
      expect(hash1).not.toBe(hash2);
      // But both should match the original password
      expect(await comparePassword(password, hash1)).toBe(true);
      expect(await comparePassword(password, hash2)).toBe(true);
    });

    it('should handle passwords with special characters', async () => {
      const password = 'P@$$w0rd!#*&^()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);
      const match = await comparePassword(password, hash);

      expect(match).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(500); // Very long password
      const hash = await hashPassword(password);
      const match = await comparePassword(password, hash);

      expect(match).toBe(true);
    });

    it('should be case-sensitive for passwords', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const wrongCase = 'testpassword123';
      const match = await comparePassword(wrongCase, hash);

      expect(match).toBe(false);
    });

    it('should reject empty password comparison', async () => {
      const password = 'mypassword';
      const hash = await hashPassword(password);
      const match = await comparePassword('', hash);

      expect(match).toBe(false);
    });

    it('should handle multiple password hashing in sequence', async () => {
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4'];
      const hashes = await Promise.all(passwords.map(hashPassword));

      // All hashes should be different
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);

      // All comparisons should match
      for (let i = 0; i < passwords.length; i++) {
        expect(await comparePassword(passwords[i], hashes[i])).toBe(true);
      }
    });
  });
});
