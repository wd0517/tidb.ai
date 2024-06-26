'use client';

import { AdminPageHeading } from '@/components/admin-page-heading';
import { DocumentIndexStatusFilter } from '@/components/data-filters/document-index-status-filter';
import { SearchFilter } from '@/components/data-filters/search-filter';
import { DataTableHeading } from '@/components/data-table-heading';
import { DataTableRemote } from '@/components/data-table-remote';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Document } from '@/core/repositories/document';
import type { CellContext, ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/table-core';
import { format } from 'date-fns';
import { GithubIcon } from 'lucide-react';

const helper = createColumnHelper<Document>();

const mono = (cell: CellContext<any, any>) => <span className="font-mono">{cell.getValue()}</span>;

const sourceUri = (cell: CellContext<any, any>) => {
  const value = cell.getValue();
  const REGEXP = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/blob\/([^/]+))?/;

  const matched = REGEXP.exec(value);
  if (matched) {
    const [, owner, repo, branch] = matched;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a href={value} target="_blank" className="flex items-center">
            <GithubIcon size="1em" className="mr-1" />
            <span>{owner}</span>
            /
            <span>{repo}</span>
            {branch && <>/<span>{branch}</span></>}
          </a>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          {value}
        </TooltipContent>
      </Tooltip>
    );
  }
  return <a href={value} target="_blank">{value}</a>;
};

const datetime = (cell: CellContext<any, any>) => <time>{format(cell.getValue(), 'yyyy-MM-dd HH:mm')}</time>;

const columns = [
  helper.accessor('id', { cell: mono }),
  helper.accessor('name', { cell: mono }),
  helper.accessor('mime', { cell: mono }),
  helper.accessor('source_uri', { cell: sourceUri }),
  helper.accessor('hash', { cell: mono }),
  helper.accessor('created_at', { cell: datetime }),
  helper.accessor('last_modified_at', { cell: datetime }),
] as ColumnDef<Document>[];

export default function Page () {
  return (
    <>
      <AdminPageHeading title="Explore all documents" />
      <DataTableRemote
        before={(
          <DataTableHeading>
            <SearchFilter />
            <DocumentIndexStatusFilter />
          </DataTableHeading>
        )}
        columns={columns}
        api="/api/v1/documents"
        idColumn="id"
      />
    </>
  );
}
