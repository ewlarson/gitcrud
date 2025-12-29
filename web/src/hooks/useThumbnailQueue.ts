import { getDistributionsForResource, upsertThumbnail } from "../duckdb/duckdbClient";
import { useState, useCallback, useRef } from "react";
import { Resource, Distribution } from "../aardvark/model";
import { ImageService } from "../services/ImageService";
import { default as pLimit } from "p-limit";

// Concurrency limit
const limit = pLimit(5);

interface QueueItem {
    id: string;
    resource: Resource;
    distributions: Distribution[];
}

export function useThumbnailQueue() {
    const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({});
    const processedRef = useRef<Set<string>>(new Set());

    // A queue map to dedup requests
    const queueRef = useRef<Map<string, QueueItem>>(new Map());

    const processQueue = useCallback(() => {
        // We process all pending items in the map using p-limit
        // We iterate over the map keys (snapshot) to avoid infinite loops if we re-add
        const pending = Array.from(queueRef.current.values());

        // Clear the map immediately so new registrations can occur
        queueRef.current.clear();

        pending.forEach(item => {
            // Mark as processed (started)
            processedRef.current.add(item.id);

            limit(async () => {
                try {
                    let dists = item.distributions;
                    if (!dists || dists.length === 0) {
                        dists = await getDistributionsForResource(item.id);
                    }

                    const service = new ImageService(item.resource, dists);
                    const url = await service.getThumbnailUrl();
                    if (url) {
                        // Fetch blob
                        const resp = await fetch(url);
                        if (resp.ok) {
                            const blob = await resp.blob();
                            await upsertThumbnail(item.id, blob);
                            setThumbnails(prev => ({ ...prev, [item.id]: URL.createObjectURL(blob) }));
                        } else {
                            setThumbnails(prev => ({ ...prev, [item.id]: null }));
                        }
                    } else {
                        // Mark as null to indicate "checked but none found" (optional, allows UI to stop loading state)
                        setThumbnails(prev => ({ ...prev, [item.id]: null }));
                    }
                } catch (err) {
                    console.warn(`Error fetching thumbnail for ${item.id}`, err);
                    setThumbnails(prev => ({ ...prev, [item.id]: null }));
                }
            });
        });
    }, []);

    // Function to register an item for thumbnail fetching
    const register = useCallback((id: string, resource: Resource, distributions: Distribution[] = []) => {
        if (processedRef.current.has(id)) return;
        if (queueRef.current.has(id)) return; // Already queued

        queueRef.current.set(id, { id, resource, distributions });

        // Trigger processing
        processQueue();
    }, [processQueue]);

    return { thumbnails, register };
}
