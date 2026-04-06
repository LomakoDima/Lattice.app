import { describe, it, expect, beforeEach } from 'vitest';
import { isLoginBlocked, recordLoginFailure, clearLoginFailures } from '../loginBruteGuard.js';

describe('loginBruteGuard', () => {
  const email = 'Test@Example.COM';

  beforeEach(() => {
    clearLoginFailures(email);
  });

  it('should not block an email with no failures', () => {
    expect(isLoginBlocked(email)).toBe(false);
  });

  it('should not block after fewer than 7 failures', () => {
    for (let i = 0; i < 6; i++) {
      recordLoginFailure(email);
    }
    expect(isLoginBlocked(email)).toBe(false);
  });

  it('should block after 7 failures', () => {
    for (let i = 0; i < 7; i++) {
      recordLoginFailure(email);
    }
    expect(isLoginBlocked(email)).toBe(true);
  });

  it('should normalize email (case-insensitive)', () => {
    for (let i = 0; i < 7; i++) {
      recordLoginFailure('TEST@example.com');
    }
    expect(isLoginBlocked('test@EXAMPLE.COM')).toBe(true);
  });

  it('should clear failures', () => {
    for (let i = 0; i < 7; i++) {
      recordLoginFailure(email);
    }
    expect(isLoginBlocked(email)).toBe(true);
    clearLoginFailures(email);
    expect(isLoginBlocked(email)).toBe(false);
  });

  it('should track emails independently', () => {
    const other = 'other@example.com';
    for (let i = 0; i < 7; i++) {
      recordLoginFailure(email);
    }
    expect(isLoginBlocked(email)).toBe(true);
    expect(isLoginBlocked(other)).toBe(false);
    clearLoginFailures(other);
  });
});
