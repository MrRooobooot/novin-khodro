/**
 * Accessible Modal Focus Trap and Lifecycle Controller
 */
export class ModalManager {
  constructor(modalElement, options = {}) {
    this.modal = modalElement;
    this.options = options;
    this.previouslyFocusedElement = null;
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  open() {
    if (!this.modal) return;
    this.previouslyFocusedElement = document.activeElement;
    this.modal.classList.add('active');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', this.handleKeyDown);

    // Focus first interactive element or close button
    const focusable = this.getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      this.previouslyFocusedElement.focus();
    }
  }

  getFocusableElements() {
    if (!this.modal) return [];
    return Array.from(
      this.modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      if (this.options.onClose) this.options.onClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = this.getFocusableElements();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }
}
