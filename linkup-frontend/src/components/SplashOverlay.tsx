import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface SplashOverlayProps {
  onDone: () => void;
}

export function SplashOverlay({ onDone }: SplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setFading(true);
    }, 1800);

    const doneTimer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 2300);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(160deg, #1e3a5f 0%, #1a3358 50%, #0f2850 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.5s ease',
        opacity: fading ? 0 : 1,
      }}
    >
      {/* Corner brackets */}
      <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 24 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: '2px solid rgba(255,255,255,0.35)', borderLeft: '2px solid rgba(255,255,255,0.35)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: '2px solid rgba(255,255,255,0.35)', borderRight: '2px solid rgba(255,255,255,0.35)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: '2px solid rgba(255,255,255,0.35)', borderLeft: '2px solid rgba(255,255,255,0.35)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: '2px solid rgba(255,255,255,0.35)', borderRight: '2px solid rgba(255,255,255,0.35)' }} />

        {/* Logo container */}
        <div style={{
          position: 'absolute',
          inset: 8,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
        }}>
          <img
            src="https://i.imgur.com/LnXJJ04.png"
            alt="LinkUp Athletics"
            style={{ width: 52, height: 52, objectFit: 'contain' }}
          />
        </div>
      </div>

      <h1 style={{
        color: '#ffffff',
        fontSize: 28,
        fontWeight: 700,
        margin: '0 0 8px',
        letterSpacing: 0.5,
        fontFamily: 'Magra, Arial, sans-serif',
      }}>
        LinkUp Athletics
      </h1>

      <p style={{
        color: 'rgba(147,197,253,0.85)',
        fontSize: 14,
        margin: 0,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontFamily: 'Arial, sans-serif',
      }}>
        LinkUp. Level Up.
      </p>
    </div>
  );
}
