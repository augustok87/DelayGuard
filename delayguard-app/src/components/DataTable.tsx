/// <reference path="../types/webComponents.d.ts" />

/**
 * DataTable Web Component
 * 
 * A React wrapper for the Polaris Web Components DataTable.
 * This component provides a React-friendly API while using Web Components under the hood.
 * 
 * @example
 * ```tsx
 * <DataTable
 *   columnContentTypes={['text', 'text', 'text']}
 *   headings={['Name', 'Email', 'Status']}
 *   rows={[
 *     ['John Doe', 'john@example.com', 'Active'],
 *     ['Jane Smith', 'jane@example.com', 'Inactive']
 *   ]}
 *   sortable
 * />
 * ```
 */

import * as React from 'react';

export interface DataTableProps {
  /** Content types for each column */
  columnContentTypes?: string[];
  /** Column headings */
  headings?: string[];
  /** Table rows data */
  rows?: string[][];
  /** Whether columns are sortable */
  sortable?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional props */
  [key: string]: any;
}

export const DataTable = React.forwardRef<HTMLElement, DataTableProps>(
  ({ 
    columnContentTypes,
    headings,
    rows,
    sortable = false,
    className,
    'data-testid': dataTestId,
    ...props 
  }, _ref) => {
    const webComponentRef = React.useRef<HTMLElement>(null);

    // Convert React props to Web Component attributes
    const webComponentProps = React.useMemo(() => ({
      ...(columnContentTypes && { 'column-content-types': columnContentTypes.join(',') }),
      ...(headings && { headings: headings.join(',') }),
      sortable,
      ...props,
    }), [columnContentTypes, headings, sortable, props]);

    return (
      <s-data-table
        ref={webComponentRef}
        className={className as string}
        data-testid={dataTestId as string}
        {...webComponentProps}
      >
        {/* Render rows as children if provided */}
        {rows && rows.map((row: string[], rowIndex: number) => (
          <div key={rowIndex} data-row={rowIndex}>
            {row.map((cell: string, cellIndex: number) => (
              <div key={cellIndex} data-cell={cellIndex}>
                {cell}
              </div>
            ))}
          </div>
        ))}
      </s-data-table>
    );
  }
);

DataTable.displayName = 'DataTable';
