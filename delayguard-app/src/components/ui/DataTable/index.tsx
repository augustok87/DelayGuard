import React, { useMemo, useCallback } from 'react';
import { DataTableProps, DataTableColumn, DataTableRow } from '../../../types/ui';
import styles from './DataTable.module.css';

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  rows,
  loading = false,
  emptyMessage = 'No data available',
  sortable = false,
  onSort,
  onRowClick,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const tableData = data || rows || [];

  const handleSort = useCallback((columnKey: string) => {
    if (!sortable || !onSort) return;
    
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(columnKey);
    setSortDirection(newDirection);
    onSort(columnKey, newDirection);
  }, [sortable, columns, onSort, sortColumn, sortDirection]);

  const handleRowClick = useCallback((row: DataTableRow) => {
    if (onRowClick) {
      onRowClick(row);
    }
  }, [onRowClick]);

  const sortedData = useMemo(() => {
    if (!sortable || !sortColumn || !onSort) return tableData;
    
    return [...tableData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortable, tableData, sortColumn, sortDirection, onSort]);

  const tableClasses = [
    styles.table,
    className,
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <span>Loading data...</span>
      </div>
    );
  }

  if (tableData.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>📊</div>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={tableClasses} aria-label={ariaLabel} data-testid="data-table" {...props}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sortColumn === column.key;
              const headerClasses = [
                styles.headerCell,
                column.sortable && styles.sortable,
                isSorted && styles.sorted,
                column.align && styles[`align-${column.align}`],
              ].filter(Boolean).join(' ');

              return (
                <th
                  key={column.key}
                  className={headerClasses}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                  role={column.sortable ? 'button' : undefined}
                  tabIndex={column.sortable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(column.key);
                    }
                  }}
                  aria-sort={
                    column.sortable
                      ? isSorted
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  <span className={styles.headerContent}>
                    {column.title}
                    {column.sortable && (
                      <span className={styles.sortIcon}>
                        {isSorted ? (
                          sortDirection === 'asc' ? '↑' : '↓'
                        ) : (
                          '↕'
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => {
            const rowClasses = [
              styles.dataRow,
              onRowClick && styles.clickableRow,
            ].filter(Boolean).join(' ');

            return (
              <tr
                key={row.id}
                className={rowClasses}
                onClick={() => handleRowClick(row)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleRowClick(row);
                  }
                }}
              >
                {columns.map((column) => {
                  const cellClasses = [
                    styles.dataCell,
                    column.align && styles[`align-${column.align}`],
                  ].filter(Boolean).join(' ');

                  return (
                    <td key={column.key} className={cellClasses}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
