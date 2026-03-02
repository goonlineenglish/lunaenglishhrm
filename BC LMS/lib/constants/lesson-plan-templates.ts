// Default lesson plan templates as Tiptap JSON strings
// Buttercup template: 8-column table for material planning
// Primary Success template: 7-column table for 90-min session planning

/** Buttercup program default template
 * Columns: No | Loại tài liệu | Tên tài liệu | Thẻ từ vựng | Dụng cụ thêm | Thời gian | Mục tiêu | Ghi chú giảng dạy
 */
export const BUTTERCUP_DEFAULT_TEMPLATE: string = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'No' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Loại tài liệu' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tên tài liệu' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thẻ từ vựng' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dụng cụ thêm' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thời gian dự kiến' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục tiêu' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ghi chú giảng dạy' }] }] },
          ],
        },
        ...Array.from({ length: 3 }, (_, i) => ({
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(i + 1) }] }] },
            ...Array.from({ length: 7 }, () => ({
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [] }],
            })),
          ],
        })),
      ],
    },
  ],
});

/** Primary Success / Primary Secondary default template
 * Columns: No | Hoạt động | Chi tiết | Dụng cụ | Thời gian | Mục tiêu | Ghi chú
 * 5 rows for 90-min session structure
 */
export const PRIMARY_SUCCESS_DEFAULT_TEMPLATE: string = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'No' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hoạt động' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chi tiết' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dụng cụ' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thời gian' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục tiêu' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ghi chú' }] }] },
          ],
        },
        ...Array.from({ length: 5 }, (_, i) => ({
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(i + 1) }] }] },
            ...Array.from({ length: 6 }, () => ({
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [] }],
            })),
          ],
        })),
      ],
    },
  ],
});

/**
 * Determine which default template to use based on program slug.
 * Programs with "buttercup" in slug → Buttercup template.
 * Others → Primary Success template.
 */
export function getDefaultTemplate(slug: string): string {
  if (slug.toLowerCase().includes('buttercup')) {
    return BUTTERCUP_DEFAULT_TEMPLATE;
  }
  return PRIMARY_SUCCESS_DEFAULT_TEMPLATE;
}
