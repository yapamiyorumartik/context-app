import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Context — A reading companion for English learners';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FAFAF9',
          padding: 80,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: '#475569',
            fontFamily: 'sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Context
        </div>
        <div
          style={{
            fontSize: 88,
            color: '#0F172A',
            fontFamily: 'serif',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>Read English.</span>
          <span>Without breaking flow.</span>
        </div>
        <div
          style={{
            fontSize: 22,
            color: '#64748B',
            fontFamily: 'sans-serif',
          }}
        >
          A reading companion for B2+ English learners.
        </div>
      </div>
    ),
    { ...size }
  );
}
