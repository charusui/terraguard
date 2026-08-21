import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Next.js requires the `icon` file convention to live under app/, but the
// brand mark itself stays in src/assets/logo.png (its one canonical copy,
// also used by GlobalNav) — this route just reads and serves those same
// bytes as the browser tab icon instead of duplicating the file.
export const size = { width: 2000, height: 2000 };
export const contentType = 'image/png';

export default async function Icon() {
  const logo = await readFile(path.join(process.cwd(), 'src', 'assets', 'logo.png'));
  return new Response(logo, {
    headers: { 'Content-Type': contentType },
  });
}
