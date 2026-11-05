'use client';

import 'leaflet/dist/leaflet.css';
import type { LatLng, Map as LeafletMap, Marker } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconAlert, IconPin } from '@/components/ui/icons';
import { journeyTexts } from '@/features/cleaning/journey-texts';

const t = journeyTexts.address;

/** Tuiles OpenStreetMap (`img-src https:` de la CSP les autorise déjà). */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>';
/**
 * Cadrage de départ sans position : le Bénin entier. Simple cadrage de carte, pas une donnée métier ;
 * la gateway ne donne pas encore le centre des communes desservies (zoom sur la commune : à valider).
 */
const COUNTRY_VIEW = { center: [9.3, 2.3] as [number, number], zoom: 7 };
/** Zoom sur un lieu placé : niveau de la rue. */
const PLACE_ZOOM = 17;
/** Déplacement du repère au clavier, en pixels de carte par appui sur une flèche. */
const KEY_STEP_PX = 12;

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

export interface PlacedPoint {
  latitude: number;
  longitude: number;
}

/** Repère : pictogramme de la charte (aucune image de Leaflet), focus visible. */
const PIN_HTML =
  '<span class="text-brand grid size-10 place-items-center drop-shadow"><svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path fill="currentColor" d="M12 22s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12Z"/><circle cx="12" cy="10" r="2.6" fill="white"/></svg></span>';

/**
 * Carte du lieu (Leaflet, tuiles OpenStreetMap), téléchargée seulement à l'étape de l'adresse quand le
 * client l'ouvre. Toucher la carte ou faire glisser le repère place le lieu ; au clavier, la carte se
 * déplace avec les flèches, « Placer le repère au centre » pose le repère, puis les flèches le déplacent.
 */
export function PlaceMap({
  location,
  onPlace,
}: {
  location: PlacedPoint | null;
  onPlace: (point: PlacedPoint) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const placeRef = useRef(onPlace);
  const putMarkerRef = useRef<((at: LatLng) => void) | null>(null);
  const initial = useRef(location);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    placeRef.current = onPlace;
  }, [onPlace]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    let observer: ResizeObserver | null = null;
    import('leaflet')
      .then((L) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        const start = initial.current;
        map = L.map(container, {
          center: start ? [start.latitude, start.longitude] : COUNTRY_VIEW.center,
          zoom: start ? PLACE_ZOOM : COUNTRY_VIEW.zoom,
          keyboard: true,
        });
        map.attributionControl.setPrefix(false);
        const tiles = L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
        // État des tuiles sur le conteneur (`data-tiles`) : visible des tests et des captures.
        tiles.on('loading', () => container.setAttribute('data-tiles', 'loading'));
        tiles.on('load', () => container.setAttribute('data-tiles', 'loaded'));
        // La carte suit la taille de son bloc (ouverture, rotation du téléphone) : sans cela, Leaflet
        // garderait la taille mesurée à sa création et laisserait des zones sans tuiles.
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => map?.invalidateSize());
          observer.observe(container);
        }
        const icon = L.divIcon({
          className:
            'rounded-full focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2',
          html: PIN_HTML,
          iconSize: [40, 40],
          iconAnchor: [20, 38],
        });
        const report = (at: LatLng) => placeRef.current({ latitude: at.lat, longitude: at.lng });

        const putMarker = (at: LatLng) => {
          if (!map) return;
          if (markerRef.current) {
            markerRef.current.setLatLng(at);
            return;
          }
          const marker = L.marker(at, {
            draggable: true,
            keyboard: true,
            icon,
            title: t.markerLabel,
            alt: t.markerLabel,
          }).addTo(map);
          marker.on('dragend', () => report(marker.getLatLng()));
          const element = marker.getElement();
          element?.setAttribute('aria-label', t.markerLabel);
          element?.addEventListener('keydown', (event) => {
            const move = ARROWS[event.key];
            if (!move || !map) return;
            event.preventDefault();
            event.stopPropagation();
            const point = map.latLngToContainerPoint(marker.getLatLng());
            const next = map.containerPointToLatLng(
              point.add(L.point(move[0] * KEY_STEP_PX, move[1] * KEY_STEP_PX)),
            );
            marker.setLatLng(next);
            report(next);
          });
          markerRef.current = marker;
        };
        putMarkerRef.current = putMarker;

        if (start) putMarker(L.latLng(start.latitude, start.longitude));
        map.on('click', (event) => {
          putMarker(event.latlng);
          report(event.latlng);
        });
        mapRef.current = map;
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
      putMarkerRef.current = null;
    };
  }, []);

  // Position venue d'ailleurs (« Me localiser », coordonnées saisies) : la carte la suit.
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map || latitude === undefined || longitude === undefined) return;
    const current = markerRef.current?.getLatLng();
    if (current && current.lat === latitude && current.lng === longitude) return;
    import('leaflet').then((L) => {
      const at = L.latLng(latitude, longitude);
      putMarkerRef.current?.(at);
      map.setView(at, Math.max(map.getZoom(), PLACE_ZOOM));
    });
  }, [status, latitude, longitude]);

  function placeAtCenter() {
    const map = mapRef.current;
    if (!map || !putMarkerRef.current) return;
    const center = map.getCenter();
    putMarkerRef.current(center);
    placeRef.current({ latitude: center.lat, longitude: center.lng });
    markerRef.current?.getElement()?.focus();
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-control border-line relative isolate z-0 overflow-hidden border">
        <div
          ref={containerRef}
          role="application"
          aria-label={t.mapLabel}
          className="bg-surface-sunken h-72 w-full sm:h-96"
        />
        {status === 'loading' ? (
          <p
            role="status"
            className="text-ink-muted absolute inset-0 z-[1000] grid place-items-center text-sm"
          >
            {t.mapLoading}
          </p>
        ) : null}
      </div>
      {status === 'error' ? (
        <p className="text-small text-danger flex items-start gap-2 font-medium">
          <IconAlert className="mt-0.5 size-4" />
          {t.mapError}
        </p>
      ) : null}
      {status === 'ready' ? (
        <Button
          variant="secondary"
          onClick={placeAtCenter}
          className="w-full whitespace-normal sm:w-auto sm:justify-self-start"
        >
          <IconPin />
          {t.placeAtCenter}
        </Button>
      ) : null}
    </div>
  );
}
