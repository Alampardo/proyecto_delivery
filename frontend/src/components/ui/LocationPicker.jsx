import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Arregla las rutas de los íconos por defecto de Leaflet (rotas al empaquetar con Vite)
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const LA_PAZ_CENTER = [-16.5, -68.15]

// El GPS del navegador entrega hasta 15+ decimales; el backend solo admite 6
// (suficiente precisión: ~11cm). Redondear evita el error "no más de 9 dígitos".
const round6 = (n) => Math.round(n * 1e6) / 1e6

export default function LocationPicker({ value, onChange, height = 260 }) {
  const containerRef = useRef(null)
  const mapRef        = useRef(null)
  const markerRef      = useRef(null)
  const onChangeRef    = useRef(onChange)

  useEffect(() => { onChangeRef.current = onChange })

  useEffect(() => {
    const center = value ? [value.lat, value.lng] : LA_PAZ_CENTER
    const map = L.map(containerRef.current).setView(center, value ? 17 : 13)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker(center, { icon: defaultIcon, draggable: true }).addTo(map)
    markerRef.current = marker

    const emitChange = (latlng) => onChangeRef.current({ lat: round6(latlng.lat), lng: round6(latlng.lng) })

    marker.on('dragend', () => emitChange(marker.getLatLng()))
    map.on('click', (e) => {
      marker.setLatLng(e.latlng)
      emitChange(e.latlng)
    })

    // Si no hay una ubicación ya elegida, intenta localizar automáticamente al abrir el mapa
    if (!value && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          marker.setLatLng(latlng)
          map.setView(latlng, 17)
          emitChange(latlng)
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      )
    }

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: round6(pos.coords.latitude), lng: round6(pos.coords.longitude) }
        markerRef.current?.setLatLng(latlng)
        mapRef.current?.setView(latlng, 17)
        onChangeRef.current(latlng)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Ubicación en el mapa (opcional)</label>
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="text-xs font-semibold text-orange-500 hover:underline"
        >
          📍 Usar mi ubicación
        </button>
      </div>
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded-xl overflow-hidden border border-gray-200"
      />
      <p className="text-xs text-gray-400">Toca el mapa o arrastra el pin para marcar el punto exacto de entrega.</p>
    </div>
  )
}
