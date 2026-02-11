const GOOGLE_MAPS_API_KEY = 'AIzaSyDQcS4nJG2pH9gW42PjI-5AZBJK-LLS8_8';

let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google?: any;
    __initGoogleMaps?: () => void;
  }
}

export function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps API key not configured'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=__initGoogleMaps`;
    script.async = true;
    script.defer = true;

    (window as any).__initGoogleMaps = () => {
      delete (window as any).__initGoogleMaps;
      resolve();
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function getApiKey(): string {
  return GOOGLE_MAPS_API_KEY;
}

export function hasApiKey(): boolean {
  return !!GOOGLE_MAPS_API_KEY;
}
