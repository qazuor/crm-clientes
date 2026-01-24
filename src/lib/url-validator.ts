// URL validation and SSRF protection utilities

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  '169.254.169.254', // AWS metadata
  'metadata',
];

const BLOCKED_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,        // 10.x.x.x
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16-31.x.x
  /^192\.168\.\d{1,3}\.\d{1,3}$/,            // 192.168.x.x
  /^fc00:/i,                                  // IPv6 private
  /^fe80:/i,                                  // IPv6 link-local
  /^::ffff:/i,                               // IPv6 mapped IPv4
];

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Validates a URL for security (SSRF protection)
 * Blocks private IPs, localhost, and dangerous hosts
 */
export function validateUrl(urlString: string): UrlValidationResult {
  try {
    // Basic sanity check
    if (!urlString || typeof urlString !== 'string') {
      return { valid: false, error: 'URL is required' };
    }

    // Trim whitespace
    const trimmedUrl = urlString.trim();

    // Add protocol if missing
    let urlWithProtocol = trimmedUrl;
    if (!trimmedUrl.match(/^https?:\/\//i)) {
      urlWithProtocol = `https://${trimmedUrl}`;
    }

    // Parse URL
    let url: URL;
    try {
      url = new URL(urlWithProtocol);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return { valid: false, error: `Protocol ${url.protocol} is not allowed` };
    }

    // Check for blocked hosts
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return { valid: false, error: 'This hostname is not allowed' };
    }

    // Check for IP-based patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
    }

    // Check for file:// or other dangerous schemes that might bypass protocol check
    if (url.href.toLowerCase().includes('file://')) {
      return { valid: false, error: 'File URLs are not allowed' };
    }

    // Check for username/password in URL (potential credential theft)
    if (url.username || url.password) {
      return { valid: false, error: 'URLs with credentials are not allowed' };
    }

    // Additional check: hostname shouldn't be just a number (could be octal IP)
    if (/^\d+$/.test(hostname)) {
      return { valid: false, error: 'Numeric hostnames are not allowed' };
    }

    // Check for double-encoded attacks
    if (/%25|%00|%0d|%0a/i.test(url.href)) {
      return { valid: false, error: 'URL contains invalid encoding' };
    }

    return {
      valid: true,
      normalizedUrl: url.href
    };

  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'URL validation failed'
    };
  }
}

/**
 * Extract and validate domain from URL
 */
export function extractDomain(urlString: string): string | null {
  const result = validateUrl(urlString);
  if (!result.valid || !result.normalizedUrl) {
    return null;
  }

  try {
    const url = new URL(result.normalizedUrl);
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * Sanitize URL for display (remove credentials, normalize)
 */
export function sanitizeUrlForDisplay(urlString: string): string {
  const result = validateUrl(urlString);
  if (!result.valid || !result.normalizedUrl) {
    return '[invalid URL]';
  }

  try {
    const url = new URL(result.normalizedUrl);
    // Remove credentials
    url.username = '';
    url.password = '';
    return url.href;
  } catch {
    return '[invalid URL]';
  }
}
