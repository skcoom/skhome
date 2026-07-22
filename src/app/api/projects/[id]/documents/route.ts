import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, requireStaff } from '@/lib/auth';
import { randomUUID } from 'crypto';

type Params = Promise<{ id: string }>;

// ドキュメント一覧取得
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Documents fetch error:', error);
      return NextResponse.json({ error: 'ドキュメントの取得に失敗しました' }, { status: 500 });
    }

    const documents = await Promise.all(
      (data || []).map(async (document) => {
        if (!document.storage_path) {
          // 旧形式の書類は移行が完了するまで、画面から直接開かせない。
          return { ...document, file_url: null, migration_required: true };
        }

        const bucket = document.storage_bucket || 'project-documents';
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(document.storage_path, 15 * 60);

        if (signedError) {
          console.error('Document signed URL error:', signedError);
          return { ...document, file_url: null, preview_unavailable: true };
        }

        return { ...document, file_url: signedData.signedUrl };
      }),
    );

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ドキュメントをアップロード
export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('media:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = (formData.get('document_type') as string) || 'other';

    if (!file) {
      return NextResponse.json({ error: 'ファイルは必須です' }, { status: 400 });
    }

    // 書類タイプのバリデーション
    const validTypes = ['estimate', 'invoice', 'contract', 'other'];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json({ error: '無効な書類タイプです' }, { status: 400 });
    }

    // PDFのみ許可
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDFファイルのみアップロード可能です' }, { status: 400 });
    }

    // ファイルサイズ制限（20MB）
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ファイルサイズは20MB以下にしてください' }, { status: 400 });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const pdfSignature = new TextDecoder().decode(fileBytes.slice(0, 5));
    if (pdfSignature !== '%PDF-') {
      return NextResponse.json({ error: 'PDFファイルの内容を確認できませんでした' }, { status: 415 });
    }

    // ファイルをStorageにアップロード
    const filePath = `${id}/${randomUUID()}.pdf`;
    const storageBucket = 'project-documents';

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, fileBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Document upload error:', uploadError);
      return NextResponse.json({ error: 'ファイルのアップロードに失敗しました' }, { status: 500 });
    }

    // DBにレコードを挿入
    const { data, error } = await supabase
      .from('project_documents')
      .insert({
        project_id: id,
        document_type: documentType,
        file_url: filePath,
        storage_bucket: storageBucket,
        storage_path: filePath,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Document insert error:', error);
      // アップロードしたファイルを削除
      await supabase.storage.from(storageBucket).remove([filePath]);
      return NextResponse.json({ error: 'ドキュメントの登録に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Document POST error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ドキュメントの書類タイプを更新
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('media:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { docId, document_type } = body;

    if (!docId) {
      return NextResponse.json({ error: 'docIdは必須です' }, { status: 400 });
    }

    // 書類タイプのバリデーション
    const validTypes = ['estimate', 'invoice', 'contract', 'other'];
    if (!document_type || !validTypes.includes(document_type)) {
      return NextResponse.json({ error: '無効な書類タイプです' }, { status: 400 });
    }

    // ドキュメントを更新
    const { data, error } = await supabase
      .from('project_documents')
      .update({ document_type })
      .eq('id', docId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) {
      console.error('Document update error:', error);
      return NextResponse.json({ error: 'ドキュメントの更新に失敗しました' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'ドキュメントが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Document PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ドキュメントを削除
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('media:delete');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'docIdは必須です' }, { status: 400 });
    }

    // ドキュメント情報を取得
    const { data: docData, error: fetchError } = await supabase
      .from('project_documents')
      .select('*')
      .eq('id', docId)
      .eq('project_id', id)
      .single();

    if (fetchError || !docData) {
      return NextResponse.json({ error: 'ドキュメントが見つかりません' }, { status: 404 });
    }

    // ストレージからファイルを削除
    if (docData.storage_path) {
      const bucket = docData.storage_bucket || 'project-documents';
      await supabase.storage.from(bucket).remove([docData.storage_path]);
    } else if (docData.file_url) {
      const fileUrl = docData.file_url;
      const pathMatch = fileUrl.match(/project-media\/(.+)$/);
      if (pathMatch) {
        const filePath = pathMatch[1];
        await supabase.storage.from('project-media').remove([filePath]);
      }
    }

    // DBからレコードを削除
    const { error: deleteError } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', docId)
      .eq('project_id', id);

    if (deleteError) {
      console.error('Document delete error:', deleteError);
      return NextResponse.json({ error: 'ドキュメントの削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'ドキュメントを削除しました' });
  } catch (error) {
    console.error('Document DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
