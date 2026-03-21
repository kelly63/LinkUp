import { MapPin } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a location...',
  className = '',
  inputRef: externalRef,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=6&addressdetails=0`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSelect = (suggestion: Suggestion) => {
    // Trim the display_name to just the useful portion (up to country)
    const parts = suggestion.display_name.split(', ');
    // Keep city, state, country (last 3 parts) or full name if short
    const trimmed = parts.length > 3 ? parts.slice(0, -1).join(', ') : suggestion.display_name;
    onChange(trimmed);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={`w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors ${className}`}
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-blue-50 transition-colors flex items-start gap-2 border-b border-slate-100 last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{s.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
