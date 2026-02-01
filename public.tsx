
// Service worker registration module with safety checks for sandbox environments
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Prevent registration errors on cross-origin preview domains
      const isLocalhost = Boolean(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '[::1]' ||
        window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
      );

      // Only attempt registration if the origins are compatible or in localhost
      const canRegister = isLocalhost || window.location.protocol === 'https:';

      if (canRegister) {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        }).catch((error) => {
          // Silent fail for origin mismatch in specific dev environments to keep console clean
          if (error.message.includes('origin')) {
            console.debug('Service Worker bypassed due to origin mismatch');
          } else {
            console.error('Service Worker registration failed:', error);
          }
        });
      }
    });
  }
};
