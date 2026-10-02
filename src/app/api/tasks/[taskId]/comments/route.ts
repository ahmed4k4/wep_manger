/**
 * Task Comments API Route
 * GET - Fetch comments for a task
 * POST - Create a new comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getTaskComments, createTaskComment } from '@/lib/db/queries/tasks';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await getTaskComments(taskId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/tasks/[taskId]/comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, parent_id } = body;

    if (typeof content !== 'string' || !content.trim() || content.length > 20000) {
      return NextResponse.json({ error: 'Content must be between 1 and 20000 characters' }, { status: 400 });
    }
    if (parent_id !== undefined && parent_id !== null && typeof parent_id !== 'string') {
      return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 });
    }
    if (parent_id) {
      const { data: parent } = await supabase.from('task_comments').select('id').eq('id', parent_id).eq('task_id', taskId).maybeSingle();
      if (!parent) return NextResponse.json({ error: 'Parent comment not found in this task' }, { status: 404 });
    }

    const { data, error } = await createTaskComment({
      task_id: taskId,
      content: content.trim(),
      parent_id: parent_id || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks/[taskId]/comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
