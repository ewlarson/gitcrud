
import { Resource } from "../aardvark/model";

// Constants for Web Mercator
const TILE_SIZE = 256;
const MAX_ZOOM = 19;

// Default "Null" Map if no bbox
const DEFAULT_CENTER = { lat: 0, lng: 0 };
const DEFAULT_ZOOM = 1;

interface BBox {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
}

// Parse ENVELOPE(w, e, n, s) or string "w,s,e,n"
export function parseBBox(resource: Resource): BBox | null {
    const geom = resource.dcat_bbox || resource.locn_geometry;
    if (!geom) return null;

    // Try ENVELOPE(minX, maxX, maxY, minY)
    const envMatch = geom.match(/ENVELOPE\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/i);
    if (envMatch) {
        // ENVELOPE(W, E, N, S)
        const w = parseFloat(envMatch[1]);
        const e = parseFloat(envMatch[2]);
        const n = parseFloat(envMatch[3]);
        const s = parseFloat(envMatch[4]);
        if (!isNaN(w) && !isNaN(e) && !isNaN(n) && !isNaN(s)) {
            return { minLat: s, minLng: w, maxLat: n, maxLng: e };
        }
    }

    // Try CSV "w,s,e,n"
    const parts = geom.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
        // Usually w, s, e, n
        return { minLat: parts[1], minLng: parts[0], maxLat: parts[3], maxLng: parts[2] };
    }

    return null;
}

function latLngToPoint(lat: number, lng: number, zoom: number) {
    const n = Math.pow(2, zoom);
    const x = (lng + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    return { x: x * TILE_SIZE, y: y * TILE_SIZE };
}

function getBestZoom(bbox: BBox, width: number, height: number): number {
    const latDiff = bbox.maxLat - bbox.minLat;
    const lngDiff = bbox.maxLng - bbox.minLng;
    // Simple approximation
    for (let z = MAX_ZOOM; z >= 0; z--) {
        const p1 = latLngToPoint(bbox.minLat, bbox.minLng, z);
        const p2 = latLngToPoint(bbox.maxLat, bbox.maxLng, z);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        if (w < width * 0.9 && h < height * 0.9) return z;
    }
    return 0;
}

export async function generateStaticMap(resource: Resource, width = 200, height = 200): Promise<Blob | null> {
    const bbox = parseBBox(resource);
    if (!bbox) return null;

    const zoom = getBestZoom(bbox, width, height);
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;

    // Center point in pixel coords at this zoom
    const centerM = latLngToPoint(centerLat, centerLng, zoom);

    // Viewport bounds in pixel coords
    const viewMinX = centerM.x - width / 2;
    const viewMinY = centerM.y - height / 2;
    const viewMaxX = centerM.x + width / 2;
    const viewMaxY = centerM.y + height / 2;

    // Needed Tiles ranges
    const minTileX = Math.floor(viewMinX / TILE_SIZE);
    const maxTileX = Math.floor(viewMaxX / TILE_SIZE);
    const minTileY = Math.floor(viewMinY / TILE_SIZE);
    const maxTileY = Math.floor(viewMaxY / TILE_SIZE);

    // Use OffscreenCanvas if available, else generic canvas
    let canvas: OffscreenCanvas | HTMLCanvasElement;
    let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d');
    } else {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
    }

    if (!ctx) return null;

    // 1. Draw Tiles
    const promises: Promise<void>[] = [];
    const n = Math.pow(2, zoom);

    for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
            // Wrap X
            const normalizedTx = ((tx % n) + n) % n;
            // Y is not wrapped
            if (ty < 0 || ty >= n) continue;

            const url = `https://tile.openstreetmap.org/${zoom}/${normalizedTx}/${ty}.png`;

            const p = fetch(url).then(r => r.blob()).then(createImageBitmap).then(img => {
                const destX = (tx * TILE_SIZE) - viewMinX;
                const destY = (ty * TILE_SIZE) - viewMinY;
                ctx!.drawImage(img, destX, destY);
            }).catch(e => {
                // failed tile, ignore
            });
            promises.push(p);
        }
    }

    await Promise.all(promises);

    // 2. Draw BBox
    const pMin = latLngToPoint(bbox.maxLat, bbox.minLng, zoom); // Top-Left of Box (maxLat is top)
    const pMax = latLngToPoint(bbox.minLat, bbox.maxLng, zoom); // Bottom-Right of Box (minLat is bottom)

    const bx = pMin.x - viewMinX;
    const by = pMin.y - viewMinY;
    const bw = pMax.x - pMin.x;
    const bh = pMax.y - pMin.y;

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'blue';
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();

    // Export
    if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob({ type: 'image/png' });
    } else {
        return new Promise(resolve => (canvas as HTMLCanvasElement).toBlob(resolve, 'image/png'));
    }
}
