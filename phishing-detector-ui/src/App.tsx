import { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { EmailUploader } from './components/EmailUploader';
import { SpamCheckbox } from './components/SpamCheckbox';
import { ResultCard } from './components/ResultCard';
import { parseEmailFile } from './utils/emailParser';
import { extractUrls } from './utils/urlExtractor';
import { analyzeUrls, calculateOverallRisk } from './utils/urlAnalyzer';
import { analyzeEmailWithML, type MLAnalysisResult } from './utils/mlService';
import type { UrlAnalysisResult, EmailData } from './types';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkedAsSpam, setIsMarkedAsSpam] = useState(false);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [results, setResults] = useState<UrlAnalysisResult[]>([]);
  const [mlResult, setMlResult] = useState<MLAnalysisResult | null>(null);
  const [overallRisk, setOverallRisk] = useState<{ level: 'safe' | 'suspicious' | 'dangerous'; score: number } | null>(null);

  const handleFileSelect = async (file: File) => {
    // Reset state for new file
    setIsLoading(false); // Ensure loading is off when selecting new file
    setResults([]);
    setOverallRisk(null);
    setMlResult(null);
    setIsMarkedAsSpam(false);

    try {
      // Parse the email file immediately to show details
      const email = await parseEmailFile(file);
      setEmailData(email);
      toast.success('Email loaded. Ready to analyze.', {
        style: {
          background: 'rgba(30, 27, 75, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
        },
      });
    } catch (error) {
      console.error('Error parsing email:', error);
      toast.error('Failed to parse email file.', {
        style: { background: 'rgba(127, 29, 29, 0.95)', color: 'white' }
      });
      setEmailData(null);
    }
  };

  const handleAnalyze = async () => {
    if (!emailData) return;

    setIsLoading(true);
    // Clear previous results just in case
    setResults([]);
    setOverallRisk(null);
    setMlResult(null);

    try {
      // --- 1. Content Analysis (ML) ---
      try {
        const mlAnalysis = await analyzeEmailWithML(emailData);
        setMlResult(mlAnalysis);
      } catch (e) {
        console.error("ML analysis failed", e);
      }

      // --- 2. URL Analysis ---
      const content = emailData.htmlBody || emailData.body;
      const urls = extractUrls(content);

      let urlAnalysisResults: UrlAnalysisResult[] = [];

      if (urls.length > 0) {
        toast.success(`Found ${urls.length} URL${urls.length > 1 ? 's' : ''} to analyze`, {
          duration: 2000,
          style: {
            background: 'rgba(30, 27, 75, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
          },
        });
        urlAnalysisResults = await analyzeUrls(urls);
        setResults(urlAnalysisResults);
      } else {
        toast('📭 No links found.', {
          style: {
            background: 'rgba(30, 27, 75, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
          },
          icon: 'ℹ️',
        });
      }

      // --- 3. Overall Risk Calculation ---
      // Combine ML result and URL results
      const urlRisk = calculateOverallRisk(urlAnalysisResults);
      let riskScore = urlRisk.score;

      // Weight ML result heavily if available
      if (mlResult) {
        // If ML says phishing, boost score significantly
        if (mlResult.isPhishing) riskScore = Math.max(riskScore, mlResult.confidence * 100);
      }

      // If user manually flagged as spam, increase risk
      if (isMarkedAsSpam) {
        riskScore = Math.max(riskScore, 50); // Minimum suspicious
      }

      let level: 'safe' | 'suspicious' | 'dangerous';
      if (riskScore >= 70) level = 'dangerous';
      else if (riskScore >= 40) level = 'suspicious';
      else level = 'safe';

      setOverallRisk({ level, score: riskScore });

      // Show toast based on overall result
      if (level === 'dangerous') {
        toast.error('⚠️ High risk detected!', {
          style: {
            background: 'rgba(127, 29, 29, 0.95)',
            color: 'white',
          },
        });
      } else if (level === 'suspicious') {
        toast('⚡ Suspicious elements found', {
          style: {
            background: 'rgba(113, 63, 18, 0.95)',
            color: 'white',
          },
        });
      } else {
        toast.success('Email appears safe', {
          style: {
            background: 'rgba(20, 83, 45, 0.95)',
            color: 'white',
          },
        });
      }

    } catch (error) {
      console.error('Error analyzing email:', error);
      toast.error('Failed to analyze email.', {
        style: { background: 'rgba(127, 29, 29, 0.95)', color: 'white' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setEmailData(null);
    setResults([]);
    setOverallRisk(null);
    setMlResult(null);
    setIsMarkedAsSpam(false);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="max-w-4xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 backdrop-blur-sm">
            <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white via-primary-200 to-purple-200 bg-clip-text text-transparent mb-4">
          Phishing Email Detector
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Upload an email file to analyze its URLs and detect potential phishing attempts
          using advanced HTML and URL pattern analysis.
        </p>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto space-y-6">
        {/* Email Uploader */}
        <section>
          <EmailUploader onFileSelect={handleFileSelect} isLoading={isLoading} />
        </section>

        {/* Email Info & Controls */}
        {emailData && (
          <section className="glass rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Analysis Options</h2>
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors disabled:opacity-50"
              >
                Reset
              </button>
            </div>

            <div className="space-y-4">
              <SpamCheckbox checked={isMarkedAsSpam} onChange={setIsMarkedAsSpam} />

              <button
                onClick={handleAnalyze}
                disabled={isLoading || overallRisk !== null}
                className={`
                        w-full py-4 rounded-xl font-bold text-lg transition-all duration-300
                        flex items-center justify-center gap-3
                        ${isLoading
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : overallRisk
                      ? 'bg-gray-700 cursor-default opacity-50'
                      : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 shadow-lg hover:shadow-primary-500/25'
                  }
                    `}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : overallRisk ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Analysis Complete
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 0 0010 9.87v4.263a1 0 001.555.832l3.197-2.132a1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Analysis
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Overall Risk Assessment */}
        {overallRisk && (
          <section className={`
            rounded-2xl p-6 border transition-all duration-500
            ${overallRisk.level === 'dangerous'
              ? 'bg-danger-500/10 border-danger-500/30 glow-danger'
              : overallRisk.level === 'suspicious'
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-safe-500/10 border-safe-500/30 glow-safe'
            }
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl ${overallRisk.level === 'dangerous' ? 'bg-danger-500/20 text-danger-400' :
                    overallRisk.level === 'suspicious' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-safe-500/20 text-safe-400'
                  }`}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-2xl font-bold ${overallRisk.level === 'dangerous' ? 'text-danger-400' :
                      overallRisk.level === 'suspicious' ? 'text-yellow-400' :
                        'text-safe-400'
                    }`}>
                    {overallRisk.level.toUpperCase()}
                  </h3>
                  <p className="text-gray-400">
                    Combined ML & URL Analysis Score
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Risk Score</p>
                <p className={`text-4xl font-bold ${overallRisk.level === 'dangerous' ? 'text-danger-400' :
                    overallRisk.level === 'suspicious' ? 'text-yellow-400' :
                      'text-safe-400'
                  }`}>
                  {Math.round(overallRisk.score)}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ML Results Section */}
        {mlResult && (
          <section className="glass rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              ML Model Content Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-400 text-sm mb-2">Analysis Result</p>
                <div className={`p-4 rounded-xl border ${mlResult.isPhishing
                    ? 'bg-danger-500/10 border-danger-500/30 text-danger-300'
                    : 'bg-safe-500/10 border-safe-500/30 text-safe-300'
                  }`}>
                  <p className="font-bold text-lg">
                    {mlResult.isPhishing ? 'Phishing Detected' : 'Legitimate Content'}
                  </p>
                  <p className="text-sm opacity-80 mt-1">
                    Based on HTML structure and text patterns
                  </p>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Model Confidence</p>
                <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden mt-4">
                  <div
                    className={`absolute top-0 left-0 h-full transition-all duration-1000 ${mlResult.confidence > 0.7 ? 'bg-danger-500' :
                        mlResult.confidence > 0.4 ? 'bg-yellow-500' : 'bg-safe-500'
                      }`}
                    style={{ width: `${mlResult.confidence * 100}%` }}
                  />
                </div>
                <p className="text-right text-white font-mono mt-2">
                  {(mlResult.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </section>
        )}

        {/* URL Results */}
        {results.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              URL Analysis Results
            </h2>
            <div className="grid gap-4">
              {results.map((result, index) => (
                <ResultCard key={result.url} result={result} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 pb-4">
          <p className="text-gray-500 text-sm">
            Phishing Email Detector • ML-Powered Email Security Analysis
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
