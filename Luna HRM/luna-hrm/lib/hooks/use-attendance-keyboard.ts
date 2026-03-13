'use client'

/**
 * Keyboard navigation hook for the attendance grid.
 *
 * Features:
 * - Arrow keys: move focused cell (Up/Down = row, Left/Right = col/day)
 * - Ctrl+S: trigger save callback
 * - Keys 1/0/K/H: handled directly by AttendanceCell via onKeyDown
 *
 * Usage: attach the returned onKeyDown to the grid container div.
 * The hook computes row/col counts from the grid and programmatically
 * focuses the correct <td> cell.
 */

import { useCallback } from 'react'

export interface AttendanceKeyboardOptions {
  rowCount: number
  colCount: number        // Number of day columns (usually 7)
  colOffset: number       // How many non-day columns precede the day cells (header cols)
  containerRef: React.RefObject<HTMLElement | null>
  onSave: () => void
  isLocked: boolean
}

/**
 * Returns a keydown handler to attach to the grid wrapper element.
 * Arrow keys navigate between focusable <td> cells using DOM traversal.
 */
export function useAttendanceKeyboard({
  rowCount,
  colCount,
  colOffset,
  containerRef,
  onSave,
  isLocked,
}: AttendanceKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl+S: save shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!isLocked) onSave()
        return
      }

      // Arrow key navigation — only when focus is inside a day cell
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return

      const container = containerRef.current
      if (!container) return

      const focused = document.activeElement as HTMLElement | null
      if (!focused || focused.tagName !== 'TD') return

      // Find which row and cell index the focused td is in
      const row = focused.closest('tr') as HTMLTableRowElement | null
      if (!row) return
      const allRows = Array.from(container.querySelectorAll('tbody tr')) as HTMLTableRowElement[]
      const rowIdx = allRows.indexOf(row)
      if (rowIdx < 0) return

      const cells = Array.from(row.querySelectorAll('td')) as HTMLTableCellElement[]
      const colIdx = cells.indexOf(focused as HTMLTableCellElement)
      // colIdx must be within day cell range [colOffset, colOffset+colCount)
      if (colIdx < colOffset || colIdx >= colOffset + colCount) return

      e.preventDefault()

      const dayIdx = colIdx - colOffset // 0-based within day columns

      let nextRow = rowIdx
      let nextDay = dayIdx

      if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIdx - 1)
      else if (e.key === 'ArrowDown') nextRow = Math.min(rowCount - 1, rowIdx + 1)
      else if (e.key === 'ArrowLeft') nextDay = Math.max(0, dayIdx - 1)
      else if (e.key === 'ArrowRight') nextDay = Math.min(colCount - 1, dayIdx + 1)

      const targetRow = allRows[nextRow]
      if (!targetRow) return
      const targetCells = Array.from(targetRow.querySelectorAll('td')) as HTMLTableCellElement[]
      const targetCell = targetCells[colOffset + nextDay]
      if (targetCell && targetCell.tabIndex >= 0) {
        targetCell.focus()
      }
    },
    [rowCount, colCount, colOffset, containerRef, onSave, isLocked]
  )

  return { handleKeyDown }
}
