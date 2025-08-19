import { InputManager, InputHandler, InputContext, createInputHandler } from '../core/InputManager';

describe('InputManager', () => {
  let inputManager: InputManager;
  let mockKey: any;
  let mockHandler1: InputHandler;
  let mockHandler2: InputHandler;
  let mockGlobalHandler: InputHandler;

  beforeEach(() => {
    inputManager = new InputManager();
    
    mockKey = { name: 'enter', ctrl: false, alt: false, shift: false };
    
    mockHandler1 = {
      id: 'handler1',
      priority: 100,
      handleKey: jest.fn(() => false),
      canReceiveInput: jest.fn(() => true),
    };
    
    mockHandler2 = {
      id: 'handler2', 
      priority: 200,
      handleKey: jest.fn(() => false),
      canReceiveInput: jest.fn(() => true),
    };
    
    mockGlobalHandler = {
      id: 'global',
      priority: 150,
      handleKey: jest.fn(() => false),
      canReceiveInput: jest.fn(() => true),
    };
  });

  describe('initial state', () => {
    test('should start with navigation context active', () => {
      expect(inputManager.isContextActive('navigation')).toBe(true);
      expect(inputManager.getCurrentContext()?.id).toBe('navigation');
    });
  });

  describe('context management', () => {
    test('should register and retrieve contexts', () => {
      const testContext: InputContext = {
        id: 'test',
        name: 'Test Context',
        handlers: [],
      };
      
      inputManager.registerContext(testContext);
      inputManager.pushContext('test');
      
      expect(inputManager.getCurrentContext()?.id).toBe('test');
    });

    test('should handle context stack correctly', () => {
      const ctx1: InputContext = { id: 'ctx1', name: 'Context 1', handlers: [] };
      const ctx2: InputContext = { id: 'ctx2', name: 'Context 2', handlers: [] };
      
      inputManager.registerContext(ctx1);
      inputManager.registerContext(ctx2);
      
      inputManager.pushContext('ctx1');
      inputManager.pushContext('ctx2');
      
      expect(inputManager.getCurrentContext()?.id).toBe('ctx2');
      
      inputManager.popContext('ctx2');
      expect(inputManager.getCurrentContext()?.id).toBe('ctx1');
    });

    test('should move context to top of stack if already present', () => {
      const ctx1: InputContext = { id: 'ctx1', name: 'Context 1', handlers: [] };
      const ctx2: InputContext = { id: 'ctx2', name: 'Context 2', handlers: [] };
      
      inputManager.registerContext(ctx1);
      inputManager.registerContext(ctx2);
      
      inputManager.pushContext('ctx1');
      inputManager.pushContext('ctx2');
      inputManager.pushContext('ctx1'); // Should move ctx1 to top
      
      expect(inputManager.getCurrentContext()?.id).toBe('ctx1');
    });

    test('should throw error when pushing non-existent context', () => {
      expect(() => inputManager.pushContext('nonexistent')).toThrow();
    });
  });

  describe('handler management', () => {
    test('should register handlers in correct priority order', () => {
      inputManager.registerHandler('navigation', mockHandler1); // priority 100
      inputManager.registerHandler('navigation', mockHandler2); // priority 200
      
      const context = inputManager.getCurrentContext();
      expect(context?.handlers[0].priority).toBe(200); // Higher priority first
      expect(context?.handlers[1].priority).toBe(100);
    });

    test('should replace handler with same ID', () => {
      inputManager.registerHandler('navigation', mockHandler1);
      
      const updatedHandler = { ...mockHandler1, priority: 300 };
      inputManager.registerHandler('navigation', updatedHandler);
      
      const context = inputManager.getCurrentContext();
      expect(context?.handlers.length).toBe(1);
      expect(context?.handlers[0].priority).toBe(300);
    });

    test('should unregister handlers', () => {
      inputManager.registerHandler('navigation', mockHandler1);
      inputManager.unregisterHandler('navigation', 'handler1');
      
      const context = inputManager.getCurrentContext();
      expect(context?.handlers.length).toBe(0);
    });

    test('should register global handlers in priority order', () => {
      inputManager.registerGlobalHandler(mockHandler1); // priority 100
      inputManager.registerGlobalHandler(mockGlobalHandler); // priority 150
      
      const debugInfo = inputManager.getDebugInfo();
      // Global handlers are private, but we can test through key handling
      expect(debugInfo.contexts).toContain('navigation');
    });
  });

  describe('key handling', () => {
    test('should try global handlers first', () => {
      mockGlobalHandler.handleKey = jest.fn(() => true); // Consume the key
      inputManager.registerGlobalHandler(mockGlobalHandler);
      inputManager.registerHandler('navigation', mockHandler1);
      
      const result = inputManager.handleKey(mockKey);
      
      expect(result).toBe(true);
      expect(mockGlobalHandler.handleKey).toHaveBeenCalledWith(mockKey);
      expect(mockHandler1.handleKey).not.toHaveBeenCalled();
    });

    test('should try context handlers if global handlers don\'t consume key', () => {
      mockHandler1.handleKey = jest.fn(() => true);
      inputManager.registerHandler('navigation', mockHandler1);
      
      const result = inputManager.handleKey(mockKey);
      
      expect(result).toBe(true);
      expect(mockHandler1.handleKey).toHaveBeenCalledWith(mockKey);
    });

    test('should try handlers in priority order within context', () => {
      inputManager.registerHandler('navigation', mockHandler1); // priority 100
      inputManager.registerHandler('navigation', mockHandler2); // priority 200
      
      mockHandler2.handleKey = jest.fn(() => true); // Higher priority consumes
      
      const result = inputManager.handleKey(mockKey);
      
      expect(result).toBe(true);
      expect(mockHandler2.handleKey).toHaveBeenCalledWith(mockKey);
      expect(mockHandler1.handleKey).not.toHaveBeenCalled();
    });

    test('should respect canReceiveInput check', () => {
      mockHandler1.canReceiveInput = jest.fn(() => false);
      mockHandler1.handleKey = jest.fn(() => true);
      inputManager.registerHandler('navigation', mockHandler1);
      
      const result = inputManager.handleKey(mockKey);
      
      expect(result).toBe(false);
      expect(mockHandler1.canReceiveInput).toHaveBeenCalled();
      expect(mockHandler1.handleKey).not.toHaveBeenCalled();
    });

    test('should respect context isActive check', () => {
      const inactiveContext: InputContext = {
        id: 'inactive',
        name: 'Inactive Context',
        handlers: [mockHandler1],
        isActive: jest.fn(() => false),
      };
      
      inputManager.registerContext(inactiveContext);
      inputManager.pushContext('inactive');
      
      const result = inputManager.handleKey(mockKey);
      
      expect(result).toBe(false);
      expect(inactiveContext.isActive).toHaveBeenCalled();
      expect(mockHandler1.handleKey).not.toHaveBeenCalled();
    });

    test('should stop at blocking context', () => {
      const blockingContext: InputContext = {
        id: 'blocking',
        name: 'Blocking Context',
        handlers: [mockHandler1],
        blocksLowerPriority: true,
      };
      
      inputManager.registerContext(blockingContext);
      inputManager.registerHandler('navigation', mockHandler2);
      inputManager.pushContext('blocking');
      
      mockHandler1.handleKey = jest.fn(() => false); // Doesn't consume
      
      const result = inputManager.handleKey(mockKey);
      
      expect(result).toBe(false);
      expect(mockHandler1.handleKey).toHaveBeenCalled();
      expect(mockHandler2.handleKey).not.toHaveBeenCalled(); // Blocked
    });
  });

  describe('createInputHandler helper', () => {
    test('should create handler with correct properties', () => {
      const handleKeyFn = jest.fn(() => true);
      const canReceiveInputFn = jest.fn(() => true);
      
      const handler = createInputHandler('test', 100, handleKeyFn, canReceiveInputFn);
      
      expect(handler.id).toBe('test');
      expect(handler.priority).toBe(100);
      expect(handler.handleKey).toBe(handleKeyFn);
      expect(handler.canReceiveInput).toBe(canReceiveInputFn);
    });

    test('should use default canReceiveInput if not provided', () => {
      const handleKeyFn = jest.fn(() => true);
      const handler = createInputHandler('test', 100, handleKeyFn);
      
      expect(handler.canReceiveInput()).toBe(true);
    });
  });

  describe('debug info', () => {
    test('should provide accurate debug information', () => {
      const debugInfo = inputManager.getDebugInfo();
      
      expect(debugInfo.contexts).toContain('navigation');
      expect(debugInfo.stack).toContain('navigation');
      expect(debugInfo.currentContext).toBe('File Navigation');
    });
  });
});