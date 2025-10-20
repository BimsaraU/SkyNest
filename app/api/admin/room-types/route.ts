import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - List all room types
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status

    let query = `
      SELECT 
        rt.*,
        ARRAY_AGG(DISTINCT ra.amenity_id) FILTER (WHERE ra.amenity_id IS NOT NULL) as amenity_ids
      FROM room_types rt
      LEFT JOIN room_amenities ra ON rt.id = ra.room_type_id
    `;

    const params: any[] = [];
    if (status) {
      query += ` WHERE rt.status = $1`;
      params.push(status);
    }

    query += ` GROUP BY rt.id ORDER BY rt.created_at DESC`;

    const result = await pool.query(query, params);

    // Transform amenity_ids to amenities for consistency
    const roomTypes = result.rows.map(row => ({
      ...row,
      amenities: row.amenity_ids || []
    }));

    return NextResponse.json({ roomTypes });
  } catch (error) {
    console.error('[ADMIN] Get room types error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room types', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Create a new room type
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      base_price,
      capacity,
      bed_type,
      size_sqm,
      status = 'active',
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

      // Insert room type
      const insertQuery = `
        INSERT INTO room_types (
          name, description, base_price, capacity, bed_type, size_sqm, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        name,
        description,
        parseFloat(base_price),
        parseInt(capacity),
        bed_type,
        size_sqm ? parseFloat(size_sqm) : null,
        status
      ]);

      const roomType = result.rows[0];

      // Insert amenities associations if provided
      if (amenities && amenities.length > 0) {
        const amenityValues = amenities.map((amenityId: number, idx: number) => 
          `($1, $${idx + 2})`
        ).join(', ');

        await client.query(
          `INSERT INTO room_amenities (room_type_id, amenity_id) VALUES ${amenityValues}`,
          [roomType.id, ...amenities]
        );
      }

      // Insert images if provided
      if (images && images.length > 0) {
        for (const image of images) {
          if (image.url && image.url.trim()) {
            await client.query(
              `INSERT INTO room_images (room_type_id, image_url, caption, display_order)
               VALUES ($1, $2, $3, $4)`,
              [roomType.id, image.url, image.caption || null, image.displayOrder || 0]
            );
          }
        }
      }

      await client.query('COMMIT');

      console.log(`[ADMIN] Room type created: ${roomType.name} by admin ${admin.email}`);

      return NextResponse.json({
        message: 'Room type created successfully',
        roomType
      }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ADMIN] Create room type error:', error);
    return NextResponse.json(
      { error: 'Failed to create room type', details: (error as Error).message },
      { status: 500 }
    );
  }
}
