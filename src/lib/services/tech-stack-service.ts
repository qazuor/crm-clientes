/**
 * Tech Stack Detection Service
 * Detects technologies used on a website
 */

import { logger } from '@/lib/logger';

export interface TechStackResult {
  success: boolean;
  technologies: TechDetection[];
  categories: Record<string, string[]>;
  error?: string;
}

export interface TechDetection {
  name: string;
  category: string;
  version?: string;
  confidence: number;
}

// Technology signatures for detection
const TECH_SIGNATURES: {
  name: string;
  category: string;
  patterns: {
    html?: RegExp[];
    headers?: { name: string; pattern: RegExp }[];
    scripts?: RegExp[];
    meta?: { name: string; content: RegExp }[];
  };
}[] = [
  // CMS
  {
    name: 'WordPress',
    category: 'CMS',
    patterns: {
      html: [/wp-content/i, /wp-includes/i],
      meta: [{ name: 'generator', content: /WordPress/i }],
    },
  },
  {
    name: 'Drupal',
    category: 'CMS',
    patterns: {
      html: [/sites\/default\/files/i, /drupal\.js/i],
      meta: [{ name: 'generator', content: /Drupal/i }],
    },
  },
  {
    name: 'Joomla',
    category: 'CMS',
    patterns: {
      html: [/\/media\/jui\//i],
      meta: [{ name: 'generator', content: /Joomla/i }],
    },
  },
  {
    name: 'Wix',
    category: 'CMS',
    patterns: {
      html: [/wix\.com/i, /wixstatic\.com/i],
    },
  },
  {
    name: 'Squarespace',
    category: 'CMS',
    patterns: {
      html: [/squarespace\.com/i, /static\.squarespace\.com/i],
    },
  },
  {
    name: 'Shopify',
    category: 'E-commerce',
    patterns: {
      html: [/cdn\.shopify\.com/i, /shopify\.com\/s\//i],
    },
  },
  {
    name: 'WooCommerce',
    category: 'E-commerce',
    patterns: {
      html: [/woocommerce/i, /wc-/i],
    },
  },
  {
    name: 'Magento',
    category: 'E-commerce',
    patterns: {
      html: [/magento/i, /mage\//i],
    },
  },
  {
    name: 'PrestaShop',
    category: 'E-commerce',
    patterns: {
      html: [/prestashop/i],
      meta: [{ name: 'generator', content: /PrestaShop/i }],
    },
  },

  // Frameworks
  {
    name: 'React',
    category: 'JavaScript Framework',
    patterns: {
      html: [/__NEXT_DATA__/i, /data-reactroot/i, /react-dom/i],
      scripts: [/react\.production\.min\.js/i, /react-dom/i],
    },
  },
  {
    name: 'Vue.js',
    category: 'JavaScript Framework',
    patterns: {
      html: [/data-v-[a-f0-9]/i, /v-cloak/i],
      scripts: [/vue\.js/i, /vue\.min\.js/i, /vue@/i],
    },
  },
  {
    name: 'Angular',
    category: 'JavaScript Framework',
    patterns: {
      html: [/ng-version/i, /\*ngIf/i, /\*ngFor/i],
      scripts: [/angular/i],
    },
  },
  {
    name: 'Next.js',
    category: 'JavaScript Framework',
    patterns: {
      html: [/__NEXT_DATA__/i, /_next\/static/i],
    },
  },
  {
    name: 'Nuxt.js',
    category: 'JavaScript Framework',
    patterns: {
      html: [/__NUXT__/i, /_nuxt\//i],
    },
  },
  {
    name: 'Svelte',
    category: 'JavaScript Framework',
    patterns: {
      html: [/svelte-/i],
    },
  },
  {
    name: 'jQuery',
    category: 'JavaScript Library',
    patterns: {
      scripts: [/jquery[.-]?(\d+)?\.?(min\.)?js/i],
    },
  },
  {
    name: 'Bootstrap',
    category: 'CSS Framework',
    patterns: {
      html: [/bootstrap/i],
      scripts: [/bootstrap/i],
    },
  },
  {
    name: 'Tailwind CSS',
    category: 'CSS Framework',
    patterns: {
      html: [/class="[^"]*(?:flex|grid|w-|h-|p-|m-|text-|bg-|border-)[^"]*"/i],
    },
  },

  // Analytics
  {
    name: 'Google Analytics',
    category: 'Analytics',
    patterns: {
      html: [/google-analytics\.com/i, /googletagmanager\.com/i, /gtag\(/i, /ga\('send/i],
    },
  },
  {
    name: 'Google Tag Manager',
    category: 'Tag Manager',
    patterns: {
      html: [/googletagmanager\.com\/gtm\.js/i, /GTM-/i],
    },
  },
  {
    name: 'Facebook Pixel',
    category: 'Analytics',
    patterns: {
      html: [/connect\.facebook\.net/i, /fbq\(/i],
    },
  },
  {
    name: 'Hotjar',
    category: 'Analytics',
    patterns: {
      html: [/hotjar\.com/i, /hj\(/i],
    },
  },

  // CDN
  {
    name: 'Cloudflare',
    category: 'CDN',
    patterns: {
      headers: [
        { name: 'server', pattern: /cloudflare/i },
        { name: 'cf-ray', pattern: /.+/ },
      ],
    },
  },
  {
    name: 'Fastly',
    category: 'CDN',
    patterns: {
      headers: [
        { name: 'x-served-by', pattern: /cache-/i },
        { name: 'via', pattern: /varnish/i },
      ],
    },
  },
  {
    name: 'Akamai',
    category: 'CDN',
    patterns: {
      headers: [{ name: 'x-akamai-transformed', pattern: /.+/ }],
    },
  },

  // Web servers
  {
    name: 'nginx',
    category: 'Web Server',
    patterns: {
      headers: [{ name: 'server', pattern: /nginx/i }],
    },
  },
  {
    name: 'Apache',
    category: 'Web Server',
    patterns: {
      headers: [{ name: 'server', pattern: /apache/i }],
    },
  },
  {
    name: 'IIS',
    category: 'Web Server',
    patterns: {
      headers: [{ name: 'server', pattern: /microsoft-iis/i }],
    },
  },

  // Programming languages
  {
    name: 'PHP',
    category: 'Programming Language',
    patterns: {
      headers: [
        { name: 'x-powered-by', pattern: /php/i },
        { name: 'set-cookie', pattern: /PHPSESSID/i },
      ],
    },
  },
  {
    name: 'ASP.NET',
    category: 'Programming Language',
    patterns: {
      headers: [
        { name: 'x-powered-by', pattern: /asp\.net/i },
        { name: 'x-aspnet-version', pattern: /.+/ },
      ],
    },
  },
];

/**
 * Tech Stack Detection Service
 */
export class TechStackService {
  /**
   * Detect technologies used on a URL
   */
  static async detectTechnologies(url: string): Promise<TechStackResult> {
    try {
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CRM-Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return {
          success: false,
          technologies: [],
          categories: {},
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();
      const headers = response.headers;

      const technologies: TechDetection[] = [];
      const seen = new Set<string>();

      // Check each technology signature
      for (const tech of TECH_SIGNATURES) {
        let detected = false;
        let confidence = 0;
        let matchCount = 0;

        const patterns = tech.patterns;

        // Check HTML patterns
        if (patterns.html) {
          for (const pattern of patterns.html) {
            if (pattern.test(html)) {
              matchCount++;
              detected = true;
            }
          }
        }

        // Check script patterns
        if (patterns.scripts) {
          for (const pattern of patterns.scripts) {
            if (pattern.test(html)) {
              matchCount++;
              detected = true;
            }
          }
        }

        // Check meta patterns
        if (patterns.meta) {
          for (const meta of patterns.meta) {
            const metaRegex = new RegExp(
              `<meta[^>]*name=["']${meta.name}["'][^>]*content=["']([^"']*)["']`,
              'i'
            );
            const match = html.match(metaRegex);
            if (match && meta.content.test(match[1])) {
              matchCount++;
              detected = true;
            }
          }
        }

        // Check header patterns
        if (patterns.headers) {
          for (const headerPattern of patterns.headers) {
            const headerValue = headers.get(headerPattern.name);
            if (headerValue && headerPattern.pattern.test(headerValue)) {
              matchCount++;
              detected = true;
            }
          }
        }

        if (detected && !seen.has(tech.name)) {
          // Calculate confidence based on number of matches
          const totalPatterns =
            (patterns.html?.length || 0) +
            (patterns.scripts?.length || 0) +
            (patterns.meta?.length || 0) +
            (patterns.headers?.length || 0);
          confidence = Math.min(100, Math.round((matchCount / totalPatterns) * 100));

          technologies.push({
            name: tech.name,
            category: tech.category,
            confidence,
          });
          seen.add(tech.name);
        }
      }

      // Sort by confidence
      technologies.sort((a, b) => b.confidence - a.confidence);

      // Group by category
      const categories: Record<string, string[]> = {};
      for (const tech of technologies) {
        if (!categories[tech.category]) {
          categories[tech.category] = [];
        }
        categories[tech.category].push(tech.name);
      }

      return {
        success: true,
        technologies,
        categories,
      };
    } catch (error) {
      logger.warn('Tech stack detection failed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        technologies: [],
        categories: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
