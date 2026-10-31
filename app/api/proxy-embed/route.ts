import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const embedUrl = searchParams.get('url');

    if (!embedUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(embedUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch the embed content
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(embedUrl).origin,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch embed: ${response.status}` },
        { status: response.status }
      );
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'text/html';

    // If it's HTML, we need to proxy it properly
    if (contentType.includes('text/html')) {
      const html = await response.text();
      
      // Modify HTML to fix relative URLs and add proper headers
      const modifiedHtml = html
        .replace(/<head>/i, `<head><base href="${new URL(embedUrl).origin}/">`)
        .replace(/<script[^>]*>/gi, (match) => {
          if (match.includes('src=')) {
            return match.replace(/src="([^"]+)"/gi, (m, url) => {
              if (url.startsWith('http')) return m;
              return `src="${new URL(embedUrl).origin}${url.startsWith('/') ? '' : '/'}${url}"`;
            });
          }
          return match;
        });

      return new NextResponse(modifiedHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // For other content types, just proxy
    const data = await response.arrayBuffer();
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Embed proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
