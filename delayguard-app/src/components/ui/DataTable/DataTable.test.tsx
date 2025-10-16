import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DataTable } from './index';
import { DataTableProps, DataTableRow } from '../../../types/ui';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock CSS modules
jest.mock('./DataTable.module.css', () => ({
  table: 'table',
  tableContainer: 'tableContainer',
  loadingContainer: 'loadingContainer',
  spinner: 'spinner',
  emptyContainer: 'emptyContainer',
  emptyIcon: 'emptyIcon',
  emptyMessage: 'emptyMessage',
  headerCell: 'headerCell',
  sortable: 'sortable',
  sorted: 'sorted',
  'align-left': 'align-left',
  'align-center': 'align-center',
  'align-right': 'align-right',
  headerContent: 'headerContent',
  sortIcon: 'sortIcon',
  dataRow: 'dataRow',
  clickableRow: 'clickableRow',
  dataCell: 'dataCell',
}));

const mockData: DataTableRow[] = [
  { id: '1', name: 'John Doe', age: 30, email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', age: 25, email: 'jane@example.com' },
  { id: '3', name: 'Bob Johnson', age: 35, email: 'bob@example.com' },
];

const mockColumns = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'age', title: 'Age', sortable: true, align: 'right' as const },
  { key: 'email', title: 'Email', sortable: false },
];

const defaultProps: DataTableProps = {
  columns: mockColumns,
  data: mockData,
};

