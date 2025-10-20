import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - Get single room type
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
        rt.*,
        ARRAY_AGG(DISTINCT ra.amenity_id) FILTER (WHERE ra.amenity_id IS NOT NULL) as amenities
      FROM room_types rt
      LEFT JOIN room_amenities ra ON rt.id = ra.room_type_id
      WHERE rt.id = $1
      GROUP BY rt.id`,
      [roomTypeId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
    }

    return NextResponse.json({ roomType: result.rows[0] });
  } catch (error) {
    console.error('[ADMIN] Get room type error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room type', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - Update room type
export async function PUT(
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
    const body = await request.json();
    const {
      name,
      description,
      base_price,
      capacity,
      bed_type,
      size_sqm,
      status,
      amenities = [],
      images = []
    } = body;

    // Validation
    if (!name || !base_price || !capacity) {
      return NextResponse.json(
        { error: 'Name, base price, and capacity are required' },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update room type
      const updateQuery = `
        UPDATE room_types
        SET 
          name = $1,
          description = $2,
          base_price = $3,
          capacity = $4,
          bed_type = $5,
          size_sqm = $6,
          status = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        name,
        description,
        parseFloat(base_price),
        parseInt(capacity),
        bed_type,
        size_sqm ? parseFloat(size_sqm) : null,
        status,
        roomTypeId
      ]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
      }

      // Delete existing amenities
      await client.query(
        'DELETE FROM room_amenities WHERE room_type_id = $1',
        [roomTypeId]
      );

      // Insert new amenities
      if (amenities && amenities.length > 0) {
        const amenityValues = amenities.map((amenityId: number, idx: number) => 
          `($1, $${idx + 2})`
        ).join(', ');

        await client.query(
          `INSERT INTO room_amenities (room_type_id, amenity_id) VALUES ${amenityValues}`,
          [roomTypeId, ...amenities]
        );
      }

      // Update images - delete existing and insert new ones
      await client.query(
        'DELETE FROM room_images WHERE room_type_id = $1',
        [roomTypeId]
      );

      if (images && images.length > 0) {
        for (const image of images) {
          if (image.url && image.url.trim()) {
            await client.query(
              `INSERT INTO room_images (room_type_id, image_url, caption, display_order)
               VALUES ($1, $2, $3, $4)`,
              [roomTypeId, image.url, image.caption || null, image.displayOrder || 0]
            );
          }
        }
      }

      await client.query('COMMIT');

      console.log(`[ADMIN] Room type updated: ${result.rows[0].name} by admin ${admin.email}`);

      return NextResponse.json({
        message: 'Room type updated successfully',
        roomType: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ADMIN] Update room type error:', error);
    return NextResponse.json(
      { error: 'Failed to update room type', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Delete room type
export async function DELETE(
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

    // Check if room type is in use
    const roomsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM rooms WHERE room_type_id = $1',
      [roomTypeId]
    );

    if (parseInt(roomsCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete room type that is currently assigned to rooms' },
        { status: 400 }
      );
    }

    // Delete room type (cascades to room_amenities)
    const result = await pool.query(
      'DELETE FROM room_types WHERE id = $1 RETURNING name',
      [roomTypeId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
    }

    console.log(`[ADMIN] Room type deleted: ${result.rows[0].name} by admin ${admin.email}`);

    return NextResponse.json({
      message: 'Room type deleted successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Delete room type error:', error);
    return NextResponse.json(
      { error: 'Failed to delete room type', details: (error as Error).message },
      { status: 500 }
    );
  }
}
