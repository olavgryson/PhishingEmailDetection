import type { UrlAnalysisResult } from '../types';

interface ResultCardProps {
    result: UrlAnalysisResult;
    index: number;
}

export function ResultCard({ result, index }: ResultCardProps) {
    const getRiskLevel = (confidence: number, isPhishing: boolean) => {
        if (!isPhishing) return 'safe';
        if (confidence >= 0.8) return 'dangerous';
        if (confidence >= 0.5) return 'suspicious';
        return 'safe';
    };

    const riskLevel = getRiskLevel(result.confidence, result.isPhishing);

    const riskStyles = {
        safe: {
            border: 'border-safe-500/30',
            bg: 'bg-safe-500/10',
            text: 'text-safe-400',
            glow: 'glow-safe',
            label: 'SAFE',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            )
        },
        suspicious: {
            border: 'border-yellow-500/30',
            bg: 'bg-yellow-500/10',
            text: 'text-yellow-400',
            glow: '',
            label: 'SUSPICIOUS',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        dangerous: {
            border: 'border-danger-500/30',
            bg: 'bg-danger-500/10',
            text: 'text-danger-400',
            glow: 'glow-danger',
            label: 'DANGEROUS',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v.01M12 12v.01M12 9v.01M12 6v.01M12 3v.01M12 18v.01M9.172 9.172a4 4 0 105.656 5.656M12 21a9 9 0 110-18 9 9 0 010 18z" />
                </svg>
            )
        }
    };

    const style = riskStyles[riskLevel];

    return (
        <div
            className={`
        rounded-xl border ${style.border} ${style.bg} p-5
        transition-all duration-300 animate-fade-in
        ${style.glow}
      `}
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${style.bg} ${style.text}`}>
                        {style.icon}
                    </div>
                    <div>
                        <span className={`text-xs font-bold ${style.text}`}>
                            {style.label}
                        </span>
                        <p className="text-white font-medium text-sm mt-0.5">
                            URL #{index + 1}
                        </p>
                    </div>
                </div>

                {/* Confidence Score */}
                <div className="text-right">
                    <p className="text-gray-400 text-xs">Confidence</p>
                    <p className={`text-lg font-bold ${style.text}`}>
                        {(result.confidence * 100).toFixed(0)}%
                    </p>
                </div>
            </div>

            {/* URL */}
            <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">URL</p>
                <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-300 hover:text-primary-200 text-sm break-all transition-colors font-mono"
                >
                    {result.url.length > 80 ? result.url.substring(0, 80) + '...' : result.url}
                </a>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FeatureBadge
                    label="URL Length"
                    value={result.features.urlLength.toString()}
                    warning={result.features.urlLength > 75}
                />
                <FeatureBadge
                    label="HTTPS"
                    value={result.features.isHttps ? 'Yes' : 'No'}
                    warning={!result.features.isHttps}
                />
                <FeatureBadge
                    label="IP Address"
                    value={result.features.hasIpAddress ? 'Yes' : 'No'}
                    warning={result.features.hasIpAddress}
                />
                <FeatureBadge
                    label="Shortened"
                    value={result.features.isShortenedUrl ? 'Yes' : 'No'}
                    warning={result.features.isShortenedUrl}
                />
            </div>

            {/* Error message if any */}
            {result.error && (
                <div className="mt-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20">
                    <p className="text-danger-300 text-sm">
                        <span className="font-semibold">Error:</span> {result.error}
                    </p>
                </div>
            )}
        </div>
    );
}

function FeatureBadge({ label, value, warning }: { label: string; value: string; warning: boolean }) {
    return (
        <div className={`
      px-3 py-2 rounded-lg text-center
      ${warning ? 'bg-danger-500/10 border border-danger-500/20' : 'bg-white/5'}
    `}>
            <p className="text-gray-400 text-xs">{label}</p>
            <p className={`font-semibold text-sm ${warning ? 'text-danger-300' : 'text-white'}`}>
                {value}
            </p>
        </div>
    );
}
