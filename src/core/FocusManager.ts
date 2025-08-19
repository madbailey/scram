// Focus state management for the navigator

export type FocusableComponent = "navigator" | "preview" | "overlay";

export class FocusManager {
  private currentFocus: FocusableComponent = "navigator";
  private overlayVisible: boolean = false;
  
  // Components that can receive focus
  private components = {
    navigator: null as any,
    preview: null as any,
    overlay: null as any,
  };

  // Focus order for tab navigation
  private tabOrder: FocusableComponent[] = ["navigator", "preview"];

  setComponent(name: FocusableComponent, component: any) {
    this.components[name] = component;
  }

  setOverlayVisible(visible: boolean) {
    this.overlayVisible = visible;
    if (visible) {
      this.setFocus("overlay");
    } else if (this.currentFocus === "overlay") {
      // Return focus to previous component
      this.setFocus("navigator");
    }
  }

  isOverlayVisible(): boolean {
    return this.overlayVisible;
  }

  getCurrentFocus(): FocusableComponent {
    return this.overlayVisible ? "overlay" : this.currentFocus;
  }

  setFocus(component: FocusableComponent) {
    // Don't change focus if overlay is visible (unless setting to overlay)
    if (this.overlayVisible && component !== "overlay") {
      return;
    }

    this.currentFocus = component;
    this.updateComponentFocus();
  }

  tabToNext() {
    if (this.overlayVisible) return; // Tab doesn't work when overlay is visible

    const currentIndex = this.tabOrder.indexOf(this.currentFocus);
    const nextIndex = (currentIndex + 1) % this.tabOrder.length;
    this.setFocus(this.tabOrder[nextIndex]);
  }

  tabToPrevious() {
    if (this.overlayVisible) return; // Tab doesn't work when overlay is visible

    const currentIndex = this.tabOrder.indexOf(this.currentFocus);
    const prevIndex = (currentIndex - 1 + this.tabOrder.length) % this.tabOrder.length;
    this.setFocus(this.tabOrder[prevIndex]);
  }

  private updateComponentFocus() {
    // Blur all components first
    Object.values(this.components).forEach(component => {
      if (component && component.blur) {
        component.blur();
      }
    });

    // Focus the current component
    const targetComponent = this.components[this.getCurrentFocus()];
    if (targetComponent && targetComponent.focus) {
      targetComponent.focus();
    }
  }

  // Helper methods for input routing
  canNavigatorReceiveInput(): boolean {
    return !this.overlayVisible && this.currentFocus === "navigator";
  }

  canPreviewReceiveInput(): boolean {
    return !this.overlayVisible && this.currentFocus === "preview";
  }

  canOverlayReceiveInput(): boolean {
    return this.overlayVisible;
  }

  // Debug info
  getDebugInfo() {
    return {
      currentFocus: this.currentFocus,
      overlayVisible: this.overlayVisible,
      effectiveFocus: this.getCurrentFocus(),
    };
  }
}

// Singleton instance
export const focusManager = new FocusManager();