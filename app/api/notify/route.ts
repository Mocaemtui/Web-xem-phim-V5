import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { initWebPush, webpush } from '@/lib/webpush';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUB_FILE = path.join(DATA_DIR, 'subscriptions.json');

export async function POST(req: NextRequest) {
  try {
    const { movieSlug, movieName, episodeName } = await req.json();

    if (!movieSlug || !movieName || !episodeName) {
      return NextResponse.json({ error: 'Missing movieSlug, movieName, or episodeName' }, { status: 400 });
    }

    if (!fs.existsSync(SUB_FILE)) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'No subscriptions found' });
    }

    let subscriptions: any[] = [];
    try {
      subscriptions = JSON.parse(fs.readFileSync(SUB_FILE, 'utf8'));
    } catch (e) {
      return NextResponse.json({ error: 'Failed to read subscriptions data' }, { status: 500 });
    }

    // Filter subscriptions for this movie
    const targets = subscriptions.filter((sub: any) => sub.movieSlug === movieSlug);

    if (targets.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'No targets subscribed to this movie' });
    }

    // Init web push details (keys)
    initWebPush();

    const payload = JSON.stringify({
      title: 'Mocaemtui - Có tập mới! 🎉',
      body: `Phim "${movieName}" vừa có ${episodeName} cực nóng! Xem ngay thôi nào! 🔥`,
      url: `/xem-phim/${movieSlug}`,
    });

    const results = await Promise.allSettled(
      targets.map(async (target: any) => {
        try {
          await webpush.sendNotification(target.subscription, payload);
          return { status: 'success', target };
        } catch (err: any) {
          // If subscription is invalid (expired/unsubscribed), flag it for removal
          if (err.statusCode === 410 || err.statusCode === 404) {
            return { status: 'expired', target };
          }
          throw err;
        }
      })
    );

    let sentCount = 0;
    let expiredCount = 0;
    const expiredEndpoints = new Set<string>();

    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        if (res.value.status === 'success') {
          sentCount++;
        } else if (res.value.status === 'expired') {
          expiredCount++;
          expiredEndpoints.add(res.value.target.subscription.endpoint);
        }
      } else {
        console.error('Failed to send push notification:', res.reason);
      }
    });

    // Clean up expired subscriptions from file
    if (expiredEndpoints.size > 0) {
      const activeSubscriptions = subscriptions.filter(
        (sub: any) => !expiredEndpoints.has(sub.subscription.endpoint)
      );
      fs.writeFileSync(SUB_FILE, JSON.stringify(activeSubscriptions, null, 2), 'utf8');
    }

    return NextResponse.json({
      success: true,
      sentCount,
      expiredCount,
      totalTargets: targets.length,
    });
  } catch (error) {
    console.error('Failed to notify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
