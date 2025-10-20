import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - Get images for a branch
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

    const branchId = parseInt(params.id);

    const result = await pool.query(
      `SELECT 
        id,
        image_url as "imageUrl",
        caption,
        display_order as "displayOrder"
      FROM branch_images
      WHERE branch_id = $1
      ORDER BY display_order ASC`,
      [branchId]
    );

    return NextResponse.json({ images: result.rows });
  } catch (error) {
    console.error('[ADMIN] Get branch images error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Add images to a branch
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

    const branchId = parseInt(params.id);
    const { images } = await request.json();

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Images array is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing images
      await client.query('DELETE FROM branch_images WHERE branch_id = $1', [branchId]);

      // Insert new images
      for (const image of images) {
        if (image.imageUrl && image.imageUrl.trim()) {
          await client.query(
            `INSERT INTO branch_images (branch_id, image_url, caption, display_order)
             VALUES ($1, $2, $3, $4)`,
            [branchId, image.imageUrl, image.caption || null, image.displayOrder || 0]
          );
        }
      }

      await client.query('COMMIT');

      console.log(`[ADMIN] Branch images updated for branch ${branchId} by admin ${admin.email}`);

      return NextResponse.json({
        success: true,
        message: 'Images updated successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ADMIN] Update branch images error:', error);
    return NextResponse.json(
      { error: 'Failed to update images', details: (error as Error).message },
      { status: 500 }
    );
  }
}
