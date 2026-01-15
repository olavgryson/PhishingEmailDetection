// Email analysis result types
export interface UrlAnalysisResult {
    url: string;
    isPhishing: boolean;
    confidence: number;
    htmlContent?: string;
    features: UrlFeatures;
    error?: string;
}

export interface UrlFeatures {
    urlLength: number;
    numDots: number;
    numHyphens: number;
    hasIpAddress: boolean;
    isHttps: boolean;
    protocol: string;
    isShortenedUrl: boolean;
    suspiciousTld: boolean;
    numParameters: number;
}

export interface HtmlFeatures {
    numScriptTags: number;
    numIframeTags: number;
    numHiddenElements: number;
    numLinks: number;
    numForms: number;
    hasExternalFormAction: boolean;
    numMetaRefresh: number;
}

export interface EmailAnalysisResult {
    subject: string;
    from: string;
    urls: UrlAnalysisResult[];
    overallRisk: 'safe' | 'suspicious' | 'dangerous';
    riskScore: number;
    timestamp: Date;
    isMarkedAsSpam: boolean;
}

export interface EmailData {
    subject: string;
    from: string;
    to: string;
    date: string;
    body: string;
    htmlBody: string;
}
