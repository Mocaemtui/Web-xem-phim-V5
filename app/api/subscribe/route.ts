import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getVapidKeys } from '@/lib/webpush';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUB_FILE = path.join(DATA_DIR, 'subscriptions.json');

// GET VAPID Public Key
export async function GET() {
  try {
    const keys = getVapidKeys();
    return NextResponse.json({ publicKey: keys.publicKey });
  } catch (error) {
    console.error('Failed to get public key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST Subscribe / Save subscription
export async function POST(req: NextRequest) {
  try {
    const { subscription, movieSlug } = await req.json();

    if (!subscription || !movieSlug) {
      return NextResponse.json({ error: 'Missing subscription or movieSlug' }, { status: 400 });
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let subscriptions: any[] = [];
    if (fs.existsSync(SUB_FILE)) {
      try {
        subscriptions = JSON.parse(fs.readFileSync(SUB_FILE, 'utf8'));
      } catch (e) {
        subscriptions = [];
      }
    }

    // Check if subscription already exists for this movieSlug
    const exists = subscriptions.some(
      (sub: any) => sub.movieSlug === movieSlug && sub.subscription.endpoint === subscription.endpoint
    );

    if (!exists) {
      subscriptions.push({
        subscription,
        movieSlug,
        createdAt: new Date().toISOString(),
      });
      fs.writeFileSync(SUB_FILE, JSON.stringify(subscriptions, null, 2), 'utf8');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to subscribe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
