import { useState, useCallback } from 'react';
import { isValidEmailFile } from '../utils/emailParser';

interface EmailUploaderProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
}

export function EmailUploader({ onFileSelect, isLoading }: EmailUploaderProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            processFile(files[0]);
        }
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            processFile(files[0]);
        }
    }, []);

    const processFile = (file: File) => {
        if (!isValidEmailFile(file)) {
            alert('Please upload a valid .eml or .msg file');
            return;
        }
        setFileName(file.name);
        onFileSelect(file);
    };

    return (
        <div className="w-full">
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
          drop-zone relative rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300 ease-out
          ${isDragActive ? 'active scale-[1.02]' : ''}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          glass hover:glow-primary
        `}
            >
                <input
                    type="file"
                    accept=".eml,.msg"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading}
                />

                <div className="flex flex-col items-center gap-4">
                    {/* Upload Icon */}
                    <div className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isDragActive
                            ? 'bg-primary-500/30 scale-110'
                            : 'bg-gradient-to-br from-primary-500/20 to-purple-500/20'
                        }
          `}>
                        <svg
                            className={`w-10 h-10 transition-colors duration-300 ${isDragActive ? 'text-primary-400' : 'text-primary-300'
                                }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                    </div>

                    {/* Text */}
                    <div className="space-y-2">
                        <p className="text-xl font-semibold text-white">
                            {isDragActive ? 'Drop your email file here' : 'Drop email file or click to upload'}
                        </p>
                        <p className="text-sm text-gray-400">
                            Supports .EML and .MSG formats
                        </p>
                    </div>

                    {/* Selected file indicator */}
                    {fileName && !isLoading && (
                        <div className="mt-4 px-4 py-2 rounded-full bg-primary-500/20 text-primary-300 text-sm font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {fileName}
                        </div>
                    )}

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="mt-4 flex items-center gap-3 text-primary-300">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="font-medium">Analyzing email...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
