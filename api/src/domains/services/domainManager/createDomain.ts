import { db } from '../../../config/firestore';
import { CreateDomainData, Domain, DomainVerification } from './types';
import crypto from 'crypto';

/**
 * Extract root domain from any subdomain
 *
 * Examples:
 * - www.example.com -> example.com
 * - app.example.com -> example.com
 * - mail.example.co.uk -> example.co.uk
 * - example.com -> example.com
 *
 * This ensures TXT records are always checked on the root domain
 *
 * @param domain - Full domain or subdomain
 * @returns Root domain
 */
function extractRootDomain(domain: string): string {
  const parts = domain.split('.');

  // If already a root domain (2 parts), return as-is
  if (parts.length <= 2) {
    return domain;
  }

  // List of known second-level domains (SLDs) for multi-part TLDs
  // e.g., .co.uk, .com.au, .gov.uk, etc.
  const knownSLDs = ['co', 'com', 'org', 'gov', 'edu', 'net', 'ac', 'mil'];

  const lastPart = parts[parts.length - 1];
  const secondLastPart = parts[parts.length - 2];

  // Check if this is a multi-part TLD (e.g., .co.uk)
  // If last part is 2-3 chars AND second-to-last is a known SLD, keep last 3 parts
  if (lastPart.length <= 3 && knownSLDs.includes(secondLastPart)) {
    // Multi-part TLD detected (e.g., mail.example.co.uk -> example.co.uk)
    return parts.slice(-3).join('.');
  }

  // Standard TLD - keep last 2 parts (e.g., www.example.com -> example.com)
  return parts.slice(-2).join('.');
}

/**
 * Create a new base domain record
 *
 * This establishes domain ownership at the tenant level.
 * The domain can then be connected to services like Mailgun.
 *
 * @param data - Domain creation data
 * @returns Created domain
 */
export async function createDomain(data: CreateDomainData): Promise<Domain> {
  let { tenantId, domainId, displayName, description, isPrimary, verificationMethod } = data;

  // Clean up domain input
  const originalDomain = domainId;

  // Strip http:// or https:// if present
  domainId = domainId.replace(/^https?:\/\//, '');

  // Remove trailing slash
  domainId = domainId.replace(/\/$/, '');

  // Remove any path or query parameters
  domainId = domainId.split('/')[0].split('?')[0];

  // Convert to lowercase for consistency
  domainId = domainId.toLowerCase();

  // Extract root domain (strip all subdomains for TXT verification)
  const rootDomain = extractRootDomain(domainId);

  if (rootDomain !== domainId) {
    console.log(`[DOMAIN] Extracted root domain: ${originalDomain} -> ${rootDomain}`);
  }

  domainId = rootDomain;

  // Validate domain format
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  if (!domainRegex.test(domainId)) {
    throw new Error('Invalid domain format. Please enter a domain like: example.com');
  }

  // Check if domain already exists for this tenant
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('domains')
    .doc(domainId);

  const existingDoc = await docRef.get();
  if (existingDoc.exists) {
    throw new Error(`Domain ${domainId} already exists for this tenant`);
  }

  // Generate verification token for DNS TXT verification
  const verificationToken = crypto.randomBytes(16).toString('hex');
  const verificationValue = `auton-verify=${verificationToken}`;

  // Create verification object based on method
  const verification: DomainVerification = {
    method: verificationMethod || 'dns-txt',
    status: 'pending',
    verificationToken,
    verificationValue
  };

  // Create domain document
  const domain: Domain = {
    domainId,
    tenantId,
    displayName: displayName || domainId,
    description,
    isPrimary: isPrimary || false,
    verification,
    connections: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await docRef.set(domain);

  console.log(`[DOMAIN] Created domain ${domainId} for tenant ${tenantId}`);
  return domain;
}
