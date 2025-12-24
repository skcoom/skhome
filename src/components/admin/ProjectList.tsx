'use client';

import { useRouter } from 'next/navigation';
import { FolderKanban, MapPin, Calendar } from 'lucide-react';
import { StatusChanger } from './StatusChanger';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import type { ProjectWithDocumentStatus, ProjectStatus } from '@/types/database';

interface ProjectListProps {
  projects: ProjectWithDocumentStatus[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();

  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <div
          key={project.id}
          className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push(`/admin/projects/${project.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <FolderKanban className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {project.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {project.client_name && `${project.client_name} 様`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  {project.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <MapPin className="mr-1 h-4 w-4" />
                      {project.address}
                    </a>
                  )}
                  {project.start_date && (
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {project.start_date}
                      {project.end_date && ` 〜 ${project.end_date}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-2 flex-wrap justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {project.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                >
                  {tag}
                </span>
              ))}
              <StatusChanger
                projectId={project.id}
                currentStatus={project.status as ProjectStatus}
              />
              {project.hasEstimate && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_TYPE_LABELS.estimate.color}`}>
                  {DOCUMENT_TYPE_LABELS.estimate.badge}
                </span>
              )}
              {project.hasContract && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_TYPE_LABELS.contract.color}`}>
                  {DOCUMENT_TYPE_LABELS.contract.badge}
                </span>
              )}
              {project.hasInvoice && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_TYPE_LABELS.invoice.color}`}>
                  {DOCUMENT_TYPE_LABELS.invoice.badge}
                </span>
              )}
              {project.is_public && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                  公開中
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
