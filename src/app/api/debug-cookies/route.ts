import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll().map((c: any) => ({ name: c.name, value: c.value }));
    console.log('[api/debug-cookies] request cookies:', all.map((c: any) => `${c.name}=${String(c.value).slice(0,40)}${String(c.value).length>40? '...':''}`).join('; '));
    return NextResponse.json({ cookies: all });
  } catch (e: any) {
    console.error('[api/debug-cookies] error', e);
    return new NextResponse(e?.message ?? 'error', { status: 500 });
  }
}