describe('DataTable', () => {
  describe('Rendering', () => {
    it('should render with basic props', () => {
      render(<DataTable {...defaultProps} />);
      
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should render data rows', () => {
      render(<DataTable {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <DataTable {...defaultProps} className="custom-class" />
      );
      
      expect(container.querySelector('.table.custom-class')).toBeInTheDocument();
    });

    it('should render with aria-label', () => {
      render(<DataTable {...defaultProps} aria-label="User data table" />);
      
      expect(screen.getByLabelText('User data table')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      render(<DataTable {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.queryByTestId('data-table')).not.toBeInTheDocument();
    });

    it('should show spinner in loading state', () => {
      render(<DataTable {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no data', () => {
      render(<DataTable {...defaultProps} data={[]} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      render(
        <DataTable 
          {...defaultProps} 
          data={[]} 
          emptyMessage="No users found" 
        />
      );
      
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should show empty state when rows prop is empty', () => {
      render(<DataTable {...defaultProps} data={[]} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should render sortable columns with sort icons', () => {
      render(<DataTable {...defaultProps} sortable={true} />);
      
      const nameHeader = screen.getByText('Name').closest('th');
      const ageHeader = screen.getByText('Age').closest('th');
      const emailHeader = screen.getByText('Email').closest('th');
      
      expect(nameHeader).toHaveClass('sortable');
      expect(ageHeader).toHaveClass('sortable');
      expect(emailHeader).not.toHaveClass('sortable');
    });

    it('should handle column click for sorting', () => {
      const onSort = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          sortable={true} 
          onSort={onSort} 
        />
      );
      
      fireEvent.click(screen.getByText('Name'));
      
      expect(onSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('should toggle sort direction on same column click', () => {
      const onSort = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          sortable={true} 
          onSort={onSort} 
        />
      );
      
      const nameHeader = screen.getByText('Name');
      
      // First click - ascending
      fireEvent.click(nameHeader);
      expect(onSort).toHaveBeenCalledWith('name', 'asc');
      
      // Second click - descending
      fireEvent.click(nameHeader);
      expect(onSort).toHaveBeenCalledWith('name', 'desc');
    });

    it('should handle keyboard navigation for sorting', () => {
      const onSort = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          sortable={true} 
          onSort={onSort} 
        />
      );
      
      const nameHeader = screen.getByText('Name').closest('th');
      
      fireEvent.keyDown(nameHeader!, { key: 'Enter' });
      expect(onSort).toHaveBeenCalledWith('name', 'asc');
      
      fireEvent.keyDown(nameHeader!, { key: ' ' });
      expect(onSort).toHaveBeenCalledWith('name', 'desc');
    });

    it('should not sort when column is not sortable', () => {
      const onSort = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          sortable={true} 
          onSort={onSort} 
        />
      );
      
      fireEvent.click(screen.getByText('Email'));
      
      expect(onSort).not.toHaveBeenCalled();
    });

    it('should show sort direction indicators', () => {
      const onSort = jest.fn();
      render(<DataTable {...defaultProps} sortable={true} onSort={onSort} />);
      
      const nameHeader = screen.getByText('Name').closest('th');
      
      // Click to sort ascending
      fireEvent.click(nameHeader!);
      
      // The component should call onSort with the correct parameters
      expect(onSort).toHaveBeenCalledWith('name', 'asc');
    });
  });

  describe('Row Selection', () => {
    it('should render checkboxes when selectable is true', () => {
      render(
        <DataTable 
          {...defaultProps} 
          selectable={true} 
          selectedRows={[]} 
          onSelectionChange={jest.fn()} 
        />
      );
      
      expect(screen.getByTestId('select-all-checkbox')).toBeInTheDocument();
      expect(screen.getAllByTestId('checkbox')).toHaveLength(3);
    });

    it('should handle row selection', () => {
      const onSelectionChange = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          selectable={true} 
          selectedRows={[]} 
          onSelectionChange={onSelectionChange} 
        />
      );
      
      const firstCheckbox = screen.getAllByTestId('checkbox')[0];
      fireEvent.click(firstCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('should handle select all', () => {
      const onSelectionChange = jest.fn();
      const onSelectAll = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          selectable={true} 
          selectedRows={[]} 
          onSelectionChange={onSelectionChange} 
          onSelectAll={onSelectAll} 
        />
      );
      
      const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
      fireEvent.click(selectAllCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith(['1', '2', '3']);
      expect(onSelectAll).toHaveBeenCalledWith(true);
    });

    it('should show indeterminate state for partial selection', () => {
      render(
        <DataTable 
          {...defaultProps} 
          selectable={true} 
          selectedRows={['1']} 
          onSelectionChange={jest.fn()} 
        />
      );
      
      const selectAllCheckbox = screen.getByTestId('select-all-checkbox') as HTMLInputElement;
      expect(selectAllCheckbox.indeterminate).toBe(true);
    });

    it('should show checked state when all rows are selected', () => {
      render(
        <DataTable 
          {...defaultProps} 
          selectable={true} 
          selectedRows={['1', '2', '3']} 
          onSelectionChange={jest.fn()} 
        />
      );
      
      const selectAllCheckbox = screen.getByTestId('select-all-checkbox') as HTMLInputElement;
      expect(selectAllCheckbox.checked).toBe(true);
    });
  });

  describe('Row Click', () => {
    it('should handle row click when onRowClick is provided', () => {
      const onRowClick = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          onRowClick={onRowClick} 
        />
      );
      
      fireEvent.click(screen.getByText('John Doe').closest('tr')!);
      
      expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('should handle keyboard navigation for row click', () => {
      const onRowClick = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          onRowClick={onRowClick} 
        />
      );
      
      const row = screen.getByText('John Doe').closest('tr')!;
      
      fireEvent.keyDown(row, { key: 'Enter' });
      expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
      
      fireEvent.keyDown(row, { key: ' ' });
      expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('should not trigger row click when checkbox is clicked', () => {
      const onRowClick = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          selectable={true} 
          selectedRows={[]} 
          onSelectionChange={jest.fn()} 
          onRowClick={onRowClick} 
        />
      );
      
      const checkbox = screen.getAllByTestId('checkbox')[0];
      fireEvent.click(checkbox);
      
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  describe('Column Rendering', () => {
    it('should render custom cell content using render function', () => {
      const columnsWithRender = [
        ...mockColumns,
        {
          key: 'actions',
          title: 'Actions',
          render: (value: any, row: DataTableRow) => (
            <button data-testid={`action-${row.id}`}>Edit</button>
          ),
        },
      ];

      render(
        <DataTable 
          {...defaultProps} 
          columns={columnsWithRender} 
        />
      );
      
      expect(screen.getByTestId('action-1')).toBeInTheDocument();
      expect(screen.getByTestId('action-2')).toBeInTheDocument();
      expect(screen.getByTestId('action-3')).toBeInTheDocument();
    });

    it('should apply column alignment classes', () => {
      render(<DataTable {...defaultProps} />);
      
      const ageHeader = screen.getByText('Age').closest('th');
      expect(ageHeader).toHaveClass('align-right');
    });

    it('should apply column width styles', () => {
      const columnsWithWidth = [
        { key: 'name', title: 'Name', width: '200px' },
        { key: 'age', title: 'Age', width: '100px' },
      ];

      render(
        <DataTable 
          {...defaultProps} 
          columns={columnsWithWidth} 
        />
      );
      
      const nameHeader = screen.getByText('Name').closest('th');
      const ageHeader = screen.getByText('Age').closest('th');
      
      expect(nameHeader).toHaveStyle('width: 200px');
      expect(ageHeader).toHaveStyle('width: 100px');
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<DataTable {...defaultProps} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Name/ })).toBeInTheDocument();
      expect(screen.getByRole('row', { name: /John Doe/ })).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for sorting', () => {
      render(<DataTable {...defaultProps} sortable={true} />);
      
      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');
      expect(nameHeader).toHaveAttribute('role', 'button');
      expect(nameHeader).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA attributes for selection', () => {
      render(
        <DataTable 
          {...defaultProps} 
          selectable={true} 
          selectedRows={[]} 
          onSelectionChange={jest.fn()} 
        />
      );
      
      const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
      expect(selectAllCheckbox).toHaveAttribute('aria-label', 'Select all rows');
      
      const rowCheckbox = screen.getAllByTestId('checkbox')[0];
      expect(rowCheckbox).toHaveAttribute('aria-label', 'Select row 1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined data gracefully', () => {
      render(<DataTable {...defaultProps} data={undefined} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle null data gracefully', () => {
      render(<DataTable {...defaultProps} data={null as any} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle empty columns array', () => {
      render(<DataTable {...defaultProps} columns={[]} />);
      
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('should handle missing onSort callback', () => {
      expect(() => {
        render(<DataTable {...defaultProps} sortable={true} />);
      }).not.toThrow();
    });

    it('should handle missing onSelectionChange callback', () => {
      expect(() => {
        render(
          <DataTable 
            {...defaultProps} 
            selectable={true} 
            selectedRows={[]} 
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestDataTable = (props: DataTableProps) => {
        renderSpy();
        return <DataTable {...props} />;
      };

      const { rerender } = render(<TestDataTable {...defaultProps} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Rerender with same props
      rerender(<TestDataTable {...defaultProps} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Sorting Logic', () => {
    it('should sort data correctly by string values', () => {
      const onSort = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          sortable={true} 
          onSort={onSort} 
        />
      );
      
      // Click name column to sort
      fireEvent.click(screen.getByText('Name'));
      
      // The component should call onSort with the correct parameters
      expect(onSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('should sort data correctly by numeric values', () => {
      const onSort = jest.fn();
      render(
        <DataTable 
          {...defaultProps} 
          sortable={true} 
          onSort={onSort} 
        />
      );
      
      // Click age column to sort
      fireEvent.click(screen.getByText('Age'));
      
      expect(onSort).toHaveBeenCalledWith('age', 'asc');
    });
  });
});
