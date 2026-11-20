const ReactNative = require('react-native');

try {
  Object.defineProperty(ReactNative, 'InteractionManager', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: {
      runAfterInteractions: (task) => {
        const timer = setTimeout(() => {
          if (typeof task === 'function') {
            task();
          } else if (task && typeof task.gen === 'function') {
            task.gen();
          }
        }, 0);
        return {
          then: (cb) => Promise.resolve().then(cb),
          done: (cb) => Promise.resolve().then(cb),
          cancel: () => clearTimeout(timer),
        };
      },
      createInteractionHandle: () => 1,
      clearInteractionHandle: () => {},
      setDeadline: () => {},
    },
  });
} catch {
  // Ignore if property cannot be redefined
}

const { registerRootComponent } = require('expo');
const App = require('./App').default;

registerRootComponent(App);
