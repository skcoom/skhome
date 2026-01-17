import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Order, OrderItem } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string; orderId: string }>;
}

// 発注を更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { orderId } = await params;
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

    // 合計金額を計算
    const total_amount = items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const tax_amount = Math.floor(total_amount * 0.1);

    // 発注を更新
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        supplier_id,
        order_date,
        delivery_date,
        status,
        total_amount,
        tax_amount,
        notes,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) {
      console.error('Order update error:', orderError);
      return NextResponse.json({ error: '発注の更新に失敗しました' }, { status: 500 });
    }

    // 既存の明細を削除して再作成
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (items && items.length > 0) {
      const orderItems = items.map((item, index) => ({
        order_id: orderId,
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
      }
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Orders PUT error:', error);
    return NextResponse.json({ error: '発注の更新に失敗しました' }, { status: 500 });
  }
}

// 発注を削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { orderId } = await params;
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

    // 発注を削除（CASCADE で明細も削除される）
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Order delete error:', error);
      return NextResponse.json({ error: '発注の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Orders DELETE error:', error);
    return NextResponse.json({ error: '発注の削除に失敗しました' }, { status: 500 });
  }
}
