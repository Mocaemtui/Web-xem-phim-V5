import { pusherServer } from '@/lib/pusher';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    if (!pusherServer) {
      console.error('Pusher is not configured. Missing environment variables.');
      return NextResponse.json({ error: 'Pusher is not configured on the server' }, { status: 500 });
    }

    const data = await req.formData();
    const socketId = data.get('socket_id') as string;
    const channelName = data.get('channel_name') as string;
    
    // We expect the client to pass user info in the auth params
    // Next.js NextRequest formData can read urlencoded data sent by pusher-js
    const username = data.get('username') as string || 'Guest';
    const userId = data.get('user_id') as string || Math.random().toString(36).substring(7);
    const isHost = data.get('is_host') === 'true';

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    const presenceData = {
      user_id: userId,
      user_info: {
        name: username,
        isHost: isHost,
      },
    };

    const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Failed to authenticate pusher' }, { status: 500 });
  }
}
