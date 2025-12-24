import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectList } from '@/components/admin/ProjectList';
import { ProjectFilters } from '@/components/admin/ProjectFilters';
import { createClient } from '@/lib/supabase/server';
import type { Project, ProjectWithDocumentStatus, DocumentType } from '@/types/database';

interface PageProps {
  searchParams: Promise<{ status?: string; tag?: string; docStatus?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.tag) {
    query = query.contains('tags', [params.tag]);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error('Projects fetch error:', error);
  }

  const projectIds = (projects || []).map((p) => p.id);

  // 各プロジェクトのドキュメントタイプを取得
  const { data: documents } = await supabase
    .from('project_documents')
    .select('project_id, document_type')
    .in('project_id', projectIds.length > 0 ? projectIds : ['']);

  // プロジェクトごとに書類タイプの存在をマップ
  const documentStatusMap = new Map<string, Set<DocumentType>>();
  (documents || []).forEach((doc: { project_id: string; document_type: DocumentType }) => {
    if (!documentStatusMap.has(doc.project_id)) {
      documentStatusMap.set(doc.project_id, new Set());
    }
    documentStatusMap.get(doc.project_id)!.add(doc.document_type);
  });

  // プロジェクトにドキュメント状態を追加
  let projectList: ProjectWithDocumentStatus[] = (projects || []).map((project) => {
    const docTypes = documentStatusMap.get(project.id) || new Set();
    return {
      ...project,
      hasEstimate: docTypes.has('estimate'),
      hasInvoice: docTypes.has('invoice'),
      hasContract: docTypes.has('contract'),
    } as ProjectWithDocumentStatus;
  });

  // 書類状態でフィルタリング
  if (params.docStatus) {
    switch (params.docStatus) {
      case 'estimate':
        projectList = projectList.filter((p) => p.hasEstimate);
        break;
      case 'contract':
        projectList = projectList.filter((p) => p.hasContract);
        break;
      case 'invoice':
        projectList = projectList.filter((p) => p.hasInvoice);
        break;
      case 'no_estimate':
        projectList = projectList.filter((p) => !p.hasEstimate);
        break;
      case 'no_invoice':
        projectList = projectList.filter((p) => !p.hasInvoice);
        break;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">現場管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            施工現場の登録・管理を行います
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規現場を登録
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-10" />}>
        <ProjectFilters
          currentStatus={params.status}
          currentTag={params.tag}
          currentDocStatus={params.docStatus}
        />
      </Suspense>

      {/* Project list */}
      {projectList.length > 0 && <ProjectList projects={projectList} />}

      {/* Empty state */}
      {projectList.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            現場がありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            新しい現場を登録して管理を始めましょう
          </p>
          <div className="mt-6">
            <Link href="/admin/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規現場を登録
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
