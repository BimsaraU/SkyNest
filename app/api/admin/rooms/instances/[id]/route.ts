import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyStaffOrAdmin } from '@/lib/adminAuth';

// GET /api/admin/rooms/instances/[id]
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const auth = await verifyStaffOrAdmin(request);
		if (!auth) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await context.params;
		const roomId = Number(id);
		if (!Number.isFinite(roomId)) {
			return NextResponse.json({ error: 'Invalid room id' }, { status: 400 });
		}

		const { rows } = await pool.query(
			`SELECT r.id, r.room_number, r.status, r.floor, r.notes,
							rt.id AS room_type_id, rt.name AS room_type_name, rt.slug,
							rt.base_price, rt.capacity, rt.size_sqft, b.id AS branch_id, b.name AS branch_name
			 FROM rooms r
			 JOIN room_types rt ON r.room_type_id = rt.id
			 JOIN branches b ON rt.branch_id = b.id
			 WHERE r.id = $1`,
			[roomId]
		);

		if (rows.length === 0) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		}

		return NextResponse.json({ room: rows[0] }, { status: 200 });
	} catch (error) {
		console.error('[ADMIN ROOMS INSTANCES GET]', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

