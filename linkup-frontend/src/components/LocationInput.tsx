import { useState, useRef, useEffect } from 'react';
import { MapPin, Locate, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface Suggestion {
  label: string;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR',
  California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
};

function abbr(stateFull: string): string {
  return STATE_ABBR[stateFull] || stateFull;
}

export function LocationInput({ value, onChange, error }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function search(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&countrycodes=us`,
          { headers: { 'Accept-Language': 'en-US', 'User-Agent': 'LinkUpAthletics/1.0' } }
        );
        const data: any[] = await res.json();
        const seen = new Set<string>();
        const results: Suggestion[] = [];
        for (const item of data) {
          const a = item.address ?? {};
          const city = a.city || a.town || a.village || a.hamlet || a.suburb || '';
          const state = abbr(a.state || '');
          if (!city || !state) continue;
          const label = `${city}, ${state}`;
          if (!seen.has(label)) { seen.add(label); results.push({ label }); }
        }
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {}
      setSearching(false);
    }, 350);
  }

  async function handleGPS() {
    setGpsLoading(true);
    try {
      let lat: number, lon: number;
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== 'granted') { setGpsLoading(false); return; }
        const pos = await Geolocation.getCurrentPosition({ timeout: 10000 });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } else {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'Accept-Language': 'en-US', 'User-Agent': 'LinkUpAthletics/1.0' } }
      );
      const data = await res.json();
      const a = data.address ?? {};
      const city = a.city || a.town || a.village || a.hamlet || '';
      const state = abbr(a.state || '');
      if (city && state) {
        onChange(`${city}, ${state}`);
        setSuggestions([]);
        setOpen(false);
      }
    } catch (err) {
      console.error('[GPS]', err);
    }
    setGpsLoading(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center border-2 rounded-xl bg-white transition-colors ${
          error
            ? 'border-red-400'
            : 'border-slate-300 focus-within:border-emerald-500'
        }`}
      >
        <MapPin className="w-4 h-4 text-slate-400 ml-4 flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); search(e.target.value); }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="City, State"
          autoComplete="off"
          className="flex-1 px-3 py-3 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-base"
        />
        {searching && (
          <Loader2 className="w-4 h-4 text-slate-400 mr-2 animate-spin flex-shrink-0" />
        )}
        <button
          type="button"
          onClick={handleGPS}
          disabled={gpsLoading}
          title="Use my location"
          className="mr-2 p-2 rounded-lg hover:bg-emerald-50 transition-colors flex-shrink-0"
        >
          {gpsLoading
            ? <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
            : <Locate className="w-4 h-4 text-emerald-500" />
          }
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s.label);
                setSuggestions([]);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-800">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
