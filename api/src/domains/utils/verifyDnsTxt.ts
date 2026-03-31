import dns from 'dns';

/**
 * Verify domain ownership via DNS TXT record
 *
 * Checks if the domain has a TXT record matching the expected verification value
 * Uses a fresh DNS resolver to bypass caching issues
 *
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @param expectedValue - Expected TXT record value (e.g., "auton-verify=abc123")
 * @returns true if verified, false if not
 * @throws Error if DNS lookup fails (other than ENOTFOUND/ENODATA)
 */
export async function verifyDnsTxt(
  domainId: string,
  expectedValue: string
): Promise<boolean> {
  try {
    console.log(`[DNS_VERIFY] Checking TXT records for ${domainId}`);
    console.log(`[DNS_VERIFY] Looking for: ${expectedValue}`);

    // Use a fresh DNS resolver to bypass caching
    const resolver = new dns.promises.Resolver();

    // Use Google's public DNS for fresh results
    resolver.setServers(['8.8.8.8', '8.8.4.4']);

    // Query DNS TXT records with fresh resolver
    const records = await resolver.resolveTxt(domainId);
    const flatRecords = records.map(record => record.join(''));

    console.log(`[DNS_VERIFY] Found ${flatRecords.length} TXT record(s) (via Google DNS):`, flatRecords);

    // Check if verification value exists (exact match or contains the value)
    const verified = flatRecords.some(record => {
      // Check for exact match
      if (record === expectedValue) {
        console.log(`[DNS_VERIFY] ✓ Exact match found: ${record}`);
        return true;
      }
      // Check if record contains the expected value
      if (record.includes(expectedValue)) {
        console.log(`[DNS_VERIFY] ✓ Partial match found: ${record}`);
        return true;
      }
      return false;
    });

    if (verified) {
      console.log(`[DNS_VERIFY] ✅ Successfully verified ${domainId}`);
    } else {
      console.log(`[DNS_VERIFY] ❌ Verification record not found for ${domainId}`);
      console.log(`[DNS_VERIFY] Expected to find TXT record containing: ${expectedValue}`);
      if (flatRecords.length > 0) {
        console.log(`[DNS_VERIFY] But found these TXT records instead:`, flatRecords);
      }
    }

    // Clean up resolver
    resolver.cancel();

    return verified;

  } catch (error: any) {
    // DNS lookup errors - domain doesn't exist or has no TXT records
    if (error.code === 'ENOTFOUND') {
      console.log(`[DNS_VERIFY] ❌ Domain ${domainId} not found (ENOTFOUND)`);
      return false;
    }

    if (error.code === 'ENODATA') {
      console.log(`[DNS_VERIFY] ❌ No TXT records exist for ${domainId} (ENODATA)`);
      return false;
    }

    // Other errors (network issues, etc.)
    console.error('[DNS_VERIFY] ⚠️ DNS lookup error:', error);
    throw error;
  }
}
