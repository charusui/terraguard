import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const BACKEND_DIR = path.join(process.cwd(), 'backend');
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';

export async function POST(req: NextRequest) {
  // --- Auth check ---
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const secret = process.env.DEMO_AUTH_SECRET;
  if (secret && token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { lat, lon, claimed_date, project_name = 'Custom Lookup' } = body;

  if (!lat || !lon || !claimed_date) {
    return NextResponse.json(
      { error: 'Missing required fields: lat, lon, claimed_date' },
      { status: 400 }
    );
  }

  return new Promise<NextResponse>((resolve) => {
    const args = [
      'analyze.py',
      '--lat', String(lat),
      '--lon', String(lon),
      '--date', String(claimed_date),
      '--name', String(project_name),
    ];

    const proc = spawn(PYTHON_CMD, args, { cwd: BACKEND_DIR });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('analyze.py stderr:', stderr);
        resolve(NextResponse.json(
          { error: stderr || 'Analysis script failed' },
          { status: 500 }
        ));
        return;
      }

      try {
        // Python might print warnings before the JSON (e.g., earthengine-api auth warnings).
        // Since json.dumps prints the entire JSON on a single line, we just take the last non-empty line.
        const lines = stdout.trim().split('\n');
        const jsonStr = lines[lines.length - 1];
        
        // Python's json.dumps allows 'NaN' which breaks JS JSON.parse. Replace it with 'null'
        const sanitizedJsonStr = jsonStr.replace(/\bNaN\b/g, 'null');
        const result = JSON.parse(sanitizedJsonStr);

        if (result.error) {
          resolve(NextResponse.json({ error: result.error }, { status: 422 }));
        } else {
          resolve(NextResponse.json(result));
        }
      } catch (e) {
        console.error('PARSE ERROR. Raw stdout:', stdout);
        console.error('Parse exception:', e);
        resolve(NextResponse.json(
          { error: 'Failed to parse analysis output', raw: stdout },
          { status: 500 }
        ));
      }
    });
  });
}
