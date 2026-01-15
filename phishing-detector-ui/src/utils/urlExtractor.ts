import type { UrlFeatures, HtmlFeatures } from '../types';

// URL shortener domains to detect
const URL_SHORTENERS = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd',
    'buff.ly', 'adf.ly', 'bit.do', 'mcaf.ee', 'su.pr', 'tiny.cc'
];

// Suspicious TLDs commonly used in phishing
const SUSPICIOUS_TLDS = [
    'xyz', 'top', 'click', 'link', 'work', 'tk', 'ml', 'ga', 'cf', 'gq',
    'zip', 'mov', 'info', 'pw', 'cc', 'club'
];

/**
 * Helper to unwrap SafeLinks and other redirectors
 */
function unwrapUrl(url: string): string {
    try {
        // Handle already decoded URLs that might have been double-encoded or malformed
        if (url.endsWith('&amp')) {
            url = url.slice(0, -4);
        }
        if (url.endsWith('&')) {
            url = url.slice(0, -1);
        }

        const parsed = new URL(url);
        
        // Microsoft SafeLinks
        if (parsed.hostname.includes('safelinks.protection.outlook.com') || 
            parsed.hostname.includes('safelinks.protection.office365.us')) {
            const target = parsed.searchParams.get('url');
            if (target) return unwrapUrl(decodeURIComponent(target));
        }
        
        // Google Redirects
        if (parsed.hostname === 'www.google.com' && parsed.pathname === '/url') {
            const target = parsed.searchParams.get('q');
            if (target) return unwrapUrl(decodeURIComponent(target));
        }

        // Inflection.io Tracking
        if (parsed.hostname.includes('tracking.inflection.io')) {
            const target = parsed.searchParams.get('redirect');
            if (target) return unwrapUrl(decodeURIComponent(target));
        }

        return url;
    } catch {
        // If URL parsing fails, return original
        return url;
    }
}

/**
 * Helper to remove tracking parameters for deduplication
 */
function removeTrackingParams(url: string): string {
    try {
        const parsed = new URL(url);
        const trackingParams = ['inf_ver', 'inf_ctx', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        
        trackingParams.forEach(param => parsed.searchParams.delete(param));
        
        // If no query params left, remove the '?'
        return parsed.toString();
    } catch {
        return url;
    }
}

/**
 * Helper to clean URL from trailing punctuation and entities
 */
function cleanUrl(url: string): string {
    // Remove trailing punctuation often caught by regex
    let cleaned = url.replace(/[.,;)>]+$/, '');
    // Remove trailing HTML entities or malformed parts
    cleaned = cleaned.replace(/&amp;?$/, '');
    return cleaned;
}

/**
 * Extract all URLs from email content (both HTML and plain text)
 */
export function extractUrls(content: string): string[] {
    const urls = new Set<string>();

    // Common non-user URLs to ignore (XML schemas, doctypes, etc.)
    const IGNORED_DOMAINS = [
        'w3.org',
        'xml.org',
        'schemas.microsoft.com',
        'purl.org',
        'xmlns.com',
        'adobe.com',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'w3.org',
        'schema.org',
        'tracking.jnfection.io' // Explicitly ignore known tracking domains that cause noise
    ];

    // Asset extensions to ignore
    const IGNORED_EXTENSIONS = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
        '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'
    ];

    // Helper to check if a URL should be ignored
    const isIgnored = (url: string) => {
        try {
            const parsed = new URL(url);
            if (IGNORED_DOMAINS.some(d => parsed.hostname.endsWith(d))) return true;
            if (IGNORED_EXTENSIONS.some(ext => parsed.pathname.toLowerCase().endsWith(ext))) return true;
            return false;
        } catch {
            return false;
        }
    };

    // 1. Try to parse as HTML first to get actual links
    if (content.trim().startsWith('<')) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');

            // Remove script, style, and other non-content tags to avoid noise
            const noiseTags = doc.querySelectorAll('script, style, noscript, meta, link, object, embed');
            noiseTags.forEach(el => el.remove());

            // Get all anchor tags
            const anchors = doc.querySelectorAll('a[href]');
            anchors.forEach(a => {
                // Check if the link is "visible" to the user
                // It must have text content OR an image child
                const hasText = (a.textContent || "").trim().length > 0;
                const hasImage = a.querySelector('img') !== null;
                
                if (!hasText && !hasImage) {
                    return; // Skip invisible links
                }

                let href = a.getAttribute('href');
                if (href && (href.startsWith('http') || href.startsWith('https'))) {
                    href = unwrapUrl(href);
                    href = cleanUrl(href);
                    href = removeTrackingParams(href); // Dedup by removing tracking params
                    if (!isIgnored(href)) {
                        urls.add(href);
                    }
                }
            });

            // Also check for plain text URLs in the visible text content
            // This catches non-clickable links that are just text
            // We use doc.body.innerText instead of textContent to approximate rendered text (ignoring hidden elements)
            // Note: DOMParser in browser environment might not support innerText fully in all contexts, 
            // but textContent is standard. To be safe and avoid "hidden" text, we rely on the fact 
            // that we already removed script/style tags.
            const bodyText = doc.body.textContent || "";
            const textUrlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
            const textMatches = bodyText.match(textUrlPattern);
            if (textMatches) {
                textMatches.forEach(url => {
                    let cleaned = unwrapUrl(url);
                    cleaned = cleanUrl(cleaned);
                    cleaned = removeTrackingParams(cleaned); // Dedup
                    if (!isIgnored(cleaned)) urls.add(cleaned);
                });
            }

        } catch (e) {
            console.warn("Failed to parse HTML for URL extraction, falling back to regex", e);
        }
    } else {
        // Fallback for plain text
        const textUrlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
        const matches = content.match(textUrlPattern);
        if (matches) {
            matches.forEach(url => {
                let cleaned = unwrapUrl(url);
                cleaned = cleanUrl(cleaned);
                cleaned = removeTrackingParams(cleaned); // Dedup
                if (!isIgnored(cleaned)) urls.add(cleaned);
            });
        }
    }

    const finalUrls = Array.from(urls);

    // Console log for user verification
    console.group("🔗 Extracted Links Analysis");
    console.log(`Found ${finalUrls.length} unique links in email body:`);
    finalUrls.forEach((url, i) => console.log(`${i + 1}: ${url}`));
    console.groupEnd();

    return finalUrls;
}

