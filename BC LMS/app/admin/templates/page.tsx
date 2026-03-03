// Admin template list page — shows all programs with template status and edit links
// Admin only

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { getAllProgramsForTemplates } from '@/lib/actions/template-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Pencil } from 'lucide-react';

export default async function AdminTemplatesPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'ADMIN') redirect('/dashboard');

  const result = await getAllProgramsForTemplates();

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            Quản lý Template Kế hoạch
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Thiết lập template mặc định cho từng chương trình
          </p>
        </div>

        {!result.success ? (
          <p className="text-red-600">{result.error}</p>
        ) : result.data.length === 0 ? (
          <p className="text-neutral-500">Chưa có chương trình nào.</p>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Chương trình</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Template</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {result.data.map((program) => (
                  <tr key={program.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">{program.name}</td>
                    <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{program.slug}</td>
                    <td className="px-4 py-3">
                      <Badge variant={program.hasTemplate ? 'default' : 'secondary'}>
                        {program.hasTemplate ? 'Đã thiết lập' : 'Chưa có'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/templates/${program.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                          {program.hasTemplate ? 'Chỉnh sửa' : 'Tạo template'}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
