/**
 * Highmark Associates - Database Client (db.js)
 *
 * A shared helper that all JS files use to talk to the server PHP API.
 * getData()  → fetch data from server (with static-file fallback)
 * setData()  → save data to server (requires admin password as token)
 */

// Resolve API URL relative to site root, handles subdirectory installs
const _getApiUrl = () => {
    const { origin, pathname } = window.location;
    // Find the root by going up until we're at a known root indicator
    // Works whether site is at root (/) or a subdirectory (/hamza/)
    const parts = pathname.split('/').filter(Boolean);
    // Strip the current filename if present (e.g. index.html)
    if (parts.length > 0 && parts[parts.length - 1].includes('.')) {
        parts.pop();
    }
    const basePath = parts.length > 0 ? '/' + parts.join('/') + '/' : '/';
    return `${origin}${basePath}api/data.php`;
};

const API_URL = _getApiUrl();

/**
 * Fetch a data collection from the server.
 * @param {string} key     - One of: listings, agents, blogs, config, ceo
 * @param {*}      fallback - Value to return if server has no data or is unreachable
 * @returns {Promise<*>}
 */
export const getData = async (key, fallback = null) => {
    try {
        const res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // null = server has no saved data yet → use static JS file default
        return data !== null ? data : fallback;
    } catch (err) {
        console.warn(`[DB] Could not fetch "${key}" from server — using static fallback.`, err.message);
        return fallback;
    }
};

/**
 * Save data to the server.
 * @param {string} key   - Data key (listings, agents, blogs, config, ceo, admin_token)
 * @param {*}      data  - Data to save
 * @param {string} token - Admin password (used as authentication token)
 * @returns {Promise<{success: boolean, message: string}>}
 * @throws {Error} if the server rejects the request
 */
export const setData = async (key, data, token) => {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, token })
    });

    const result = await res.json();

    if (!res.ok) {
        throw new Error(result.error || `Server error (HTTP ${res.status})`);
    }

    return result;
};

/**
 * Verify if the provided password is correct against the server.
 * @param {string} token - Admin password/token to verify
 * @returns {Promise<boolean>}
 */
export const verifyToken = async (token) => {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'verify', token, data: null })
        });
        if (!res.ok) return false;
        const result = await res.json();
        return !!result.success;
    } catch (err) {
        console.warn('[DB] Verification request failed, offline or server unreachable.', err.message);
        throw err;
    }
};
