import {
  BoxRenderable,
  TextRenderable,
  GroupRenderable,
  InputRenderable,
  InputRenderableEvents,
  RGBA,
} from "@opentui/core";
import { OverlayInputBarOptions } from "../types";

export class OverlayInputBar extends BoxRenderable {
  private inputContainer: BoxRenderable;
  private inputLabel: TextRenderable;
  private pathInput: InputRenderable;
  private helpText: TextRenderable;
  private inputBackground: BoxRenderable;
  
  // Callbacks
  private onPathSubmit?: (path: string) => void;
  private onCommand?: (command: string, args: string[]) => void;
  private onInputCallback?: (value: string) => void;
  private onCancel?: () => void;

  private isVisible: boolean = false;

  constructor(name: string, options: OverlayInputBarOptions = {}) {
    super(name, {
      zIndex: 10, // Much higher z-index to ensure it's above backdrop
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    });

    this.onPathSubmit = options.onPathSubmit;
    this.onCommand = options.onCommand;
    this.onInputCallback = options.onInput;
    this.onCancel = options.onCancel;

    this.createOverlay(options);
    this.setupEventHandlers();
  }

  private createOverlay(options: OverlayInputBarOptions) {
    // Just create the input container - backdrop is handled by parent
    const containerWidth = typeof options.width === "number" ? options.width : 60;
    const containerHeight = typeof options.height === "number" ? options.height : 8;

    this.inputContainer = new BoxRenderable("overlay-input-container", {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: RGBA.fromInts(17, 24, 39, 160),
      borderStyle: "single",
      borderColor: "#3b82f6",
      flexDirection: "column",
      padding: 1,
    });
    this.add(this.inputContainer);
    this.border = false;

    // Label
    this.inputLabel = new TextRenderable("overlay-label", {
      content: "Search & Navigate",
      fg: "#e2e8f0",
      bg: "transparent",
      height: 1,
    });
    this.inputContainer.add(this.inputLabel);

    // Input field
    this.pathInput = new InputRenderable("overlay-input", {
      width: "auto",
      height: 1,
      placeholder: options.placeholder || "Type path, filename, or /command...",
      backgroundColor: "#0f172a",
      focusedBackgroundColor: "#1e293b",
      textColor: "#e5e7eb",
      focusedTextColor: "#ffffff",
      placeholderColor: "#64748b",
      cursorColor: "#3b82f6",
      maxLength: 2048,
      flexGrow: 1,
      marginTop: 1,
    });
    this.inputContainer.add(this.pathInput);

    // Help text
    this.helpText = new TextRenderable("overlay-help", {
      content: "Enter: execute | Esc: cancel | /command for actions",
      fg: "#94a3b8",
      bg: "transparent",
      height: 1,
      marginTop: 1,
    });
    this.inputContainer.add(this.helpText);


  }

  private setupEventHandlers() {
    this.pathInput.on(InputRenderableEvents.INPUT, (value: string) => {
      if (this.onInputCallback) {
        this.onInputCallback(value);
      }
      
      // Update help text based on input
      if (value.startsWith('/')) {
        this.helpText.content = "Command mode - type /help for available commands";
      } else if (value.includes('/') || value.includes('\\')) {
        this.helpText.content = "Path mode - navigating to directory or file";
      } else {
        this.helpText.content = "Search mode - finding files by name";
      }
    });

    this.pathInput.on(InputRenderableEvents.CHANGE, (value: string) => {
      this.handleSubmit(value);
    });
  }

  private handleSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      this.hide();
      return;
    }

    // Check if it's a command (starts with /)
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);
      
      if (this.onCommand) {
        this.onCommand(command, args);
      }
    } else {
      // It's a path or search term
      if (this.onPathSubmit) {
        this.onPathSubmit(trimmed);
      }
    }

    // Clear and hide after submit
    this.pathInput.value = "";
    this.hide();
  }

  // Public API - visibility now managed by parent
  public show() {
    this.isVisible = true;
    this.pathInput.focus();
    this.resetHelp();
  }

  public hide() {
    this.isVisible = false;
    this.pathInput.blur();
    this.pathInput.value = "";
    if (this.onCancel) {
      this.onCancel();
    }
  }

  public toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public get isShown(): boolean {
    return this.isVisible;
  }

  public setValue(value: string) {
    this.pathInput.value = value;
  }

  public getValue(): string {
    return this.pathInput.value;
  }

  public setPlaceholder(placeholder: string) {
    this.pathInput.placeholder = placeholder;
  }

  public setLabel(label: string) {
    this.inputLabel.content = label;
  }

  public setHelpText(text: string) {
    this.helpText.content = text;
  }

  private resetHelp() {
    this.helpText.content = "Enter: execute | Esc: cancel | /command for actions";
  }

  // Handle escape key to close overlay
  public handleKeyPress(key: any): boolean {
    if (!this.isVisible) return false;

    if (key.name === "escape") {
      this.hide();
      return true;
    }

    // Let the input handle other keys when focused
    return false;
  }

  // Focus management
  public focus() {
    if (this.isVisible) {
      this.pathInput.focus();
    }
  }

  public blur() {
    this.pathInput.blur();
  }

  public get focused(): boolean {
    return this.pathInput.focused && this.isVisible;
  }
}