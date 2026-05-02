import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FAFAF9',
          color: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontFamily: 'serif',
          fontWeight: 600,
          letterSpacing: '-0.04em',
        }}
      >
        C
      </div>
    ),
    { ...size }
  );
}
