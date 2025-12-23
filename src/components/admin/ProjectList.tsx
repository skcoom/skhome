'use client';

import Link from 'next/link';
import { FolderKanban, MapPin, Calendar } from 'lucide-react';
import { StatusChanger } from './StatusChanger';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import type { ProjectWithDocumentStatus, ProjectStatus } from '@/types/database';

interface ProjectListProps {
  projects: ProjectWithDocumentStatus[];
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <div
          key={project.id}
          className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <Link
              href={`/projects/${project.id}`}
              className="flex items-start space-x-4 flex-1"
            >
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
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      {project.address}
                    </span>
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
            </Link>
            <div className="flex items-center gap-2 flex-wrap justify-end">
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
