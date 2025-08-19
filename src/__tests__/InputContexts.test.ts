import { createNavigationBlocker, createHotkeyHandler, createComponentHandler, createEscapeHandler } from '../core/InputContexts';

describe('InputContexts', () => {
  let mockKey: any;

  beforeEach(() => {
    mockKey = { name: 'enter', ctrl: false, alt: false, shift: false };
  });

  describe('createNavigationBlocker', () => {
    test('should block navigation keys when active', () => {
      const isActive = jest.fn(() => true);
      const blocker = createNavigationBlocker('test-blocker', isActive);
      
      // Test various navigation keys
      expect(blocker.handleKey({ name: 'up' })).toBe(true);
      expect(blocker.handleKey({ name: 'down' })).toBe(true);
      expect(blocker.handleKey({ name: 'left' })).toBe(true);
      expect(blocker.handleKey({ name: 'right' })).toBe(true);
      expect(blocker.handleKey({ name: 'enter' })).toBe(true);
      expect(blocker.handleKey({ name: 'space' })).toBe(true);
      expect(blocker.handleKey({ name: 'tab' })).toBe(true);
      
      // isActive is called through canReceiveInput, not directly in handleKey
      expect(blocker.canReceiveInput()).toBe(true);
      expect(isActive).toHaveBeenCalled();
    });

    test('should not block non-navigation keys', () => {
      const isActive = jest.fn(() => true);
      const blocker = createNavigationBlocker('test-blocker', isActive);
      
      expect(blocker.handleKey({ name: 'a' })).toBe(false);
      expect(blocker.handleKey({ name: 'escape' })).toBe(false);
    });

    test('should not block when inactive', () => {
      const isActive = jest.fn(() => false);
      const blocker = createNavigationBlocker('test-blocker', isActive);
      
      expect(blocker.canReceiveInput()).toBe(false);
    });
  });

  describe('createHotkeyHandler', () => {
    test('should handle matching hotkeys', () => {
      const action1 = jest.fn();
      const action2 = jest.fn();
      
      const hotkeys = [
        { key: 'f', ctrl: true, action: action1 },
        { key: 'escape', action: action2 },
      ];
      
      const handler = createHotkeyHandler('hotkey-handler', hotkeys);
      
      // Test Ctrl+F
      expect(handler.handleKey({ name: 'f', ctrl: true })).toBe(true);
      expect(action1).toHaveBeenCalled();
      
      // Test Escape
      expect(handler.handleKey({ name: 'escape' })).toBe(true);
      expect(action2).toHaveBeenCalled();
    });

    test('should not handle non-matching hotkeys', () => {
      const action = jest.fn();
      const hotkeys = [{ key: 'f', ctrl: true, action }];
      const handler = createHotkeyHandler('hotkey-handler', hotkeys);
      
      // F without Ctrl
      expect(handler.handleKey({ name: 'f' })).toBe(false);
      expect(action).not.toHaveBeenCalled();
      
      // Ctrl+G instead of Ctrl+F
      expect(handler.handleKey({ name: 'g', ctrl: true })).toBe(false);
      expect(action).not.toHaveBeenCalled();
    });

    test('should handle complex modifier combinations', () => {
      const action = jest.fn();
      const hotkeys = [{ key: 's', ctrl: true, shift: true, alt: false, action }];
      const handler = createHotkeyHandler('hotkey-handler', hotkeys);
      
      // Correct combination
      expect(handler.handleKey({ name: 's', ctrl: true, shift: true, alt: false })).toBe(true);
      expect(action).toHaveBeenCalled();
      
      action.mockClear();
      
      // Wrong combination (missing shift)
      expect(handler.handleKey({ name: 's', ctrl: true, shift: false, alt: false })).toBe(false);
      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('createComponentHandler', () => {
    test('should delegate to component handleKeyPress method', () => {
      const mockComponent = {
        handleKeyPress: jest.fn(() => true),
      };
      const isActive = jest.fn(() => true);
      
      const handler = createComponentHandler('comp-handler', mockComponent, isActive);
      
      expect(handler.handleKey(mockKey)).toBe(true);
      expect(mockComponent.handleKeyPress).toHaveBeenCalledWith(mockKey);
    });

    test('should handle component without handleKeyPress method', () => {
      const mockComponent = {}; // No handleKeyPress method
      const isActive = jest.fn(() => true);
      
      const handler = createComponentHandler('comp-handler', mockComponent, isActive);
      
      expect(handler.handleKey(mockKey)).toBe(false);
    });

    test('should respect isActive check', () => {
      const mockComponent = {
        handleKeyPress: jest.fn(() => true),
      };
      const isActive = jest.fn(() => false);
      
      const handler = createComponentHandler('comp-handler', mockComponent, isActive);
      
      expect(handler.canReceiveInput()).toBe(false);
    });
  });

  describe('createEscapeHandler', () => {
    test('should handle escape key', () => {
      const onEscape = jest.fn();
      const isActive = jest.fn(() => true);
      
      const handler = createEscapeHandler('escape-handler', onEscape, isActive);
      
      expect(handler.handleKey({ name: 'escape' })).toBe(true);
      expect(onEscape).toHaveBeenCalled();
    });

    test('should not handle non-escape keys', () => {
      const onEscape = jest.fn();
      const isActive = jest.fn(() => true);
      
      const handler = createEscapeHandler('escape-handler', onEscape, isActive);
      
      expect(handler.handleKey({ name: 'enter' })).toBe(false);
      expect(onEscape).not.toHaveBeenCalled();
    });

    test('should respect isActive check', () => {
      const onEscape = jest.fn();
      const isActive = jest.fn(() => false);
      
      const handler = createEscapeHandler('escape-handler', onEscape, isActive);
      
      expect(handler.canReceiveInput()).toBe(false);
    });
  });
});