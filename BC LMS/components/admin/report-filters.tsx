'use client';

// ReportFilters — date range + school/program filter bar (client component)
// Calls onChange when filters change; parent fetches filtered data

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ReportFilters } from '@/lib/types/report';

interface ReportFiltersProps {
  showSchoolFilter?: boolean;
  showProgramFilter?: boolean;
  onFilter: (filters: ReportFilters) => void;
}

export function ReportFiltersBar({
  showSchoolFilter = false,
  showProgramFilter = false,
  onFilter,
}: ReportFiltersProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [school, setSchool] = useState('');
  const [programId, setProgramId] = useState('');

  function handleApply() {
    const filters: ReportFilters = {};
    if (dateFrom && dateTo) {
      filters.dateRange = { from: dateFrom, to: dateTo };
    }
    if (showSchoolFilter && school.trim()) {
      filters.school = school.trim();
    }
    if (showProgramFilter && programId.trim()) {
      filters.programId = programId.trim();
    }
    onFilter(filters);
  }

  function handleReset() {
    setDateFrom('');
    setDateTo('');
    setSchool('');
    setProgramId('');
    onFilter({});
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600">Từ ngày</label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 text-sm w-36"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600">Đến ngày</label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-8 text-sm w-36"
        />
      </div>

      {showSchoolFilter && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600">Cơ sở</label>
          <Input
            type="text"
            placeholder="Tên cơ sở"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
      )}

      {showProgramFilter && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600">ID Chương trình</label>
          <Input
            type="text"
            placeholder="Program ID"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="h-8 text-sm w-48"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleApply} className="h-8">
          Lọc
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="h-8">
          Đặt lại
        </Button>
      </div>
    </div>
  );
}
