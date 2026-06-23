import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

async function schoolLogoDataUrl(): Promise<string> {
  const file = await readFile(path.join(process.cwd(), 'public', 'school-logo.png'));
  return `data:image/png;base64,${file.toString('base64')}`;
}

export default async function AppleIcon() {
  const logo = await schoolLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={162} height={162} style={{ objectFit: 'contain' }} />
      </div>
    ),
    { ...size },
  );
}
