import dns from 'dns';

/**
 * Detect DNS provider from TXT records
 *
 * Analyzes TXT records to identify the DNS provider based on common patterns
 *
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @returns DNS provider name or 'Unknown'
 */
export async function detectDnsProvider(domainId: string): Promise<string> {
  try {
    console.log(`[DNS_DETECT] Detecting provider for ${domainId}`);

    // Use a fresh DNS resolver
    const resolver = new dns.promises.Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);

    // Query DNS TXT records
    const records = await resolver.resolveTxt(domainId);
    const flatRecords = records.map(record => record.join('')).join(' ').toLowerCase();

    console.log(`[DNS_DETECT] Found TXT records:`, flatRecords);

    // Check for provider-specific patterns
    const providers = [
      { name: 'Cloudflare', patterns: ['cloudflare', 'cf-'] },
      { name: 'GoDaddy', patterns: ['godaddy', 'secureserver'] },
      { name: 'Namecheap', patterns: ['namecheap', 'registrar-servers.com'] },
      { name: 'Google Domains', patterns: ['google-site-verification', 'google._domainkey'] },
      { name: 'AWS Route 53', patterns: ['amazonses', 'awsroute53'] },
      { name: 'DigitalOcean', patterns: ['digitalocean'] },
      { name: 'Network Solutions', patterns: ['networksolutions'] },
      { name: 'Bluehost', patterns: ['bluehost'] },
      { name: 'HostGator', patterns: ['hostgator'] },
      { name: 'DreamHost', patterns: ['dreamhost'] },
      { name: 'Wix', patterns: ['wix.com'] },
      { name: 'Squarespace', patterns: ['squarespace'] },
    ];

    for (const provider of providers) {
      for (const pattern of provider.patterns) {
        if (flatRecords.includes(pattern)) {
          console.log(`[DNS_DETECT] ✓ Detected provider: ${provider.name}`);
          resolver.cancel();
          return provider.name;
        }
      }
    }

    // Check NS records for additional hints
    try {
      const nsRecords = await resolver.resolveNs(domainId);
      const nsString = nsRecords.join(' ').toLowerCase();

      console.log(`[DNS_DETECT] NS records:`, nsString);

      const nsProviders = [
        { name: 'Cloudflare', patterns: ['cloudflare.com'] },
        { name: 'GoDaddy', patterns: ['domaincontrol.com'] },
        { name: 'Namecheap', patterns: ['namecheaphosting.com', 'registrar-servers.com'] },
        { name: 'AWS Route 53', patterns: ['awsdns'] },
        { name: 'Google Cloud DNS', patterns: ['googledomains.com'] },
        { name: 'DigitalOcean', patterns: ['digitalocean.com'] },
      ];

      for (const provider of nsProviders) {
        for (const pattern of provider.patterns) {
          if (nsString.includes(pattern)) {
            console.log(`[DNS_DETECT] ✓ Detected provider from NS: ${provider.name}`);
            resolver.cancel();
            return provider.name;
          }
        }
      }
    } catch (error) {
      console.log(`[DNS_DETECT] Could not query NS records:`, error);
    }

    console.log(`[DNS_DETECT] Could not detect provider`);
    resolver.cancel();
    return 'Unknown';

  } catch (error: any) {
    console.error('[DNS_DETECT] Error detecting provider:', error);
    return 'Unknown';
  }
}
