import { type ParsedKey } from "@opentui/core";

// Input handler interface that components can implement
export interface InputHandler {
  id: string;
  priority: number; // Higher priority = handled first
  handleKey(key: ParsedKey): boolean; // Return true if key was consumed
  canReceiveInput(): boolean; // Return true if this handler should receive input
}

// Input context for managing different input modes
export interface InputContext {
  id: string;
  name: string;
  handlers: InputHandler[];
  blocksLowerPriority?: boolean; // If true, blocks all lower priority contexts
  isActive?: () => boolean; // Function to check if this context should be active
}

export class InputManager {
  private contexts: Map<string, InputContext> = new Map();
  private contextStack: string[] = []; // Stack of active contexts (top = highest priority)
  private globalHandlers: InputHandler[] = [];

  constructor() {
    // Create default context for normal navigation - will be configured in navigator
    this.registerContext({
      id: "navigation", 
      name: "File Navigation",
      handlers: [],
      blocksLowerPriority: false,
    });
    
    this.pushContext("navigation");
  }

  // Context management
  registerContext(context: InputContext) {
    this.contexts.set(context.id, context);
  }

  pushContext(contextId: string) {
    if (!this.contexts.has(contextId)) {
      throw new Error(`Context '${contextId}' not found`);
    }
    
    // Remove from stack if already present
    this.contextStack = this.contextStack.filter(id => id !== contextId);
    // Add to top of stack
    this.contextStack.push(contextId);
  }

  popContext(contextId: string) {
    this.contextStack = this.contextStack.filter(id => id !== contextId);
  }

  getCurrentContext(): InputContext | null {
    if (this.contextStack.length === 0) return null;
    const topContextId = this.contextStack[this.contextStack.length - 1];
    return this.contexts.get(topContextId) || null;
  }

  isContextActive(contextId: string): boolean {
    return this.contextStack.includes(contextId);
  }

  // Handler management
  registerHandler(contextId: string, handler: InputHandler) {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context '${contextId}' not found`);
    }
    
    // Remove if already exists
    context.handlers = context.handlers.filter(h => h.id !== handler.id);
    // Add and sort by priority (highest first)
    context.handlers.push(handler);
    context.handlers.sort((a, b) => b.priority - a.priority);
  }

  unregisterHandler(contextId: string, handlerId: string) {
    const context = this.contexts.get(contextId);
    if (context) {
      context.handlers = context.handlers.filter(h => h.id !== handlerId);
    }
  }

  registerGlobalHandler(handler: InputHandler) {
    // Remove if already exists
    this.globalHandlers = this.globalHandlers.filter(h => h.id !== handler.id);
    // Add and sort by priority (highest first)
    this.globalHandlers.push(handler);
    this.globalHandlers.sort((a, b) => b.priority - a.priority);
  }

  unregisterGlobalHandler(handlerId: string) {
    this.globalHandlers = this.globalHandlers.filter(h => h.id !== handlerId);
  }

  // Main input handling
  handleKey(key: ParsedKey): boolean {
    // First, try global handlers (like hotkeys)
    for (const handler of this.globalHandlers) {
      if (handler.canReceiveInput() && handler.handleKey(key)) {
        return true;
      }
    }

    // Then, process contexts from top to bottom of stack
    for (let i = this.contextStack.length - 1; i >= 0; i--) {
      const contextId = this.contextStack[i];
      const context = this.contexts.get(contextId);
      
      if (!context) continue;

      // Check if context is active
      if (context.isActive && !context.isActive()) {
        continue;
      }

      // Try all handlers in this context
      for (const handler of context.handlers) {
        if (handler.canReceiveInput() && handler.handleKey(key)) {
          return true;
        }
      }

      // If this context blocks lower priority contexts, stop here
      if (context.blocksLowerPriority) {
        break;
      }
    }

    return false;
  }

  // Debugging
  getDebugInfo() {
    return {
      contexts: Array.from(this.contexts.keys()),
      stack: [...this.contextStack],
      currentContext: this.getCurrentContext()?.name || "none",
    };
  }
}

// Singleton instance
export const inputManager = new InputManager();

// Helper function to create simple input handlers
export function createInputHandler(
  id: string,
  priority: number,
  handleKey: (key: ParsedKey) => boolean,
  canReceiveInput: () => boolean = () => true
): InputHandler {
  return {
    id,
    priority,
    handleKey,
    canReceiveInput,
  };
}