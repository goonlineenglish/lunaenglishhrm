'use client';

// DashboardSearchBar — search input and program/status filter controls
// Manages URL search params via router.push (server-side re-fetch on change)

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Program {
  id: string;
  name: string;
}

interface DashboardSearchBarProps {
  programs: Program[];
}

export function DashboardSearchBar({ programs }: DashboardSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSearch = searchParams.get('search') ?? '';
  const currentProgram = searchParams.get('program') ?? 'all';

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/dashboard${params.toString() ? `?${params.toString()}` : ''}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          defaultValue={currentSearch}
          placeholder="Tìm kiếm khóa học..."
          className="pl-9"
          onChange={(e) => updateParam('search', e.target.value)}
        />
      </div>

      {/* Program filter */}
      {programs.length > 1 && (
        <Select
          defaultValue={currentProgram}
          onValueChange={(v) => updateParam('program', v)}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Tất cả chương trình" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chương trình</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
