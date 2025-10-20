import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - Get images for a room instance
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

    const roomId = parseInt(params.id);

    const result = await pool.query(
      `SELECT 
        id,
        image_url as "imageUrl",
        caption,
        display_order as "displayOrder"
      FROM room_instance_images
      WHERE room_id = $1
      ORDER BY display_order ASC`,
      [roomId]
    );

    return NextResponse.json({ images: result.rows });
  } catch (error) {
    console.error('[ADMIN] Get room instance images error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Save/Update images for a room instance
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomId = parseInt(params.id);
    const { images } = await request.json();

    if (!Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Images must be an array' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomic updates
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete existing images for this room
      await client.query(
        'DELETE FROM room_instance_images WHERE room_id = $1',
        [roomId]
      );

      // Insert new images
      for (const image of images) {
        if (image.imageUrl && image.imageUrl.trim()) {
          await client.query(
            `INSERT INTO room_instance_images (room_id, image_url, caption, display_order)
             VALUES ($1, $2, $3, $4)`,
            [roomId, image.imageUrl, image.caption || null, image.displayOrder || 0]
          );
        }
      }

      await client.query('COMMIT');
      
      return NextResponse.json({ 
        success: true,
        message: 'Room images updated successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ADMIN] Save room instance images error:', error);
    return NextResponse.json(
      { error: 'Failed to save images', details: (error as Error).message },
      { status: 500 }
    );
  }
}
