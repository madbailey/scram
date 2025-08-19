import { type ParsedKey } from "@opentui/core";
import { inputManager, createInputHandler } from "./InputManager";

// Define common input contexts and their handlers

// Overlay context - blocks all lower priority input when active 
// Will be configured with isActive function in navigator

// Modal context - for dialogs, confirmations, etc.
inputManager.registerContext({
  id: "modal", 
  name: "Modal Dialog",
  handlers: [],
  blocksLowerPriority: true,
});

// Helper functions for common patterns

// Create a navigation blocker handler
export function createNavigationBlocker(
  id: string,
  isActive: () => boolean,
  priority: number = 100
) {
  return createInputHandler(
    id,
    priority,
    (key: ParsedKey) => {
      // Block common navigation keys
      const navigationKeys = [
        'up', 'down', 'left', 'right', 
        'enter', 'return', 'space',
        'pageup', 'pagedown', 'home', 'end',
        'tab'
      ];
      
      return navigationKeys.includes(key.name);
    },
    isActive
  );
}

// Create a hotkey handler 
export function createHotkeyHandler(
  id: string,
  hotkeys: Array<{ key: string, ctrl?: boolean, alt?: boolean, shift?: boolean, action: () => void }>,
  isActive: () => boolean = () => true,
  priority: number = 200
) {
  return createInputHandler(
    id,
    priority,
    (key: ParsedKey) => {
      for (const hotkey of hotkeys) {
        const keyMatches = key.name === hotkey.key;
        const ctrlMatches = (hotkey.ctrl || false) === (key.ctrl || false);
        const altMatches = (hotkey.alt || false) === (key.alt || false);
        const shiftMatches = (hotkey.shift || false) === (key.shift || false);
        
        if (keyMatches && ctrlMatches && altMatches && shiftMatches) {
          hotkey.action();
          return true;
        }
      }
      return false;
    },
    isActive
  );
}

// Create a component input handler that delegates to a component
export function createComponentHandler(
  id: string,
  component: { handleKeyPress?: (key: ParsedKey) => boolean },
  isActive: () => boolean,
  priority: number = 50
) {
  return createInputHandler(
    id,
    priority,
    (key: ParsedKey) => {
      if (component.handleKeyPress) {
        return component.handleKeyPress(key);
      }
      return false;
    },
    isActive
  );
}

// Escape key handler - useful for closing overlays/modals
export function createEscapeHandler(
  id: string,
  onEscape: () => void,
  isActive: () => boolean,
  priority: number = 150
) {
  return createInputHandler(
    id,
    priority,
    (key: ParsedKey) => {
      if (key.name === 'escape') {
        onEscape();
        return true;
      }
      return false;
    },
    isActive
  );
}