import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'file';

    if (!request.body) {
      return NextResponse.json({ error: 'No file body found' }, { status: 400 });
    }

    const blob = await put(filename, request.body, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error("Vercel Blob Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
