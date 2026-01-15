import type { UrlAnalysisResult } from '../types';
import { extractUrlFeatures, calculateUrlRiskScore, extractHtmlFeatures, calculateHtmlRiskScore } from './urlExtractor';

/**
 * Fetch HTML content from a URL using a CORS proxy
 * In production, this would be a backend service
 */
export async function fetchUrlContent(url: string): Promise<{ html: string; error?: string }> {
    // For demo purposes, we'll use a public CORS proxy
    // In production, this should be your own backend service
    const corsProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];

    for (const proxyUrl of corsProxies) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                continue;
            }

            const html = await response.text();
            return { html };
        } catch (error) {
            // Try next proxy
            continue;
        }
    }

    return {
        html: '',
        error: 'Could not fetch URL content. The site may be blocking requests.'
    };
}

/**
 * Analyze a single URL for phishing indicators
 */
export async function analyzeUrl(url: string): Promise<UrlAnalysisResult> {
    // Extract URL features
    const urlFeatures = extractUrlFeatures(url);

    // Calculate URL-based risk score
    let riskScore = calculateUrlRiskScore(urlFeatures);
    let htmlContent: string | undefined;
    let error: string | undefined;

    // Try to fetch and analyze HTML content
    try {
        const { html, error: fetchError } = await fetchUrlContent(url);

        if (html && html.length > 0) {
            htmlContent = html;
            const htmlFeatures = extractHtmlFeatures(html);
            const htmlRiskScore = calculateHtmlRiskScore(htmlFeatures);
            // Combine scores (weighted average)
            riskScore = Math.round(riskScore * 0.6 + htmlRiskScore * 0.4);
        }

        if (fetchError) {
            error = fetchError;
        }
    } catch (err) {
        error = 'Failed to analyze HTML content';
    }

    // Determine if phishing based on risk score
    const isPhishing = riskScore >= 40;
    const confidence = Math.min(riskScore / 100, 1);

    return {
        url,
        isPhishing,
        confidence,
        htmlContent,
        features: urlFeatures,
        error
    };
}

/**
 * Analyze multiple URLs in parallel
 */
export async function analyzeUrls(urls: string[]): Promise<UrlAnalysisResult[]> {
    // Limit concurrent requests
    const batchSize = 3;
    const results: UrlAnalysisResult[] = [];

    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(analyzeUrl));
        results.push(...batchResults);
    }

    return results;
}

/**
 * Calculate overall email risk from URL results
 */
export function calculateOverallRisk(results: UrlAnalysisResult[]): {
    level: 'safe' | 'suspicious' | 'dangerous';
    score: number;
} {
    if (results.length === 0) {
        return { level: 'safe', score: 0 };
    }

    // Use the highest risk URL to determine overall risk
    // Only consider URLs that are actually flagged as phishing/suspicious
    const phishingUrls = results.filter(r => r.isPhishing);
    
    let score = 0;

    if (phishingUrls.length > 0) {
        // If we have phishing URLs, take the max confidence
        const maxConfidence = Math.max(...phishingUrls.map(r => r.confidence));
        score = maxConfidence * 100;

        // Increase score if multiple phishing URLs
        if (phishingUrls.length > 1) {
            score = Math.min(score + phishingUrls.length * 5, 100);
        }
    } else {
        // If no URLs are explicitly phishing, check for "suspicious" ones (risk score between 20 and 40)
        // Or just take the average of the top 3 riskiest URLs to see if there's a pattern
        const riskScores = results.map(r => r.confidence * 100).sort((a, b) => b - a);
        const topRisk = riskScores[0] || 0;
        
        // If the highest risk is low (e.g. < 40), the overall score should be low
        score = topRisk;
    }

    let level: 'safe' | 'suspicious' | 'dangerous';
    if (score >= 70) {
        level = 'dangerous';
    } else if (score >= 40) {
        level = 'suspicious';
    } else {
        level = 'safe';
    }

    return { level, score };
}
