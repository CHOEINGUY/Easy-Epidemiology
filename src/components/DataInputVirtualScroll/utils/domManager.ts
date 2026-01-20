/**
 * DOM Access Encapsulation Layer for Virtual Grid
 * Encapsulates direct DOM access (document.querySelector) to facilitate future refactoring to Refs.
 */

export class GridDomManager {
    /**
     * Gets the cell element for a given row and column index.
     * Handles both body cells (positive rowIndex) and header cells (negative rowIndex).
     */
    static getCellElement(rowIndex: number, colIndex: number): HTMLElement | null {
        const selector = rowIndex < 0
            ? `th[data-col="${colIndex}"]`
            : `td[data-row="${rowIndex}"][data-col="${colIndex}"]`;
        return document.querySelector(selector) as HTMLElement | null;
    }

    /**
     * Gets the cell element using a simplified selector (attribute only).
     */
    static getCellElementByAttribute(rowIndex: number, colIndex: number): HTMLElement | null {
        const selector = rowIndex < 0
            ? `[data-col="${colIndex}"]`
            : `[data-row="${rowIndex}"][data-col="${colIndex}"]`;
        return document.querySelector(selector) as HTMLElement | null;
    }

    /**
     * Gets the cell element based on a mouse event target.
     */
    static getCellFromEvent(event: Event): HTMLElement | null {
        const target = event.target as HTMLElement;
        return target.closest('td, th') as HTMLElement | null;
    }

    /**
     * Focuses a cell element if found.
     */
    static focusCell(rowIndex: number, colIndex: number): boolean {
        const cell = this.getCellElementByAttribute(rowIndex, colIndex);
        if (cell) {
            cell.focus();
            return true;
        }
        return false;
    }

    /**
     * Selects all text content within an element.
     */
    static selectContent(element: HTMLElement): void {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false); // Collapse to end like original logic, or select all?
        // Original logic in keyboardEditing was range.collapse(false). 
        // Original logic in virtualEditHandlers was selectNodeContents then addRange (Select All).
        // Let's support both via flag if needed, defaulting to Select All for edit start.
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}
