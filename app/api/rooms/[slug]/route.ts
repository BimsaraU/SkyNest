import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Convert slug to integer for room type ID
    const roomTypeId = parseInt(slug);
    
    if (isNaN(roomTypeId)) {
      return NextResponse.json(
        { error: 'Invalid room type ID' },
        { status: 400 }
      );
    }

    console.log('[ROOM DETAILS API] Fetching room type ID:', roomTypeId);

    const result = await pool.query(
      `SELECT 
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
        b.phone as "branchPhone",
        b.email as "branchEmail",
        (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id AND r.status = 'Available') as "availableRooms",
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
      WHERE rt.id = $1
      LIMIT 1`,
      [roomTypeId]
    );

    console.log('[ROOM DETAILS API] Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Room type not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    // Group amenities by category (all will be 'general' for now)
    const amenitiesByCategory: Record<string, any[]> = {
      'General': row.amenities || []
    };

    const response = {
      id: row.id,
      name: row.name,
      description: row.description,
      basePrice: parseFloat(row.basePrice),
      maxOccupancy: row.maxOccupancy,
      bedType: row.bedType,
      numberOfBeds: row.numberOfBeds,
      roomSize: parseFloat(row.roomSize),
      viewType: row.viewType,
      isFeatured: row.isFeatured,
      branch: {
        id: row.branchId,
        name: row.branchName,
        location: row.branchLocation,
        phone: row.branchPhone,
        email: row.branchEmail
      },
      images: row.images || [],
      amenities: row.amenities || [],
      amenitiesByCategory,
      availableRooms: parseInt(row.availableRooms)
    };

    console.log('[ROOM DETAILS API] Returning room details for:', row.name);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get room details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room details' },
      { status: 500 }
    );
  }
}
