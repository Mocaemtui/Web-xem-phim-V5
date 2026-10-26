import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/';
    
    // Purge the cache for the requested path (default is homepage '/')
    revalidatePath(path, 'layout');
    
    return NextResponse.json({ 
      revalidated: true, 
      path: path,
      message: `Cache for ${path} has been successfully purged!` 
    });
  } catch (err) {
    return NextResponse.json({ revalidated: false, message: 'Error purging cache' }, { status: 500 });
  }
}
