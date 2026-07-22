import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type Params = Promise<{ id: string }>;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeAdmin() {
  const result = await requireAdmin();
  if (result.error || !result.user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: result.error || '認証が必要です' },
        { status: result.error?.includes('権限') ? 403 : 401 },
      ),
    };
  }
  return { user: result.user, response: null };
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const auth = await authorizeAdmin();
  if (!auth.user) return auth.response;

  const admin = createAdminClient();
  const [{ data: partners, error: partnersError }, { data: memberships, error: membershipsError }] = await Promise.all([
    admin
      .from('users')
      .select('id, name, email, company_name')
      .eq('role', 'partner')
      .order('name'),
    admin
      .from('project_members')
      .select('user_id')
      .eq('project_id', id),
  ]);

  if (partnersError || membershipsError) {
    return NextResponse.json({ error: '担当者情報を取得できませんでした' }, { status: 500 });
  }

  const assignedIds = new Set((memberships || []).map((membership) => membership.user_id));
  return NextResponse.json({
    partners: (partners || []).map((partner) => ({
      ...partner,
      assigned: assignedIds.has(partner.id),
    })),
  });
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const auth = await authorizeAdmin();
  if (!auth.user) return auth.response;

  const body = await request.json();
  const userIds = Array.isArray(body.userIds)
    ? [...new Set(body.userIds.filter((userId: unknown): userId is string => typeof userId === 'string' && UUID_PATTERN.test(userId)))]
    : null;
  if (!userIds || userIds.length > 100 || userIds.length !== body.userIds.length) {
    return NextResponse.json({ error: '担当者の指定が正しくありません' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin.rpc('admin_set_project_members', {
    p_project_id: id,
    p_created_by: auth.user.id,
    p_user_ids: userIds,
  });
  if (updateError) {
    const isValidationError = /project was not found|only partner accounts/.test(updateError.message);
    return NextResponse.json(
      { error: isValidationError ? '現場または担当者の指定が正しくありません' : '担当者設定を保存できませんでした' },
      { status: isValidationError ? 400 : 500 },
    );
  }

  return NextResponse.json({ success: true, assignedUserIds: userIds });
}
