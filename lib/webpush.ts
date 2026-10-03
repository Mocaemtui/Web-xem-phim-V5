import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

const KEYS_DIR = path.join(process.cwd(), 'data');
const KEYS_FILE = path.join(KEYS_DIR, 'vapid_keys.json');

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export function getVapidKeys(): VapidKeys {
  // Try environment variables first
  const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;

  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate };
  }

  // Fallback to local file
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (fs.existsSync(KEYS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    } catch (e) {
      console.error('Failed to parse VAPID keys file:', e);
    }
  }

  // Generate new keys if not found
  console.log('Generating new VAPID keys...');
  const keys = webpush.generateVAPIDKeys();
  const vapidKeys: VapidKeys = {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };

  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(vapidKeys, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write VAPID keys file:', e);
  }

  return vapidKeys;
}

export function initWebPush() {
  const keys = getVapidKeys();
  webpush.setVapidDetails(
    'mailto:admin@mocaemtui.app',
    keys.publicKey,
    keys.privateKey
  );
  return keys;
}
export { webpush };
