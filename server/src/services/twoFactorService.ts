import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

/** Base32 secret as stored / shown (spaces stripped, case normalized for decoders). */
export function normalizeTotpSecret(secret: string): string {
  return secret.trim().replace(/\s/g, '').toUpperCase();
}

export function generateTotpSecret(): string {
  return generateSecret();
}

/**
 * Verify TOTP. Uses epoch tolerance — otplib defaults to 0s drift, which rejects valid codes
 * if phone/server clocks differ slightly; Microsoft/Google Authenticator expect ±1 step (~30s).
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const secretNorm = normalizeTotpSecret(secret);
  if (!secretNorm) return false;
  const result = verifySync({
    secret: secretNorm,
    token: normalized,
    epochTolerance: 30,
  });
  return result.valid === true;
}

export async function buildTotpEnrollment(
  email: string,
  secret: string
): Promise<{ otpauthUrl: string; qrDataUrl: string }> {
  const otpauthUrl = generateURI({
    issuer: 'Lattice',
    label: email,
    secret: normalizeTotpSecret(secret),
  });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { otpauthUrl, qrDataUrl };
}
