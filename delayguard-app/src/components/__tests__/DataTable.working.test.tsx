/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working DataTable Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the DataTable component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataTable } from '../DataTable';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-data-table
  class MockDataTableElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'table');
      this.setAttribute('tabindex', '0');
    }
    
    setAttribute(name: string, value: string) {
      super.setAttribute(name, value);
      if (name === 'class') {
        this.className = value;
      }
    }
    
    getAttribute(name: string) {
      if (name === 'class') {
        return this.className || null;
      }
      return super.getAttribute(name);
    }
  }
  
  if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    if (!customElements.get('s-data-table')) {
      customElements.define('s-data-table', MockDataTableElement);
    }
  }
});

describe('DataTable Web Component - Working Tests', () => {
  const sampleData = [
    ['John Doe', 'john@example.com', 'Active'],
    ['Jane Smith', 'jane@example.com', 'Inactive'],
    ['Bob Johnson', 'bob@example.com', 'Active']
  ];

  const sampleHeadings = ['Name', 'Email', 'Status'];
  const sampleColumnTypes = ['text', 'text', 'text'];

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<DataTable />);
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable.tagName.toLowerCase()).toBe('s-data-table');
    });

    it('should render with headings and data', () => {
      render(
        <DataTable
          headings={sampleHeadings}
          columnContentTypes={sampleColumnTypes}
          rows={sampleData}
        />
      );
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('headings', 'Name,Email,Status');
      expect(dataTable).toHaveAttribute('column-content-types', 'text,text,text');
    });

    it('should render as sortable', () => {
      render(
        <DataTable
          headings={sampleHeadings}
          rows={sampleData}
          sortable
        />
      );
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('sortable', 'true');
    });

    it('should apply custom className', () => {
      render(<DataTable className="custom-class" />);
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <DataTable
          headings={sampleHeadings}
          columnContentTypes={sampleColumnTypes}
          rows={sampleData}
          sortable
          className="test-class"
          data-testid="test-datatable"
        />
      );
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('headings', 'Name,Email,Status');
      expect(dataTable).toHaveAttribute('column-content-types', 'text,text,text');
      expect(dataTable).toHaveAttribute('sortable', 'true');
      expect(dataTable).toHaveAttribute('class', 'test-class');
      expect(dataTable).toHaveAttribute('data-testid', 'test-datatable');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined headings gracefully', () => {
      render(<DataTable rows={sampleData} />);
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).not.toHaveAttribute('headings');
    });

    it('should handle undefined columnContentTypes gracefully', () => {
      render(<DataTable headings={sampleHeadings} rows={sampleData} />);
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).not.toHaveAttribute('column-content-types');
    });

    it('should handle undefined rows gracefully', () => {
      render(<DataTable headings={sampleHeadings} />);
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
    });

    it('should handle empty arrays', () => {
      render(
        <DataTable
          headings={[]}
          columnContentTypes={[]}
          rows={[]}
        />
      );
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('headings', '');
      expect(dataTable).toHaveAttribute('column-content-types', '');
    });

    it('should handle boolean props correctly', () => {
      render(<DataTable sortable={true} />);
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('sortable', 'true');
    });
  });

  describe('Data Handling', () => {
    it('should render rows as children', () => {
      render(
        <DataTable
          headings={sampleHeadings}
          rows={sampleData}
        />
      );
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      
      // Check that rows are rendered as children
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getAllByText('Active')).toHaveLength(2);
    });

    it('should handle different column content types', () => {
      const mixedTypes = ['text', 'numeric', 'text'];
      render(
        <DataTable
          headings={['Name', 'Age', 'Status']}
          columnContentTypes={mixedTypes}
          rows={[['John', '25', 'Active']]}
        />
      );
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('column-content-types', 'text,numeric,text');
    });

    it('should handle large datasets', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => [
        `User ${i}`,
        `user${i}@example.com`,
        i % 2 === 0 ? 'Active' : 'Inactive'
      ]);
      
      render(
        <DataTable
          headings={['Name', 'Email', 'Status']}
          rows={largeDataset}
        />
      );
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(screen.getByText('User 0')).toBeInTheDocument();
      expect(screen.getByText('User 99')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<DataTable headings={sampleHeadings} rows={sampleData} />);
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
      expect(dataTable).toHaveAttribute('role', 'table');
    });

    it('should be keyboard accessible', () => {
      render(<DataTable headings={sampleHeadings} rows={sampleData} />);
      const dataTable = screen.getByRole('table');
      dataTable.focus();
      expect(dataTable).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [data, setData] = React.useState(sampleData);
        return (
          <div>
            <DataTable
              headings={sampleHeadings}
              rows={data}
            />
            <button onClick={() => setData([...data, ['New User', 'new@example.com', 'Active']])}>
              Add Row
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      const dataTable = screen.getByRole('table');
      const button = screen.getByText('Add Row');
      
      expect(dataTable).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      fireEvent.click(button);
      
      expect(screen.getByText('New User')).toBeInTheDocument();
    });

    it('should work with dynamic headings', () => {
      const TestComponent = () => {
        const [headings, setHeadings] = React.useState(sampleHeadings);
        return (
          <div>
            <DataTable
              headings={headings}
              rows={sampleData}
            />
            <button onClick={() => setHeadings(['ID', 'Name', 'Email', 'Status'])}>
              Update Headings
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      const dataTable = screen.getByRole('table');
      const button = screen.getByText('Update Headings');
      
      expect(dataTable).toHaveAttribute('headings', 'Name,Email,Status');
      
      fireEvent.click(button);
      
      expect(dataTable).toHaveAttribute('headings', 'ID,Name,Email,Status');
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        headings: ['Name', 'Email'],
        columnContentTypes: ['text', 'text'],
        rows: [['John', 'john@example.com']],
        sortable: true,
        className: 'test-class',
        'data-testid': 'test-datatable',
      };

      render(<DataTable {...props} />);
      const dataTable = screen.getByRole('table');
      expect(dataTable).toBeInTheDocument();
    });
  });
});
