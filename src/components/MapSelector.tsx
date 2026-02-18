import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, AlertCircle, Crosshair, Maximize2, Minimize2 } from 'lucide-react';

import { loadGoogleMaps, hasApiKey } from '@/lib/googleMaps';
import type { LocationData } from '@/types/geotag';

interface MapSelectorProps {
  location: LocationData | null;
  onLocationChange: (loc: LocationData) => void;
}

export default function MapSelector({ location, onLocationChange }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      // Trigger map resize after DOM update
      setTimeout(() => {
        if (mapInstanceRef.current) {
          const g = (window as any).google;
          g.maps.event.trigger(mapInstanceRef.current, 'resize');
          // Re-center on current marker position
          if (markerRef.current) {
            mapInstanceRef.current.panTo(markerRef.current.getPosition());
          }
        }
      }, 50);
      return next;
    });
  }, []);

  // Close fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const g = (window as any).google;
        const geocoder = new g.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });

        if (result.results[0]) {
          const components = result.results[0].address_components;
          let district = '';
          let city = '';
          let province = '';
          let country = '';
          let countryCode = '';

          for (const comp of components) {
            // Prioritize Kecamatan (Level 3)
            if (comp.types.includes('administrative_area_level_3')) {
              district = comp.long_name;
            }
            // Fallback to Kelurahan/Desa (Level 4) or Sublocality if Level 3 missing
            if (!district && (comp.types.includes('sublocality_level_1') || comp.types.includes('locality'))) {
              district = comp.long_name;
            }

            if (comp.types.includes('administrative_area_level_2')) {
              city = comp.long_name;
            }
            if (comp.types.includes('administrative_area_level_1')) {
              province = comp.long_name;
            }
            if (comp.types.includes('country')) {
              country = comp.long_name;
              countryCode = comp.short_name;
            }
          }

          if (!district && city) district = city;
          if (!district) district = components[0]?.long_name || '';


          let formattedAddress = result.results[0].formatted_address;
          // Remove Plus Code if present (e.g. "9WQM+45M, ")
          // Pattern: 4+ alphanumeric, +, 2+ alphanumeric, followed by comma or space
          const plusCodeRegex = /^[A-Z0-9]{4,}\+[A-Z0-9]{2,}[, ]\s*/;
          formattedAddress = formattedAddress.replace(plusCodeRegex, '');

          onLocationChange({
            lat,
            lng,
            district,
            city,
            province,
            country,
            countryCode,
            fullAddress: formattedAddress,
          });
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        // Fallback: set location with coordinates even if geocoding fails
        onLocationChange({
          lat,
          lng,
          district: 'Unknown',
          city: '',
          province: 'Unknown',
          country: 'Indonesia',
          countryCode: 'ID',
          fullAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        });
      }
    },
    [onLocationChange]
  );

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current && markerRef.current) {
          const pos = { lat: latitude, lng: longitude };
          mapInstanceRef.current.panTo(pos);
          mapInstanceRef.current.setZoom(16);
          markerRef.current.setPosition(pos);
          reverseGeocode(latitude, longitude);
        }
      },
      (error) => {
        console.error('Error getting location', error);
        alert('Unable to retrieve your location');
      }
    );
  }, [reverseGeocode]);

  useEffect(() => {
    if (!hasApiKey()) {
      setError('Set VITE_GOOGLE_MAPS_API_KEY di file .env');
      return;
    }

    loadGoogleMaps()
      .then(() => {
        setMapLoaded(true);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const g = (window as any).google;

    const defaultCenter = { lat: -7.597110, lng: 110.949835 };
    const center = location ? { lat: location.lat, lng: location.lng } : defaultCenter;

    const map = new g.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
        { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#17263c' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
      ],
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      gestureHandling: 'greedy',

    });

    mapInstanceRef.current = map;

    const marker = new g.maps.Marker({
      position: center,
      map,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new g.maps.Size(40, 40),
      },
    });
    markerRef.current = marker;

    // Custom "Pan to Current Location" button on the map
    const locationButton = document.createElement('button');
    locationButton.type = 'button';
    locationButton.title = 'Lokasi Saat Ini';
    locationButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`;
    Object.assign(locationButton.style, {
      background: 'rgba(30, 30, 30, 0.85)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      padding: '8px',
      margin: '10px',
      cursor: 'pointer',
      color: '#22c55e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      transition: 'background 0.2s, transform 0.15s',
    });
    locationButton.addEventListener('mouseenter', () => {
      locationButton.style.background = 'rgba(50, 50, 50, 0.95)';
      locationButton.style.transform = 'scale(1.05)';
    });
    locationButton.addEventListener('mouseleave', () => {
      locationButton.style.background = 'rgba(30, 30, 30, 0.85)';
      locationButton.style.transform = 'scale(1)';
    });
    locationButton.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const pos = { lat: latitude, lng: longitude };
          map.panTo(pos);
          map.setZoom(16);
          marker.setPosition(pos);
          reverseGeocode(latitude, longitude);
        },
        (err) => {
          console.error('Error getting location', err);
          alert('Unable to retrieve your location');
        }
      );
    });
    map.controls[g.maps.ControlPosition.TOP_RIGHT].push(locationButton);

    // Custom "Toggle Full Screen" button on the map
    const fullscreenButton = document.createElement('button');
    fullscreenButton.type = 'button';
    fullscreenButton.title = 'Layar Penuh';
    const maximizeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
    const minimizeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
    fullscreenButton.innerHTML = maximizeSvg;
    Object.assign(fullscreenButton.style, {
      background: 'rgba(30, 30, 30, 0.85)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      padding: '8px',
      margin: '10px',
      cursor: 'pointer',
      color: '#22c55e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      transition: 'background 0.2s, transform 0.15s',
    });
    fullscreenButton.addEventListener('mouseenter', () => {
      fullscreenButton.style.background = 'rgba(50, 50, 50, 0.95)';
      fullscreenButton.style.transform = 'scale(1.05)';
    });
    fullscreenButton.addEventListener('mouseleave', () => {
      fullscreenButton.style.background = 'rgba(30, 30, 30, 0.85)';
      fullscreenButton.style.transform = 'scale(1)';
    });
    fullscreenButton.addEventListener('click', () => {
      const container = mapRef.current?.closest('.card-elevated') as HTMLElement | null;
      if (!container) return;
      const isCurrentlyFull = container.classList.contains('map-fullscreen');
      if (isCurrentlyFull) {
        container.classList.remove('map-fullscreen');
        fullscreenButton.innerHTML = maximizeSvg;
        fullscreenButton.title = 'Layar Penuh';
        if (mapRef.current) mapRef.current.style.flex = '';
        if (mapRef.current) mapRef.current.style.height = '';
      } else {
        container.classList.add('map-fullscreen');
        fullscreenButton.innerHTML = minimizeSvg;
        fullscreenButton.title = 'Keluar Layar Penuh';
        if (mapRef.current) mapRef.current.style.flex = '1';
      }
      // Trigger map resize after DOM update
      setTimeout(() => {
        g.maps.event.trigger(map, 'resize');
        if (marker.getPosition()) map.panTo(marker.getPosition());
      }, 50);
    });
    map.controls[g.maps.ControlPosition.TOP_LEFT].push(fullscreenButton);

    map.addListener('click', (e: any) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition({ lat, lng });
        reverseGeocode(lat, lng);
      }
    });

    // Setup autocomplete + fallback geocoder search
    if (searchRef.current) {
      // Try Places Autocomplete
      try {
        if (g.maps.places?.Autocomplete) {
          const autocomplete = new g.maps.places.Autocomplete(searchRef.current, {
            fields: ['geometry', 'formatted_address', 'address_components'],
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              map.panTo({ lat, lng });
              map.setZoom(15);
              marker.setPosition({ lat, lng });
              reverseGeocode(lat, lng);
            }
          });
        } else {
          console.warn('Places Autocomplete not available, using Geocoder fallback');
        }
      } catch (err) {
        console.warn('Places Autocomplete failed to initialize:', err);
      }

      // Fallback: Search via Geocoder on Enter key
      const inputEl = searchRef.current;
      const handleSearchKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = inputEl.value.trim();
          if (!query) return;

          const geocoder = new g.maps.Geocoder();
          geocoder.geocode({ address: query }, (results: any[], status: string) => {
            if (status === 'OK' && results[0]?.geometry?.location) {
              const lat = results[0].geometry.location.lat();
              const lng = results[0].geometry.location.lng();
              map.panTo({ lat, lng });
              map.setZoom(15);
              marker.setPosition({ lat, lng });
              reverseGeocode(lat, lng);
            } else {
              console.warn('Geocoder search failed:', status);
            }
          });
        }
      };
      inputEl.addEventListener('keydown', handleSearchKeydown);
    }

    // Initial geocode
    if (!location) {
      reverseGeocode(defaultCenter.lat, defaultCenter.lng);
    }

    return () => {
      g.maps.event.clearInstanceListeners(map);
    };
  }, [mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="card-elevated p-4 animate-fade-in">
        <h3 className="section-title flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Pilih Lokasi
        </h3>
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-foreground font-medium">Google Maps API Key Diperlukan</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <code className="block mt-2 text-xs bg-secondary rounded px-2 py-1 text-primary font-mono">
            VITE_GOOGLE_MAPS_API_KEY=your_key
          </code>
        </div>

        {/* Manual coordinate input fallback */}
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">Atau masukkan koordinat manual:</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              className="input-dark rounded-lg px-3 py-2 text-sm"
              defaultValue={location?.lat ?? -7.611948}
              onChange={(e) => {
                const lat = parseFloat(e.target.value);
                if (!isNaN(lat)) {
                  onLocationChange({
                    lat,
                    lng: location?.lng ?? 110.933013,
                    district: location?.district || 'Karanganyar',
                    city: location?.city || 'Kabupaten Karanganyar',
                    province: location?.province || 'Jawa Tengah',
                    country: location?.country || 'Indonesia',
                    countryCode: location?.countryCode || 'ID',
                    fullAddress: location?.fullAddress || 'Karanganyar, Jawa Tengah, Indonesia',
                  });
                }
              }}
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              className="input-dark rounded-lg px-3 py-2 text-sm"
              defaultValue={location?.lng ?? 110.933013}
              onChange={(e) => {
                const lng = parseFloat(e.target.value);
                if (!isNaN(lng)) {
                  onLocationChange({
                    ...location!,
                    lng,
                  });
                }
              }}
            />
          </div>

          <input
            type="text"
            placeholder="Kecamatan"
            className="w-full input-dark rounded-lg px-3 py-2 text-sm"
            defaultValue={location?.district || 'Kecamatan Karanganyar'}
            onChange={(e) => {
              if (location) onLocationChange({ ...location, district: e.target.value });
            }}
          />
          <input
            type="text"
            placeholder="Provinsi"
            className="w-full input-dark rounded-lg px-3 py-2 text-sm"
            defaultValue={location?.province || 'Jawa Tengah'}
            onChange={(e) => {
              if (location) onLocationChange({ ...location, province: e.target.value });
            }}
          />
          <input
            type="text"
            placeholder="Alamat lengkap"
            className="w-full input-dark rounded-lg px-3 py-2 text-sm"
            defaultValue={location?.fullAddress || ''}
            onChange={(e) => {
              if (location) onLocationChange({ ...location, fullAddress: e.target.value });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card-elevated p-4 animate-fade-in transition-all duration-300 ${isFullscreen
        ? 'fixed inset-0 z-[9999] rounded-none flex flex-col bg-background/95 backdrop-blur-sm'
        : ''
        }`}
    >

      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title flex items-center gap-2 mb-0">
          <MapPin className="w-4 h-4 text-primary" />
          Pilih Lokasi
        </h3>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Cari lokasi..."
            className="w-full input-dark rounded-lg pl-9 pr-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <div
        ref={mapRef}
        className={`w-full rounded-lg overflow-hidden border border-border transition-all duration-300 ${isFullscreen ? 'flex-1' : 'h-52'
          }`}
      />

      {location && (
        <div className="mt-3 space-y-1 text-xs">
          <p className="text-foreground font-medium">{location.district}, {location.province}</p>
          <p className="text-muted-foreground truncate">{location.fullAddress}</p>
          <p className="text-primary font-mono">
            {location.lat.toFixed(6)}°, {location.lng.toFixed(6)}°
          </p>
        </div>
      )}
    </div>
  );
}
