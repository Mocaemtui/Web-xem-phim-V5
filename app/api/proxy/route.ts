import { NextRequest, NextResponse } from 'next/server';
import { fetchAPI } from '@/lib/api';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint') || '';
    const baseUrl = searchParams.get('baseUrl') || undefined;
    const revalidateStr = searchParams.get('revalidate');
    const revalidate = revalidateStr ? parseInt(revalidateStr, 10) : 86400;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    let finalBaseUrl = baseUrl;
    if (baseUrl) {
      const SOURCE_MAP: Record<string, string> = {
        primary: 'https://phimapi.com',
        phimapi: 'https://phimapi.com',
        backup: 'https://ophim1.com',
        ophim: 'https://ophim1.com',
        nguonc: 'https://phim.nguonc.com'
      };
      const lowerVal = baseUrl.toLowerCase();
      if (SOURCE_MAP[lowerVal]) {
        finalBaseUrl = SOURCE_MAP[lowerVal];
      } else if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        // Attempt to decode base64
        try {
          const decoded = atob(baseUrl);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            finalBaseUrl = decoded;
          }
        } catch (e) {}
      }
    }

    const data = await fetchAPI(endpoint, revalidate, finalBaseUrl);
    const response = NextResponse.json(data);

    // Lưu Edge CDN cache để giải phóng tài nguyên CPU Serverless trên Vercel
    if (revalidate > 0) {
      response.headers.set(
        'Cache-Control',
        `public, s-maxage=${revalidate}, stale-while-revalidate=59`
      );
    }

    return response;
  } catch (error) {
    console.error('API proxy handler error:', error);
    return NextResponse.json({ error: 'Internal server error during proxy fetch' }, { status: 500 });
  }
}
