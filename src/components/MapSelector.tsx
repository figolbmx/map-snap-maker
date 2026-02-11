import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, AlertCircle } from 'lucide-react';
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
            if (comp.types.includes('sublocality_level_1') || comp.types.includes('locality')) {
              if (!district) district = comp.long_name;
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

          onLocationChange({
            lat,
            lng,
            district,
            city,
            province,
            country,
            countryCode,
            fullAddress: result.results[0].formatted_address,
          });
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    },
    [onLocationChange]
  );

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

    const defaultCenter = { lat: -7.611948, lng: 110.933013 };
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
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
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

    map.addListener('click', (e: any) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition({ lat, lng });
        reverseGeocode(lat, lng);
      }
    });

    // Setup autocomplete
    if (searchRef.current) {
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
            placeholder="Nama Kecamatan"
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
    <div className="card-elevated p-4 animate-fade-in">
      <h3 className="section-title flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Pilih Lokasi
      </h3>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Cari lokasi..."
          className="w-full input-dark rounded-lg pl-9 pr-3 py-2.5 text-sm"
        />
      </div>

      <div ref={mapRef} className="w-full h-52 rounded-lg overflow-hidden border border-border" />

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
