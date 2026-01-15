import type { EmailData } from '../types';

export interface MLAnalysisResult {
    isPhishing: boolean;
    confidence: number;
    riskLevel: 'safe' | 'suspicious' | 'dangerous';
    error?: string;
}

const API_URL = 'http://localhost:8000';

export async function analyzeEmailWithML(email: EmailData): Promise<MLAnalysisResult> {
    try {
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject: email.subject,
                body: email.body + " " + (email.htmlBody || ""), // simplistic combination for demo
                sender: email.from
            }),
        });

        if (!response.ok) {
            throw new Error('ML Service unavailable');
        }

        const data = await response.json();
        return {
            isPhishing: data.is_phishing,
            confidence: data.confidence,
            riskLevel: data.risk_level as 'safe' | 'suspicious' | 'dangerous'
        };
    } catch (error) {
        console.error("ML Analysis failed", error);
        return {
            isPhishing: false,
            confidence: 0,
            riskLevel: 'safe', // Fallback
            error: 'Could not connect to ML backend'
        };
    }
}

export async function checkBackendHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/`);
        return res.ok;
    } catch {
        return false;
    }
}
