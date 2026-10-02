/**
 * Project Activity API Route
 * GET - Fetch activity logs for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivityLogs, getProjectRecentActivity } from '@/lib/db/queries/activity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '50');
    const recent = searchParams.get('recent') === 'true';

    if (recent) {
      const { data, error } = await getProjectRecentActivity(id, pageSize);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data, hasMore: false });
    }

    const { data, count, error } = await getActivityLogs({
      project_id: id,
      page,
      page_size: pageSize,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      count,
      hasMore: count ? page * pageSize < count : false,
    });
  } catch (error) {
    console.error('GET /api/projects/[id]/activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}