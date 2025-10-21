/**
 * Global TypeScript declarations for React Components
 *
 * This file provides comprehensive type definitions for React Components
 * integration with TypeScript.
 */

// Global JSX namespace augmentation for React Components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Standard HTML elements with enhanced props
      div: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLDivElement>,
        HTMLDivElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
        "aria-hidden"?: boolean;
      };

      span: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLSpanElement>,
        HTMLSpanElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
        "aria-hidden"?: boolean;
      };

      button: React.DetailedHTMLProps<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        HTMLButtonElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
        "aria-pressed"?: boolean;
        "aria-expanded"?: boolean;
      };

      input: React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
        "aria-required"?: boolean;
      };

      select: React.DetailedHTMLProps<
        React.SelectHTMLAttributes<HTMLSelectElement>,
        HTMLSelectElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
        "aria-required"?: boolean;
      };

      textarea: React.DetailedHTMLProps<
        React.TextareaHTMLAttributes<HTMLTextAreaElement>,
        HTMLTextAreaElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
        "aria-required"?: boolean;
      };

      form: React.DetailedHTMLProps<
        React.FormHTMLAttributes<HTMLFormElement>,
        HTMLFormElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      table: React.DetailedHTMLProps<
        React.TableHTMLAttributes<HTMLTableElement>,
        HTMLTableElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
      };

      thead: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLTableSectionElement>,
        HTMLTableSectionElement
      > & {
        "data-testid"?: string;
      };

      tbody: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLTableSectionElement>,
        HTMLTableSectionElement
      > & {
        "data-testid"?: string;
      };

      tr: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLTableRowElement>,
        HTMLTableRowElement
      > & {
        "data-testid"?: string;
      };

      td: React.DetailedHTMLProps<
        React.TdHTMLAttributes<HTMLTableDataCellElement>,
        HTMLTableDataCellElement
      > & {
        "data-testid"?: string;
      };

      th: React.DetailedHTMLProps<
        React.ThHTMLAttributes<HTMLTableHeaderCellElement>,
        HTMLTableHeaderCellElement
      > & {
        "data-testid"?: string;
        "aria-sort"?: "ascending" | "descending" | "none";
      };

      ul: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLUListElement>,
        HTMLUListElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      ol: React.DetailedHTMLProps<
        React.OlHTMLAttributes<HTMLOListElement>,
        HTMLOListElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      li: React.DetailedHTMLProps<
        React.LiHTMLAttributes<HTMLLIElement>,
        HTMLLIElement
      > & {
        "data-testid"?: string;
      };

      a: React.DetailedHTMLProps<
        React.AnchorHTMLAttributes<HTMLAnchorElement>,
        HTMLAnchorElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
      };

      img: React.DetailedHTMLProps<
        React.ImgHTMLAttributes<HTMLImageElement>,
        HTMLImageElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-describedby"?: string;
      };

      h1: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      h2: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      h3: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      h4: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      h5: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      h6: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      p: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLParagraphElement>,
        HTMLParagraphElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      label: React.DetailedHTMLProps<
        React.LabelHTMLAttributes<HTMLLabelElement>,
        HTMLLabelElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      fieldset: React.DetailedHTMLProps<
        React.FieldsetHTMLAttributes<HTMLFieldSetElement>,
        HTMLFieldSetElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      legend: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLLegendElement>,
        HTMLLegendElement
      > & {
        "data-testid"?: string;
      };

      section: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-labelledby"?: string;
      };

      article: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
        "aria-labelledby"?: string;
      };

      header: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      footer: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      nav: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      main: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };

      aside: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "data-testid"?: string;
        "aria-label"?: string;
      };
    }
  }
}

// React Component event types
export interface ReactComponentEvent extends React.SyntheticEvent {
  detail?: unknown;
}

// React Component lifecycle events
export interface ReactComponentLifecycleEvents {
  componentDidMount: React.SyntheticEvent;
  componentWillUnmount: React.SyntheticEvent;
  componentDidUpdate: React.SyntheticEvent;
}

// React Component events
export interface ReactComponentEvents {
  "react-click": React.MouseEvent;
  "react-change": React.ChangeEvent;
  "react-focus": React.FocusEvent;
  "react-blur": React.FocusEvent;
  "react-submit": React.FormEvent;
  "react-keydown": React.KeyboardEvent;
  "react-keyup": React.KeyboardEvent;
  "react-mouseenter": React.MouseEvent;
  "react-mouseleave": React.MouseEvent;
}

// Event conversion utilities
export interface SyntheticEventData {
  currentTarget: HTMLElement;
  target: HTMLElement;
  preventDefault: () => void;
  stopPropagation: () => void;
  nativeEvent: Event;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;
  eventPhase: number;
  isTrusted: boolean;
  timeStamp: number;
  type: string;
}

export type ReactComponentEventConverter<
  T extends React.SyntheticEvent = React.SyntheticEvent,
> = (event: T) => SyntheticEventData;
