import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyStaffOrAdmin } from '@/lib/adminAuth'

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyStaffOrAdmin(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get all room types (including inactive)
    const { rows: roomTypes } = await pool.query(`
      SELECT rt.id, rt.name, rt.slug, rt.description, rt.short_description,
             rt.base_price, rt.capacity AS max_occupancy, rt.bed_type,
             rt.number_of_beds, rt.room_size, rt.view_type, rt.is_featured,
             rt.popularity_score, rt.status, rt.branch_id,
             b.name AS branch_name, b.location AS branch_location,
             (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id) AS rooms_count
      FROM room_types rt
      JOIN branches b ON b.id = rt.branch_id
      ORDER BY rt.created_at DESC
    `)

    console.log('📊 Fetched room types:', roomTypes.length)

    // Transform data and convert Decimal to number
    const transformedRoomTypes = roomTypes.map((roomType: any) => {
      console.log(`🏨 Room: ${roomType.name}, Images: ${roomType.images?.length || 0}`)
      
      return {
        id: roomType.id,
        name: roomType.name,
        slug: roomType.slug,
        description: roomType.description,
        shortDescription: roomType.short_description,
        basePrice: roomType.base_price != null ? Number(roomType.base_price) : null,
        maxOccupancy: roomType.max_occupancy,
        bedType: roomType.bed_type,
        numberOfBeds: roomType.number_of_beds,
        roomSize: roomType.room_size,
        viewType: roomType.view_type,
        isFeatured: roomType.is_featured,
        popularityScore: roomType.popularity_score,
        status: roomType.status,
        branch: { id: roomType.branch_id, name: roomType.branch_name, location: roomType.branch_location },
        images: [],
        amenities: [],
        availableRooms: Number(roomType.rooms_count || 0),
        createdAt: roomType.created_at,
        updatedAt: roomType.updated_at,
      }
    })

    return NextResponse.json(
      {
        success: true,
        count: transformedRoomTypes.length,
        data: transformedRoomTypes,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error fetching room types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room types' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyStaffOrAdmin(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      name,
      description,
      shortDescription,
      basePrice,
      maxOccupancy,
      bedType,
      numberOfBeds,
      roomSize,
      viewType,
      branchId,
      amenityIds,
      images,
      isFeatured,
    } = body

    // Validation
    if (!name || !description || !basePrice || !maxOccupancy || !bedType || !branchId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = generateSlug(name)

    // Check if slug already exists
    const exists = await pool.query(`SELECT 1 FROM room_types WHERE slug = $1 LIMIT 1`, [slug])

    if (exists.rowCount && exists.rowCount > 0) {
      return NextResponse.json(
        { error: 'A room type with this name already exists' },
        { status: 400 }
      )
    }

    console.log('🆕 Creating room type:', name)
    console.log('📸 Images to save:', images?.length || 0)

    // Create room type
    const created = await pool.query(
      `INSERT INTO room_types (
        name, slug, description, short_description, base_price, capacity, bed_type,
        number_of_beds, room_size, view_type, branch_id, is_featured, popularity_score, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, 0, 'active'
      ) RETURNING *`,
      [
        name,
        slug,
        description,
        shortDescription,
        parseFloat(basePrice),
        parseInt(maxOccupancy),
        bedType,
        parseInt(numberOfBeds) || 1,
        parseInt(roomSize),
        viewType,
        branchId,
        isFeatured || false,
      ]
    )

    const roomType = created.rows[0]

    console.log('✅ Room type created with', roomType.images?.length || 0, 'images')

    return NextResponse.json(
      { success: true, message: 'Room type created successfully', data: roomType },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error creating room type:', error)
    return NextResponse.json(
      { error: 'Failed to create room type' },
      { status: 500 }
    )
  }
}