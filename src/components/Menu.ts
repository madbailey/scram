import {
  BoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  type ParsedKey,
  type SelectOption,
} from "@opentui/core";
import { MenuItem, MenuOptions } from "../types";

export class Menu extends BoxRenderable {
  private select: SelectRenderable;
  private items: MenuItem[];

  // Callbacks
  private onItemSelected?: (item: MenuItem, index: number) => void;
  private onItemSelectionChanged?: (item: MenuItem, index: number) => void;
  private onKeyPress?: (key: ParsedKey) => boolean;

  constructor(name: string, options: MenuOptions) {
    super(name, {
      flexGrow: 1,
      minHeight: 10,
      backgroundColor: "#001122",
    });

    this.items = options.items;
    this.onItemSelected = options.onItemSelected;
    this.onItemSelectionChanged = options.onItemSelectionChanged;
    this.onKeyPress = options.onKeyPress;

    this.select = new SelectRenderable("menu-select", {
      flexGrow: 1,
      textColor: "#ffffff",
      selectedBackgroundColor: "#215ea6",
      selectedTextColor: "#ffffff",
      focusedBackgroundColor: "#163e6f",
      focusedTextColor: "#ffffff",
      wrapSelection: true,
      showDescription: false,
      options: this.makeOptions(),
    });

    this.add(this.select);

    this.setupEventHandlers();
  }

  private makeOptions() {
    return this.items.map((item) => ({
      name: item.label,
      description: item.description ?? "",
    }));
  }

  private setupEventHandlers() {
    this.select.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number, _opt: SelectOption) => {
      const item = this.items[index];
      if (item && this.onItemSelectionChanged) {
        this.onItemSelectionChanged(item, index);
      }
    });

    this.select.on(SelectRenderableEvents.ITEM_SELECTED, (index: number, _opt: SelectOption) => {
      const item = this.items[index];
      if (item && this.onItemSelected) {
        this.onItemSelected(item, index);
      }
    });

    // Override handleKeyPress to allow for custom key handling
    const originalHandleKeyPress = this.select.handleKeyPress.bind(this.select);
    this.select.handleKeyPress = (key: ParsedKey | string) => {
      if (this.onKeyPress && typeof key !== "string" && this.onKeyPress(key)) {
        return true; // Key was handled by the parent
      }
      return originalHandleKeyPress(key);
    };
  }

  // --- Public API ---

  public setItems(items: MenuItem[]) {
    this.items = items;
    this.select.options = this.makeOptions();
    const selectedIndex = this.select.getSelectedIndex();
    if (selectedIndex >= items.length) {
      this.select.setSelectedIndex(items.length - 1);
    }
  }

  public getSelection(): MenuItem | undefined {
    const index = this.select.getSelectedIndex();
    return this.items[index];
  }

  public getSelectedIndex(): number {
    return this.select.getSelectedIndex();
  }

  public setSelectedIndex(index: number) {
    this.select.setSelectedIndex(index);
  }

  public focus() {
    this.select.focus();
  }

  public blur() {
    this.select.blur();
  }
}