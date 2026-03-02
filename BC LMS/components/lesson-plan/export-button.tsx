'use client';

// ExportButton — triggers window.print() for PDF export of lesson plan
// Visible only to TEACHER role (not TEACHING_ASSISTANT)

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  planTitle: string;
}

export function ExportButton({ planTitle }: ExportButtonProps) {
  function handlePrint() {
    // Set document title before print for filename suggestion
    const originalTitle = document.title;
    document.title = planTitle;
    window.print();
    document.title = originalTitle;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className="gap-1.5 no-print"
      title="In / Xuất PDF"
    >
      <Printer className="h-4 w-4" />
      Xuất PDF
    </Button>
  );
}
