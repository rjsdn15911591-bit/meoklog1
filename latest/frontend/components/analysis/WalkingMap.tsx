'use client';

import { useEffect, useRef, useState } from 'react';
import type * as LeafletType from 'leaflet';

interface WalkingMapProps {
  route: [number, number][];
  isTracking: boolean;
}

// Lazily resolved leaflet instance (avoids SSR issues)
let _L: typeof LeafletType | null = null;
async function getL(): Promise<typeof LeafletType> {
  if (_L) return _L;
  const mod = await import('leaflet');
  _L = (mod.default as unknown as typeof LeafletType) ?? mod;
  return _L;
}

export default function WalkingMap({ route, isTracking }: WalkingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LeafletType.Map | null>(null);
  const lineRef      = useRef<LeafletType.Polyline | null>(null);
  const startRef     = useRef<LeafletType.Marker | null>(null);
  const curRef       = useRef<LeafletType.Marker | null>(null);
  const [ready, setReady] = useState(false);

  // Init map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const init = async () => {
      // Inject Leaflet CSS via link tag (avoids Next.js CSS import issues)
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const L = await getL();

      // Fix default icon paths broken by webpack
      // @ts-expect-error leaflet internal property
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const center: [number, number] = route.length > 0
        ? route[route.length - 1]
        : [37.5665, 126.978]; // Seoul fallback

      const map = L.map(containerRef.current!, {
        center,
        zoom: route.length > 0 ? 16 : 13,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      mapRef.current = map;

      if (route.length >= 2) drawRoute(L, map);
      setReady(true);
    };

    init();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      lineRef.current = null;
      startRef.current = null;
      curRef.current = null;
      setReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw route whenever it changes
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const update = async () => {
      const L   = await getL();
      const map = mapRef.current!;
      lineRef.current?.remove();
      startRef.current?.remove();
      curRef.current?.remove();
      if (route.length >= 2) {
        drawRoute(L, map);
        map.panTo(route[route.length - 1]);
      }
    };
    update();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, ready]);

  function drawRoute(L: typeof LeafletType, map: LeafletType.Map) {
    const dot = (color: string, size: number) =>
      L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

    lineRef.current = L.polyline(route, {
      color: '#5058F0', weight: 5, opacity: 0.85,
      lineCap: 'round', lineJoin: 'round',
    }).addTo(map);

    startRef.current = L.marker(route[0],
      { icon: dot('#6BAF8B', 12) }).addTo(map);
    curRef.current   = L.marker(route[route.length - 1],
      { icon: dot('#5058F0', 18) }).addTo(map);

    if (route.length >= 2)
      map.fitBounds(lineRef.current.getBounds(), { padding: [30, 30] });
  }

  const showPlaceholder = route.length < 2;

  return (
    <div className="relative h-full w-full">
      {showPlaceholder && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-surface-soft">
          <span className="text-4xl">🗺️</span>
          <p className="font-kedu text-sm text-muted text-center px-4">
            {isTracking ? 'GPS 위치를 받아오는 중이에요' : '추적을 시작하면 경로가 표시돼요'}
          </p>
          <p className="font-kedu text-[11px] text-muted/60">GPS 권한을 허용해주세요</p>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
