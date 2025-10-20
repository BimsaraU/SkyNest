import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// POST - Create a review
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as number;

    const {
      bookingId,
      rating,
      comment
    } = await request.json();

    // Validation
    if (!bookingId || !rating) {
      return NextResponse.json(
        { error: 'Booking ID and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify user owns the booking and it's completed
    const bookingCheck = await pool.query(
      'SELECT user_id, status FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingCheck.rows[0];

    if (booking.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (booking.status !== 'CheckedOut') {
      return NextResponse.json(
        { error: 'Can only review completed stays' },
        { status: 400 }
      );
    }

    // Check if already reviewed
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [bookingId]
    );

    if (existingReview.rows.length > 0) {
      return NextResponse.json(
        { error: 'You have already reviewed this booking' },
        { status: 400 }
      );
    }

    // Create review
    const result = await pool.query(
      `INSERT INTO reviews (booking_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [bookingId, userId, rating, comment || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        id: result.rows[0].id
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

// GET - Get reviews
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const roomTypeId = searchParams.get('roomTypeId');
    const branchId = searchParams.get('branchId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = `
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.first_name || ' ' || u.last_name as user_name,
        b.booking_reference,
        rt.name as room_type,
        br.name as branch_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN bookings bk ON r.booking_id = bk.id
      JOIN rooms rm ON bk.room_id = rm.id
      JOIN room_types rt ON rm.room_type_id = rt.id
      JOIN branches br ON rt.branch_id = br.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (roomTypeId) {
      query += ` AND rt.id = $${paramIndex++}`;
      params.push(roomTypeId);
    }

    if (branchId) {
      query += ` AND br.id = $${paramIndex++}`;
      params.push(branchId);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Calculate average rating
    let avgQuery = 'SELECT AVG(rating)::numeric(3,2) as avg_rating FROM reviews';
    const avgParams: any[] = [];
    let avgParamIndex = 1;

    if (roomTypeId || branchId) {
      avgQuery += ' WHERE id IN (SELECT r.id FROM reviews r JOIN bookings bk ON r.booking_id = bk.id JOIN rooms rm ON bk.room_id = rm.id JOIN room_types rt ON rm.room_type_id = rt.id';
      
      const conditions: string[] = [];
      if (roomTypeId) {
        conditions.push(` rt.id = $${avgParamIndex++}`);
        avgParams.push(roomTypeId);
      }
      if (branchId) {
        conditions.push(` rt.branch_id = $${avgParamIndex++}`);
        avgParams.push(branchId);
      }
      if (conditions.length > 0) {
        avgQuery += ' WHERE' + conditions.join(' AND');
      }
      avgQuery += ')';
    }

    const avgResult = await pool.query(avgQuery, avgParams);

    return NextResponse.json({
      reviews: result.rows,
      averageRating: avgResult.rows[0]?.avg_rating || 0,
      totalReviews: result.rows.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
