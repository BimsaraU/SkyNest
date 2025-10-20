import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[ROOMS API] Received request');
    const searchParams = request.nextUrl.searchParams;
    
    // Query parameters
    const branchId = searchParams.get('branchId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const guests = searchParams.get('guests');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const amenities = searchParams.get('amenities'); // comma-separated IDs

    console.log('[ROOMS API] Parameters:', { branchId, checkIn, checkOut, guests, minPrice, maxPrice, amenities });

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (branchId) {
      conditions.push(`r.branch_id = $${paramIndex++}`);
      values.push(parseInt(branchId));
    }

    if (minPrice) {
      conditions.push(`rt.base_price >= $${paramIndex++}`);
      values.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      conditions.push(`rt.base_price <= $${paramIndex++}`);
      values.push(parseFloat(maxPrice));
    }

    if (guests) {
      conditions.push(`rt.capacity >= $${paramIndex++}`);
      values.push(parseInt(guests));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    console.log('[ROOMS API] Executing query with filters:', { branchId, minPrice, maxPrice, guests });

    // Query using the same pattern as admin - with proper joins
    const result = await pool.query(
      `SELECT DISTINCT ON (rt.id)
        rt.id,
        rt.name,
        rt.description,
        rt.base_price as "basePrice",
        rt.capacity as "maxOccupancy",
        rt.bed_type as "bedType",
        1 as "numberOfBeds",
        rt.size_sqm as "roomSize",
        'City' as "viewType",
        (rt.base_price > 50000) as "isFeatured",
        b.id as "branchId",
        b.name as "branchName",
        b.location as "branchLocation",
        (SELECT COUNT(*) FROM rooms r2 WHERE r2.room_type_id = rt.id AND r2.status = 'Available') as "availableCount",
        (
          SELECT json_agg(img_data ORDER BY img_data->>'displayOrder')
          FROM (
            SELECT json_build_object('id', ri.id, 'url', ri.image_url, 'caption', ri.caption, 'displayOrder', ri.display_order) as img_data
            FROM room_images ri
            WHERE ri.room_type_id = rt.id
          ) images_subquery
        ) as images,
        (
          SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'icon_name', a.icon_name))
          FROM room_amenities ra
          JOIN amenities a ON ra.amenity_id = a.id
          WHERE ra.room_type_id = rt.id
        ) as amenities
      FROM room_types rt
      LEFT JOIN rooms r ON rt.id = r.room_type_id
      LEFT JOIN branches b ON r.branch_id = b.id
      ${whereClause}
      ORDER BY rt.id, "isFeatured" DESC, rt.base_price ASC`,
      values
    );

    console.log('[ROOMS API] Query successful, fetched', result.rows.length, 'rooms');

    // Transform to match frontend expectations
    const rooms = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      basePrice: parseFloat(row.basePrice),
      maxOccupancy: row.maxOccupancy,
      bedType: row.bedType,
      numberOfBeds: row.numberOfBeds,
      roomSize: row.roomSize,
      viewType: row.viewType,
      isFeatured: row.isFeatured,
      branch: {
        id: row.branchId,
        name: row.branchName,
        location: row.branchLocation
      },
      images: row.images || [],
      amenities: row.amenities || [],
      availableCount: parseInt(row.availableCount)
    }));

    console.log('[ROOMS API] Returning', rooms.length, 'transformed rooms');
    
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('[ROOMS API] Error fetching rooms:', error);
    console.error('[ROOMS API] Error stack:', (error as Error).stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch rooms',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

