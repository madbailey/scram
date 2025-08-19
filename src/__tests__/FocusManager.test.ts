import { FocusManager, FocusableComponent } from '../core/FocusManager';

describe('FocusManager', () => {
  let focusManager: FocusManager;
  let mockComponents: Record<string, any>;

  beforeEach(() => {
    focusManager = new FocusManager();
    mockComponents = {
      navigator: {
        focus: jest.fn(),
        blur: jest.fn(),
      },
      preview: {
        focus: jest.fn(),
        blur: jest.fn(),
      },
      overlay: {
        focus: jest.fn(),
        blur: jest.fn(),
      },
    };

    // Register mock components
    Object.entries(mockComponents).forEach(([name, component]) => {
      focusManager.setComponent(name as FocusableComponent, component);
    });
  });

  describe('initial state', () => {
    test('should start with navigator focused', () => {
      expect(focusManager.getCurrentFocus()).toBe('navigator');
    });

    test('should start with overlay not visible', () => {
      expect(focusManager.isOverlayVisible()).toBe(false);
    });
  });

  describe('setFocus', () => {
    test('should change focus to specified component', () => {
      focusManager.setFocus('preview');
      expect(focusManager.getCurrentFocus()).toBe('preview');
    });

    test('should call blur on all components and focus on target', () => {
      focusManager.setFocus('preview');
      
      expect(mockComponents.navigator.blur).toHaveBeenCalled();
      expect(mockComponents.preview.blur).toHaveBeenCalled();
      expect(mockComponents.overlay.blur).toHaveBeenCalled();
      expect(mockComponents.preview.focus).toHaveBeenCalled();
    });

    test('should not change focus if overlay is visible and target is not overlay', () => {
      focusManager.setOverlayVisible(true);
      focusManager.setFocus('preview');
      
      expect(focusManager.getCurrentFocus()).toBe('overlay');
    });
  });

  describe('overlay management', () => {
    test('should set overlay visible and focus to overlay', () => {
      focusManager.setOverlayVisible(true);
      
      expect(focusManager.isOverlayVisible()).toBe(true);
      expect(focusManager.getCurrentFocus()).toBe('overlay');
    });

    test('should hide overlay and return focus to navigator', () => {
      focusManager.setOverlayVisible(true);
      focusManager.setOverlayVisible(false);
      
      expect(focusManager.isOverlayVisible()).toBe(false);
      expect(focusManager.getCurrentFocus()).toBe('navigator');
    });

    test('should return focus to previous component when overlay is hidden', () => {
      focusManager.setFocus('preview');
      focusManager.setOverlayVisible(true);
      focusManager.setOverlayVisible(false);
      
      expect(focusManager.getCurrentFocus()).toBe('navigator'); // Default return
    });
  });

  describe('tab navigation', () => {
    test('should cycle to next component', () => {
      expect(focusManager.getCurrentFocus()).toBe('navigator');
      
      focusManager.tabToNext();
      expect(focusManager.getCurrentFocus()).toBe('preview');
      
      focusManager.tabToNext();
      expect(focusManager.getCurrentFocus()).toBe('navigator'); // Wraps around
    });

    test('should cycle to previous component', () => {
      expect(focusManager.getCurrentFocus()).toBe('navigator');
      
      focusManager.tabToPrevious();
      expect(focusManager.getCurrentFocus()).toBe('preview'); // Wraps around
      
      focusManager.tabToPrevious();
      expect(focusManager.getCurrentFocus()).toBe('navigator');
    });

    test('should not change focus when overlay is visible', () => {
      focusManager.setOverlayVisible(true);
      
      focusManager.tabToNext();
      expect(focusManager.getCurrentFocus()).toBe('overlay');
      
      focusManager.tabToPrevious();
      expect(focusManager.getCurrentFocus()).toBe('overlay');
    });
  });

  describe('input routing helpers', () => {
    test('canNavigatorReceiveInput should return true only when navigator is focused and overlay is not visible', () => {
      expect(focusManager.canNavigatorReceiveInput()).toBe(true);
      
      focusManager.setFocus('preview');
      expect(focusManager.canNavigatorReceiveInput()).toBe(false);
      
      focusManager.setFocus('navigator');
      focusManager.setOverlayVisible(true);
      expect(focusManager.canNavigatorReceiveInput()).toBe(false);
    });

    test('canPreviewReceiveInput should return true only when preview is focused and overlay is not visible', () => {
      expect(focusManager.canPreviewReceiveInput()).toBe(false);
      
      focusManager.setFocus('preview');
      expect(focusManager.canPreviewReceiveInput()).toBe(true);
      
      focusManager.setOverlayVisible(true);
      expect(focusManager.canPreviewReceiveInput()).toBe(false);
    });

    test('canOverlayReceiveInput should return true only when overlay is visible', () => {
      expect(focusManager.canOverlayReceiveInput()).toBe(false);
      
      focusManager.setOverlayVisible(true);
      expect(focusManager.canOverlayReceiveInput()).toBe(true);
    });
  });

  describe('debug info', () => {
    test('should provide accurate debug information', () => {
      const debugInfo = focusManager.getDebugInfo();
      
      expect(debugInfo).toEqual({
        currentFocus: 'navigator',
        overlayVisible: false,
        effectiveFocus: 'navigator',
      });
      
      focusManager.setFocus('preview');
      focusManager.setOverlayVisible(true);
      
      const debugInfo2 = focusManager.getDebugInfo();
      expect(debugInfo2).toEqual({
        currentFocus: 'overlay', // Focus changes to overlay when overlay is visible
        overlayVisible: true,
        effectiveFocus: 'overlay',
      });
    });
  });
});