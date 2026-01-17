import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Order, OrderItem } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 発注一覧を取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 発注一覧を取得（発注先情報と明細を含む）
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:order_items(*)
      `)
      .eq('project_id', projectId)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Orders fetch error:', error);
      return NextResponse.json({ error: '発注の取得に失敗しました' }, { status: 500 });
    }

    // 予算情報も取得（残り予算計算用）
    const { data: budget } = await supabase
      .from('project_budgets')
      .select('material_budget')
      .eq('project_id', projectId)
      .single();

    // 発注済み合計を計算
    const orderedTotal = orders
      ?.filter(o => o.status !== 'draft')
      ?.reduce((sum, o) => sum + o.total_amount + (o.tax_amount || 0), 0) || 0;

    const remainingBudget = budget ? budget.material_budget - orderedTotal : null;

    return NextResponse.json({
      orders,
      materialBudget: budget?.material_budget || null,
      orderedTotal,
      remainingBudget,
    });
  } catch (error) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: '発注の取得に失敗しました' }, { status: 500 });
  }
}

// 発注を作成
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 権限確認（admin/staffのみ）
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'staff'].includes(currentUser.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const {
      supplier_id,
      order_date,
      delivery_date,
      status,
      notes,
      items,
    } = body as Partial<Order> & { items?: Partial<OrderItem>[] };

    if (!supplier_id || !order_date) {
      return NextResponse.json({ error: '発注先と発注日は必須です' }, { status: 400 });
    }

    // 合計金額を計算
    const total_amount = items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const tax_amount = Math.floor(total_amount * 0.1); // 消費税10%

    // 発注を作成
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        project_id: projectId,
        supplier_id,
        order_date,
        delivery_date,
        status: status || 'ordered',
        total_amount,
        tax_amount,
        notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order create error:', orderError);
      return NextResponse.json({ error: '発注の作成に失敗しました' }, { status: 500 });
    }

    // 明細を作成
    if (items && items.length > 0) {
      const orderItems = items.map((item, index) => ({
        order_id: order.id,
        item_name: item.item_name || '',
        specification: item.specification,
        quantity: item.quantity || 1,
        unit: item.unit,
        unit_price: item.unit_price || 0,
        amount: item.amount || 0,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items create error:', itemsError);
        // 発注自体は作成済みなのでエラーは警告のみ
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Orders POST error:', error);
    return NextResponse.json({ error: '発注の作成に失敗しました' }, { status: 500 });
  }
}
