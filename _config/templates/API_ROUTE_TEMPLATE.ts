/**
 * APIルートテンプレート
 *
 * 使用方法:
 * 1. src/app/api/[エンドポイント名]/ にディレクトリを作成
 * 2. このファイルを route.ts としてコピー
 * 3. 必要なHTTPメソッドのみ残す
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: データ取得
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // 認証チェック（必要な場合）
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // データ取得
    const { data, error } = await supabase
      .from('table_name')
      .select('*');

    if (error) {
      console.error('Supabase error:', error.message);
      return NextResponse.json(
        { error: 'データの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: データ作成
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // リクエストボディの取得
    const body = await request.json();

    // バリデーション
    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    // データ作成
    const { data, error } = await supabase
      .from('table_name')
      .insert({ ...body, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error.message);
      return NextResponse.json(
        { error: 'データの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT: データ更新（必要に応じて追加）
// DELETE: データ削除（必要に応じて追加）