/**
 * Extract URL features for phishing detection
 */
export function extractUrlFeatures(url: string): UrlFeatures {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        // Invalid URL - return suspicious default
        return {
            urlLength: url.length,
            numDots: url.split('.').length - 1,
            numHyphens: (url.match(/-/g) || []).length,
            hasIpAddress: true,
            isHttps: false,
            protocol: 'unknown:',
            isShortenedUrl: false,
            suspiciousTld: true,
            numParameters: 0
        };
    }

    const hostname = parsed.hostname;
    const ipPattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;

    // Get TLD
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1].toLowerCase();

    return {
        urlLength: url.length,
        numDots: hostname.split('.').length - 1,
        numHyphens: (hostname.match(/-/g) || []).length,
        hasIpAddress: ipPattern.test(hostname),
        isHttps: parsed.protocol === 'https:',
        protocol: parsed.protocol,
        isShortenedUrl: URL_SHORTENERS.some(shortener =>
            hostname.includes(shortener)
        ),
        suspiciousTld: SUSPICIOUS_TLDS.includes(tld),
        numParameters: parsed.searchParams.toString().split('&').filter(Boolean).length
    };
}

/**
 * Extract HTML features for phishing detection
 */
export function extractHtmlFeatures(html: string): HtmlFeatures {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Count script tags
    const scripts = doc.querySelectorAll('script').length;

    // Count iframes
    const iframes = doc.querySelectorAll('iframe').length;

    // Count hidden elements
    const hiddenSelectors = [
        '[style*="display:none"]',
        '[style*="display: none"]',
        '[hidden]',
        '[style*="visibility:hidden"]',
        '[style*="visibility: hidden"]'
    ];
    let hiddenCount = 0;
    hiddenSelectors.forEach(selector => {
        try {
            hiddenCount += doc.querySelectorAll(selector).length;
        } catch {
            // Ignore invalid selectors
        }
    });

    // Count links
    const links = doc.querySelectorAll('a[href]').length;

    // Count forms
    const forms = doc.querySelectorAll('form').length;

    // Check for external form actions
    const formElements = doc.querySelectorAll('form[action]');
    let hasExternalForm = false;
    formElements.forEach(form => {
        const action = form.getAttribute('action');
        if (action && (action.startsWith('http://') || action.startsWith('https://'))) {
            hasExternalForm = true;
        }
    });

    // Check for meta refresh
    const metaRefresh = doc.querySelectorAll('meta[http-equiv="refresh"]').length;

    return {
        numScriptTags: scripts,
        numIframeTags: iframes,
        numHiddenElements: hiddenCount,
        numLinks: links,
        numForms: forms,
        hasExternalFormAction: hasExternalForm,
        numMetaRefresh: metaRefresh
    };
}

/**
 * Calculate phishing risk score based on URL features
 */
export function calculateUrlRiskScore(features: UrlFeatures): number {
    let score = 0;

    // URL length (longer = more suspicious)
    if (features.urlLength > 75) score += 15;
    if (features.urlLength > 100) score += 15;
    if (features.urlLength > 150) score += 10;

    // IP address instead of domain
    if (features.hasIpAddress) score += 30;

    // Not HTTPS (skip penalty for mailto links)
    if (!features.isHttps && features.protocol !== 'mailto:') score += 20;

    // Shortened URL
    if (features.isShortenedUrl) score += 25;

    // Suspicious TLD
    if (features.suspiciousTld) score += 20;

    // Many parameters
    if (features.numParameters > 3) score += 10;
    if (features.numParameters > 6) score += 10;

    // Many dots (subdomain abuse)
    if (features.numDots > 3) score += 15;
    if (features.numDots > 5) score += 10;

    // Many hyphens
    if (features.numHyphens > 2) score += 10;

    return Math.min(score, 100);
}

/**
 * Calculate overall HTML risk score
 */
export function calculateHtmlRiskScore(features: HtmlFeatures): number {
    let score = 0;

    // Script tags
    if (features.numScriptTags > 0) score += 10;
    if (features.numScriptTags > 3) score += 15;

    // Iframes
    if (features.numIframeTags > 0) score += 20;

    // Hidden elements
    if (features.numHiddenElements > 0) score += 15;
    if (features.numHiddenElements > 3) score += 15;

    // Forms with external actions
    if (features.hasExternalFormAction) score += 25;

    // Meta refresh (auto-redirect)
    if (features.numMetaRefresh > 0) score += 20;

    return Math.min(score, 100);
}
