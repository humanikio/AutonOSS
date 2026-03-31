import { getDomain } from './getDomain';
import { updateDomain } from './updateDomain';
import { VerifyDomainResult } from './types';
import { verifyDnsTxt } from '../../utils/verifyDnsTxt';
import { detectDnsProvider } from '../../utils/detectDnsProvider';

/**
 * Extract root domain from any subdomain
 * (Same logic as createDomain - ensures consistency)
 */
function extractRootDomain(domain: string): string {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;

  const knownSLDs = ['co', 'com', 'org', 'gov', 'edu', 'net', 'ac', 'mil'];
  const lastPart = parts[parts.length - 1];
  const secondLastPart = parts[parts.length - 2];

  if (lastPart.length <= 3 && knownSLDs.includes(secondLastPart)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Verify domain ownership via DNS TXT record
 *
 * Checks if domain has the verification TXT record configured
 * ALWAYS checks the root domain for TXT records (strips subdomains)
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (will be converted to root domain)
 * @returns Verification result
 */
export async function verifyDomain(
  tenantId: string,
  domainId: string
): Promise<VerifyDomainResult> {
  console.log(`[DOMAIN] Starting verification for ${domainId}`);

  const domain = await getDomain(tenantId, domainId);
  if (!domain) {
    throw new Error(`Domain ${domainId} not found`);
  }

  // If already verified, return success
  if (domain.verification.status === 'verified') {
    return {
      success: true,
      verified: true,
      method: domain.verification.method,
      message: 'Domain already verified',
      verifiedAt: domain.verification.verifiedAt
    };
  }

  const { method, verificationValue } = domain.verification;

  // Only support DNS TXT verification
  if (method !== 'dns-txt') {
    return {
      success: false,
      verified: false,
      method,
      message: `Verification method '${method}' is not supported. Only 'dns-txt' is available.`
    };
  }

  if (!verificationValue) {
    throw new Error('Missing verification value for DNS TXT verification');
  }

  // ALWAYS extract root domain for TXT verification
  // This ensures we check example.com even if user entered www.example.com
  const rootDomain = extractRootDomain(domainId);
  if (rootDomain !== domainId) {
    console.log(`[DOMAIN] Using root domain for verification: ${domainId} -> ${rootDomain}`);
  }

  try {
    // Use DNS TXT verification utility on ROOT domain
    const verified = await verifyDnsTxt(rootDomain, verificationValue);

    // Detect DNS provider from TXT records
    let dnsProvider = 'Unknown';
    try {
      dnsProvider = await detectDnsProvider(rootDomain);
      console.log(`[DOMAIN] Detected DNS provider: ${dnsProvider}`);
    } catch (providerError) {
      console.warn('[DOMAIN] Could not detect DNS provider:', providerError);
    }

    if (verified) {
      // Update domain as verified with DNS provider
      await updateDomain(tenantId, domainId, {
        verification: {
          status: 'verified',
          verifiedAt: new Date(),
          lastCheckedAt: new Date(),
          errorMessage: undefined
        },
        dnsProvider
      });

      return {
        success: true,
        verified: true,
        method: 'dns-txt',
        message: 'Domain verified successfully via DNS TXT record',
        verifiedAt: new Date(),
        dnsProvider
      };
    } else {
      // Not verified yet - still update DNS provider
      await updateDomain(tenantId, domainId, {
        verification: {
          lastCheckedAt: new Date(),
          errorMessage: 'Verification TXT record not found'
        },
        dnsProvider
      });

      return {
        success: true,
        verified: false,
        method: 'dns-txt',
        message: `TXT record not found. Please add: ${verificationValue}`,
        dnsProvider
      };
    }
  } catch (error) {
    console.error('[DOMAIN] Verification error:', error);

    // Update verification status
    await updateDomain(tenantId, domainId, {
      verification: {
        status: 'failed',
        lastCheckedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'DNS lookup failed'
      }
    });

    return {
      success: false,
      verified: false,
      method: 'dns-txt',
      message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
