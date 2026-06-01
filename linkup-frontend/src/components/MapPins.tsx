import { MapPin } from 'lucide-react';

interface PinLocation {
  id: number;
  top: string;
  left: string;
  color: string;
}

const pins: PinLocation[] = [
  { id: 1, top: '25%', left: '35%', color: 'text-red-500' },
  { id: 2, top: '45%', left: '60%', color: 'text-emerald-500' },
  { id: 3, top: '55%', left: '25%', color: 'text-green-500' },
  { id: 4, top: '35%', left: '70%', color: 'text-orange-500' },
  { id: 5, top: '65%', left: '50%', color: 'text-purple-500' },
];

export function MapPins() {
  return (
    <>
      {pins.map((pin) => (
        <div
          key={pin.id}
          className="absolute z-20 animate-bounce cursor-pointer"
          style={{ 
            top: pin.top, 
            left: pin.left,
            animationDuration: `${1.5 + pin.id * 0.2}s`,
            animationDelay: `${pin.id * 0.1}s`
          }}
        >
          <div className="relative group">
            <MapPin 
              className={`w-10 h-10 ${pin.color} drop-shadow-lg transition-transform group-hover:scale-110`}
              fill="currentColor"
            />
            {/* Pin shadow */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-black/20 rounded-full blur-sm"></div>
          </div>
        </div>
      ))}
    </>
  );
}
