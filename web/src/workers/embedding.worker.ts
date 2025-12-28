
import { pipeline, env } from '@xenova/transformers';

// Skip local model checks for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton pipeline instance
let extractor: any = null;

// Initialize
async function getExtractor() {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return extractor;
}

self.onmessage = async (e: MessageEvent) => {
    const { id, text } = e.data;

    try {
        const pipe = await getExtractor();
        const output = await pipe(text, { pooling: 'mean', normalize: true, truncation: true, max_length: 512 });

        // Output is a Tensor, we need array
        const embedding = Array.from(output.data);

        self.postMessage({ id, embedding, success: true });
    } catch (err: any) {
        console.error("Embedding worker error:", err);
        self.postMessage({ id, success: false, error: err.message });
    }
};
