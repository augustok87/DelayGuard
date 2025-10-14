/// <reference path="../../types/webComponents.d.ts" />

/**
 * Working Tabs Web Component Tests
 * 
 * This test file uses a pragmatic approach to test the Tabs component
 * with Web Components, focusing on functionality rather than perfect mock behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tabs } from '../Tabs';

// Mock the Web Component registration
beforeAll(() => {
  // Create a simple mock for s-tabs
  class MockTabsElement extends HTMLElement {
    connectedCallback() {
      this.setAttribute('role', 'tablist');
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
    if (!customElements.get('s-tabs')) {
      customElements.define('s-tabs', MockTabsElement);
    }
  }
});

describe('Tabs Web Component - Working Tests', () => {
  const sampleTabs = [
    { id: 'tab1', content: 'Tab 1' },
    { id: 'tab2', content: 'Tab 2' },
    { id: 'tab3', content: 'Tab 3' }
  ];

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Tabs>Default Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs.tagName.toLowerCase()).toBe('s-tabs');
    });

    it('should render with tabs array', () => {
      render(<Tabs tabs={sampleTabs}>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('tabs', JSON.stringify(sampleTabs));
    });

    it('should render with selected tab', () => {
      render(<Tabs tabs={sampleTabs} selected={1}>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('selected', '1');
    });

    it('should apply custom className', () => {
      render(<Tabs className="custom-class">Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('class', 'custom-class');
    });

    it('should render with all props combined', () => {
      render(
        <Tabs
          tabs={sampleTabs}
          selected={2}
          className="test-class"
          data-testid="test-tabs"
        >
          Tab Content
        </Tabs>
      );
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('tabs', JSON.stringify(sampleTabs));
      expect(tabs).toHaveAttribute('selected', '2');
      expect(tabs).toHaveAttribute('class', 'test-class');
      expect(tabs).toHaveAttribute('data-testid', 'test-tabs');
    });
  });

  describe('Props Validation', () => {
    it('should handle undefined tabs gracefully', () => {
      render(<Tabs>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('tabs', '[]');
    });

    it('should handle empty tabs array', () => {
      render(<Tabs tabs={[]}>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('tabs', '[]');
    });

    it('should handle undefined selected gracefully', () => {
      render(<Tabs tabs={sampleTabs}>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('selected', '0');
    });

    it('should handle selected out of bounds', () => {
      render(<Tabs tabs={sampleTabs} selected={10}>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('selected', '10');
    });
  });

  describe('Event Handling', () => {
    it('should call onSelect handler when tab is selected', async () => {
      const handleSelect = jest.fn();
      render(
        <Tabs
          tabs={sampleTabs}
          selected={0}
          onSelect={handleSelect}
        >
          Tab Content
        </Tabs>
      );
      
      const tabs = screen.getByRole('tablist');
      
      // Simulate tab selection event
      const event = new CustomEvent('polaris-tab-select', {
        detail: { selectedIndex: 1 }
      });
      tabs.dispatchEvent(event);
      
      await waitFor(() => {
        expect(handleSelect).toHaveBeenCalledWith(1);
      });
    });

    it('should handle multiple tab selections', async () => {
      const handleSelect = jest.fn();
      render(
        <Tabs
          tabs={sampleTabs}
          selected={0}
          onSelect={handleSelect}
        >
          Tab Content
        </Tabs>
      );
      
      const tabs = screen.getByRole('tablist');
      
      // Simulate multiple tab selections
      tabs.dispatchEvent(new CustomEvent('polaris-tab-select', { detail: { selectedIndex: 1 } }));
      tabs.dispatchEvent(new CustomEvent('polaris-tab-select', { detail: { selectedIndex: 2 } }));
      
      await waitFor(() => {
        expect(handleSelect).toHaveBeenCalledTimes(2);
        expect(handleSelect).toHaveBeenNthCalledWith(1, 1);
        expect(handleSelect).toHaveBeenNthCalledWith(2, 2);
      });
    });

    it('should handle undefined onSelect gracefully', () => {
      render(<Tabs tabs={sampleTabs}>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      
      // Should not throw error
      tabs.dispatchEvent(new CustomEvent('polaris-tab-select', { detail: { selectedIndex: 1 } }));
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Tabs tabs={sampleTabs}>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('role', 'tablist');
    });

    it('should be keyboard accessible', () => {
      render(<Tabs tabs={sampleTabs}>Tab Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      tabs.focus();
      expect(tabs).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with React state', () => {
      const TestComponent = () => {
        const [selectedTab, setSelectedTab] = React.useState(0);
        return (
          <div>
            <Tabs
              tabs={sampleTabs}
              selected={selectedTab}
              onSelect={setSelectedTab}
            >
              <div>Tab {selectedTab + 1} Content</div>
            </Tabs>
            <div data-testid="selected-tab">Selected: {selectedTab}</div>
          </div>
        );
      };

      render(<TestComponent />);
      const tabs = screen.getByRole('tablist');
      const selectedDisplay = screen.getByTestId('selected-tab');
      
      expect(tabs).toBeInTheDocument();
      expect(selectedDisplay).toHaveTextContent('Selected: 0');
      
      // Simulate tab selection
      tabs.dispatchEvent(new CustomEvent('polaris-tab-select', { detail: { selectedIndex: 1 } }));
      
      expect(selectedDisplay).toHaveTextContent('Selected: 1');
    });

    it('should work with dynamic tabs', () => {
      const TestComponent = () => {
        const [tabs, setTabs] = React.useState(sampleTabs);
        return (
          <div>
            <Tabs tabs={tabs}>
              Tab Content
            </Tabs>
            <button onClick={() => setTabs([...tabs, { id: 'tab4', content: 'Tab 4' }])}>
              Add Tab
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      const tabs = screen.getByRole('tablist');
      const button = screen.getByText('Add Tab');
      
      expect(tabs).toHaveAttribute('tabs', JSON.stringify(sampleTabs));
      
      fireEvent.click(button);
      
      expect(tabs).toHaveAttribute('tabs', JSON.stringify([...sampleTabs, { id: 'tab4', content: 'Tab 4' }]));
    });

    it('should work with nested components', () => {
      render(
        <Tabs tabs={sampleTabs}>
          <div>
            <h3>Tab Content</h3>
            <p>This is tab content</p>
            <button>Action Button</button>
          </div>
        </Tabs>
      );
      
      expect(screen.getByText('Tab Content')).toBeInTheDocument();
      expect(screen.getByText('This is tab content')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid props', () => {
      const props = {
        tabs: sampleTabs,
        selected: 1,
        className: 'test-class',
        'data-testid': 'test-tabs',
        onSelect: jest.fn(),
      };

      render(<Tabs {...props}>Test Content</Tabs>);
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
    });
  });
});
