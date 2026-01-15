interface SpamCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export function SpamCheckbox({ checked, onChange }: SpamCheckboxProps) {
    return (
        <label className="flex items-center gap-4 p-4 rounded-xl glass cursor-pointer group transition-all duration-300 hover:glow-primary">
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer"
                />
                <div className={`
          w-6 h-6 rounded-lg border-2 transition-all duration-300
          ${checked
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-500 group-hover:border-primary-400'
                    }
        `}>
                    {checked && (
                        <svg
                            className="w-full h-full text-white p-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    )}
                </div>
            </div>

            <div className="flex-1">
                <span className="text-white font-medium">
                    The mail system flagged this as spam
                </span>
                <p className="text-sm text-gray-400 mt-0.5">
                    Check this if your email client already marked this email as spam
                </p>
            </div>

            {checked && (
                <div className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-semibold">
                    FLAGGED
                </div>
            )}
        </label>
    );
}
