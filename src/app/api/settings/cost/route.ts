import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// コスト設定を取得
export async function GET(): Promise<NextResponse> {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

    // システム設定を取得
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['labor_unit_price', 'target_profit_rate']);

    if (error) {
      console.error('Settings fetch error:', error);
      return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
    }

    const laborUnitPrice = parseInt(settings?.find(s => s.key === 'labor_unit_price')?.value || '25000');
    const targetProfitRate = parseInt(settings?.find(s => s.key === 'target_profit_rate')?.value || '20');

    return NextResponse.json({
      laborUnitPrice,
      targetProfitRate,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
  }
}

// コスト設定を更新
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

    const body = await request.json();
    const { laborUnitPrice, targetProfitRate } = body as {
      laborUnitPrice?: number;
      targetProfitRate?: number;
    };

    const updates: { key: string; value: string }[] = [];

    if (laborUnitPrice !== undefined) {
      if (laborUnitPrice < 1000 || laborUnitPrice > 100000) {
        return NextResponse.json({ error: '人工単価は1,000円〜100,000円の範囲で設定してください' }, { status: 400 });
      }
      updates.push({ key: 'labor_unit_price', value: laborUnitPrice.toString() });
    }

    if (targetProfitRate !== undefined) {
      if (targetProfitRate < 1 || targetProfitRate > 50) {
        return NextResponse.json({ error: '目標利益率は1%〜50%の範囲で設定してください' }, { status: 400 });
      }
      updates.push({ key: 'target_profit_rate', value: targetProfitRate.toString() });
    }

    // 各設定を更新
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({
          value: update.value,
          updated_at: new Date().toISOString(),
        })
        .eq('key', update.key);

      if (updateError) {
        console.error('Settings update error:', updateError);
        return NextResponse.json({ error: '設定の更新に失敗しました' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: '設定の更新に失敗しました' }, { status: 500 });
  }
}
