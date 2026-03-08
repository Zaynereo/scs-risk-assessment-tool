/**
 * Asset staging utility — manages pending uploads and deletions client-side.
 * Nothing touches the server until the caller explicitly flushes.
 * No DOM or fetch dependencies — pure state management.
 */

export function createAssetStager() {
    const pendingUploads = new Map(); // tempId → { file, blobUrl, folder }
    const pendingDeletes = [];        // server paths to delete on save
    let idCounter = 0;

    function stageUpload(file, folder) {
        const tempId = `pending-${++idCounter}`;
        const blobUrl = URL.createObjectURL(file);
        pendingUploads.set(tempId, { file, blobUrl, folder });
        return tempId;
    }

    function unstageUpload(tempId) {
        const entry = pendingUploads.get(tempId);
        if (!entry) return;
        URL.revokeObjectURL(entry.blobUrl);
        pendingUploads.delete(tempId);
    }

    function stageDelete(serverPath) {
        // If it's a pending upload, just remove it — no server delete needed
        if (pendingUploads.has(serverPath)) {
            unstageUpload(serverPath);
            return;
        }
        if (!pendingDeletes.includes(serverPath)) {
            pendingDeletes.push(serverPath);
        }
    }

    function unstageDelete(serverPath) {
        const idx = pendingDeletes.indexOf(serverPath);
        if (idx !== -1) pendingDeletes.splice(idx, 1);
    }

    function isPending(id) {
        return pendingUploads.has(id);
    }

    function getPendingUploads() {
        return Array.from(pendingUploads.entries()).map(
            ([tempId, { file, folder }]) => ({ tempId, file, folder })
        );
    }

    function getPendingDeletes() {
        return [...pendingDeletes];
    }

    function getBlobUrl(tempId) {
        const entry = pendingUploads.get(tempId);
        return entry ? entry.blobUrl : undefined;
    }

    function reset() {
        for (const entry of pendingUploads.values()) {
            URL.revokeObjectURL(entry.blobUrl);
        }
        pendingUploads.clear();
        pendingDeletes.length = 0;
    }

    return {
        stageUpload,
        unstageUpload,
        stageDelete,
        unstageDelete,
        isPending,
        getPendingUploads,
        getPendingDeletes,
        getBlobUrl,
        reset
    };
}
