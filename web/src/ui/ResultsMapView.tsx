import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Resource } from '../aardvark/model';
import { LatLngBoundsExpression } from 'leaflet';

interface ResultsMapViewProps {
    resources: Resource[];
    onEdit: (id: string) => void;
}

// Component to handle auto-fit bounds
const FitBounds: React.FC<{ bounds: LatLngBoundsExpression }> = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && (bounds as any).length > 0) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [bounds, map]);
    return null;
};

export const ResultsMapView: React.FC<ResultsMapViewProps> = ({ resources, onEdit }) => {
    // Parse BBoxes
    const features = resources.map(r => {
        const bboxStr = r.dcat_bbox;
        if (!bboxStr) return null;

        let coords: [number, number, number, number] | null = null; // [minX, minY, maxX, maxY]

        // Try ENVELOPE(minX, maxX, maxY, minY) - Standard Aardvark
        const envelopeMatch = bboxStr.match(/ENVELOPE\s*\(\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)/i);
        if (envelopeMatch) {
            const minX = parseFloat(envelopeMatch[1]);
            const maxX = parseFloat(envelopeMatch[2]);
            const maxY = parseFloat(envelopeMatch[3]);
            const minY = parseFloat(envelopeMatch[4]);
            coords = [minX, minY, maxX, maxY];
        } else {
            // Try CSV/Simple: minX,minY,maxX,maxY
            const parts = bboxStr.split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 4 && parts.every(n => !isNaN(n))) {
                coords = [parts[0], parts[1], parts[2], parts[3]];
            }
        }

        if (!coords) return null;

        // Leaflet Bounds: [[minY, minX], [maxY, maxX]] (SouthWest, NorthEast)
        const bounds: LatLngBoundsExpression = [
            [coords[1], coords[0]],
            [coords[3], coords[2]]
        ];

        return { resource: r, bounds };
    }).filter(f => f !== null) as { resource: Resource; bounds: LatLngBoundsExpression }[];

    if (features.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center text-slate-500 bg-gray-50 dark:bg-slate-900">
                No mappable results found in this page.
            </div>
        );
    }

    const allBounds = features.map(f => f.bounds);

    return (
        <div className="h-full w-full min-h-[500px] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800 relative z-0">
            <MapContainer
                center={[0, 0]}
                zoom={2}
                className="h-full w-full"
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {features.map(f => (
                    <Rectangle
                        key={f.resource.id}
                        bounds={f.bounds}
                        pathOptions={{ color: '#6366f1', weight: 1, fillOpacity: 0.1 }}
                        eventHandlers={{
                            click: () => onEdit(f.resource.id)
                        }}
                    >
                        <Popup>
                            <div className="text-xs">
                                <strong className="block mb-1">{f.resource.dct_title_s}</strong>
                                <span className="text-slate-500">{f.resource.id}</span>
                                <div className="mt-2 text-indigo-600 cursor-pointer hover:underline" onClick={() => onEdit(f.resource.id)}>
                                    Edit Record
                                </div>
                            </div>
                        </Popup>
                    </Rectangle>
                ))}

                <FitBounds bounds={allBounds as any} />
            </MapContainer>
        </div>
    );
};
