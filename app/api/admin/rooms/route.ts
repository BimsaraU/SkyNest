import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const decoded = verifyToken(token)
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'STAFF')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get all room types (including inactive)
    const roomTypes = await prisma.roomType.findMany({
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        images: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('📊 Fetched room types:', roomTypes.length)

    // Transform data and convert Decimal to number
    const transformedRoomTypes = roomTypes.map((roomType) => {
      console.log(`🏨 Room: ${roomType.name}, Images: ${roomType.images?.length || 0}`)
      
      return {
        id: roomType.id,
        name: roomType.name,
        slug: roomType.slug,
        description: roomType.description,
        shortDescription: roomType.shortDescription,
        basePrice: parseFloat(roomType.basePrice.toString()),
        maxOccupancy: roomType.maxOccupancy,
        bedType: roomType.bedType,
        numberOfBeds: roomType.numberOfBeds,
        roomSize: roomType.roomSize,
        viewType: roomType.viewType,
        isFeatured: roomType.isFeatured,
        popularityScore: roomType.popularityScore,
        status: roomType.status,
        branch: roomType.branch,
        images: roomType.images || [],
        amenities: roomType.amenities.map((ra) => ra.amenity),
        availableRooms: roomType._count.rooms,
        createdAt: roomType.createdAt,
        updatedAt: roomType.updatedAt,
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

    const decoded = verifyToken(token)
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'STAFF')) {
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
    const existingRoomType = await prisma.roomType.findUnique({
      where: { slug },
    })

    if (existingRoomType) {
      return NextResponse.json(
        { error: 'A room type with this name already exists' },
        { status: 400 }
      )
    }

    console.log('🆕 Creating room type:', name)
    console.log('📸 Images to save:', images?.length || 0)

    // Create room type with amenities and images
    const roomType = await prisma.roomType.create({
      data: {
        name,
        slug,
        description,
        shortDescription,
        basePrice: parseFloat(basePrice),
        maxOccupancy: parseInt(maxOccupancy),
        bedType,
        numberOfBeds: parseInt(numberOfBeds) || 1,
        roomSize: parseInt(roomSize),
        viewType,
        branchId,
        isFeatured: isFeatured || false,
        status: 'active',
        amenities: amenityIds && amenityIds.length > 0
          ? {
              createMany: {
                data: amenityIds.map((amenityId: string) => ({
                  amenityId,
                })),
              },
            }
          : undefined,
        images: images && images.length > 0
          ? {
              createMany: {
                data: images.map((image: any, index: number) => ({
                  url: image.url,
                  caption: image.caption || null,
                  altText: image.altText || null,
                  isPrimary: index === 0,
                  order: index + 1,
                })),
              },
            }
          : undefined,
      },
      include: {
        branch: true,
        amenities: {
          include: {
            amenity: true,
          },
        },
        images: true,
      },
    })

    console.log('✅ Room type created with', roomType.images?.length || 0, 'images')

    return NextResponse.json(
      {
        success: true,
        message: 'Room type created successfully',
        data: roomType,
      },
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