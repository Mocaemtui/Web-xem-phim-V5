import Pusher from 'pusher';

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
const secret = process.env.PUSHER_APP_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const pusherServer = (appId && key && secret && cluster)
  ? new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
  : null;

