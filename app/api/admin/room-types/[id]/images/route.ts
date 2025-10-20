import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - Get images for a room type
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomTypeId = parseInt(params.id);

    const result = await pool.query(
      `SELECT 
        image_url as url,
        caption,
        display_order as "displayOrder"
      FROM room_images
      WHERE room_type_id = $1
      ORDER BY display_order ASC`,
      [roomTypeId]
    );

    return NextResponse.json({ images: result.rows });
  } catch (error) {
    console.error('[ADMIN] Get room type images error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images', details: (error as Error).message },
      { status: 500 }
    );
  }
}
