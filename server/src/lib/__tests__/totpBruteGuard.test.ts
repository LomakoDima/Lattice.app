import { describe, it, expect, beforeEach } from 'vitest';
import { isTotpBlocked, recordTotpFailure, clearTotpFailures } from '../totpBruteGuard.js';

describe('totpBruteGuard', () => {
  const userId = 'test-user-1';

  beforeEach(() => {
    clearTotpFailures(userId);
  });

  it('should not block a user with no failures', () => {
    expect(isTotpBlocked(userId)).toBe(false);
  });

  it('should not block after fewer than 5 failures', () => {
    for (let i = 0; i < 4; i++) {
      recordTotpFailure(userId);
    }
    expect(isTotpBlocked(userId)).toBe(false);
  });

  it('should block after 5 failures', () => {
    for (let i = 0; i < 5; i++) {
      recordTotpFailure(userId);
    }
    expect(isTotpBlocked(userId)).toBe(true);
  });

  it('should clear failures', () => {
    for (let i = 0; i < 5; i++) {
      recordTotpFailure(userId);
    }
    expect(isTotpBlocked(userId)).toBe(true);
    clearTotpFailures(userId);
    expect(isTotpBlocked(userId)).toBe(false);
  });

  it('should track users independently', () => {
    const otherUser = 'test-user-2';
    for (let i = 0; i < 5; i++) {
      recordTotpFailure(userId);
    }
    expect(isTotpBlocked(userId)).toBe(true);
    expect(isTotpBlocked(otherUser)).toBe(false);
    clearTotpFailures(otherUser);
  });
});
