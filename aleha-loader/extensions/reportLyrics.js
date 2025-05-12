
/*
 * Spicetify extension: Lyrics Reporter ✨ – OAuth Edition (postMessage fix)
 * ----------------------------------------------------------------------
 * Fixes the “Popup blocked” / token‑not‑captured issues by using the
 * recommended **postMessage** pattern instead of trying to read the popup’s
 * location (which is blocked by browser cross‑origin rules).
 *
 * How it works now
 * ---------------
 * 1. On first submit the extension opens the Discord OAuth URL in a popup.
 * 2. Your custom **redirect page** (set in REDIRECT_URI) must contain the
 *    one‑liner below. After Discord redirects there with `#access_token=…`,
 *    the page immediately posts the hash to the opener and closes itself:
 *
 *    ```html
 *    <!doctype html><script>window.opener.postMessage(location.hash,'*');window.close();</script>
 *    ```
 * 3. The extension listens for that `message` event, extracts the token,
 *    stores it in localStorage and resolves – no cross‑origin reads needed.
 *
 * IMPORTANT: replace the placeholder constants with real values:
 *    • DISCORD_CLIENT_ID  – your app’s Client ID (Developer Portal).
 *    • REDIRECT_URI       – URL of the page above, and added to your app.
 *    • DISCORD_CHANNEL_ID – numeric ID of the target text channel.
 */

(function LyricsReporter() {
    /* ---------------- Discord OAuth config -------- */
    /* ---------------- Discord OAuth config -------- */
    const DISCORD_CLIENT_ID = "1370086618966265998";
    // IMPORTANT: This MUST be the URL to your hosted HTML page (like display-token.html)
    // that shows the token from the URL hash. And it must be whitelisted in Discord.
    const REDIRECT_URI = "file:///C:/Users/alejandro/AppData/Roaming/spicetify/Extensions/display-token.html"; // <-- REPLACE THIS
    const DISCORD_CHANNEL_ID = "1370023661830148106";

    /* ---------------- Tag definitions ------------- */
    const TAG_DATA = [
        { name: "Missing Lyrics", icon: "📝" },
        { name: "Incorrect Lyrics", icon: "❌" },
        { name: "Incorrect Timing", icon: "⏱️" },
        { name: "Improve Sync-Type", icon: "📈" },
        { name: "Lyrics Provider", icon: "🏷️" },
        { name: "Whole Album", icon: "💿" }
    ];

    /* ----------- Wait for Spicetify -------------- */
    if (!(window.Spicetify && Spicetify.Player && Spicetify.Player.data)) {
        setTimeout(LyricsReporter, 500);
        return;
    }

    /* ----------- Helper refs --------------------- */
    const TOKEN_KEY = "lyricsReporter.oauthToken";
    const EXP_KEY = "lyricsReporter.oauthExp";

    const isLyricsPage = () => !!document.querySelector("#SpicyLyricsPage");
    const controlsContainer = () => document.querySelector(".ViewControls");

    const createToolbarIcon = () => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 20 20");
        svg.setAttribute("height", "14");
        svg.setAttribute("width", "14");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("data-encore-id", "icon");
        svg.className = "Svg-sc-ytk21e-0 Svg-img-16-icon";
        svg.innerHTML =
            '<path xmlns="http://www.w3.org/2000/svg" d="M18 12.534 2 9.287V6.445l16-3.248v9.337zM8 14.553l-4-.835v-1.996l4 .812v2.019zM18 0v1.167L0 4.821v6.09l2 .405v4.013L10 17v-4.06l8 1.624v1.675h2V0h-2z"/>';
        return svg;
    };

    function validToken() {
        const t = localStorage.getItem(TOKEN_KEY);
        const exp = parseFloat(localStorage.getItem(EXP_KEY) || "0");
        return t && exp > Date.now() / 1000 + 60 ? t : null;
    }

    function oauthViaPopup() {
        return new Promise((resolve, reject) => {
            if (!DISCORD_CLIENT_ID || !REDIRECT_URI) {
                reject(new Error("OAuth not configured"));
                return;
            }
            const state = Math.random().toString(36).slice(2, 10);
            const authUrl =
                `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}` +
                `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                `&response_type=token&scope=identify&state=${state}`;

            const w = 500, h = 600, left = (screen.width - w) / 2, top = (screen.height - h) / 2;
            const pop = window.open(authUrl, "disc_oauth", `width=${w},height=${h},left=${left},top=${top}`);
            if (!pop) { reject(new Error("Popup blocked")); return; }

            function onMsg(e) {
                if (!e.data || typeof e.data != "string" || !e.data.startsWith("#")) return;
                const params = new URLSearchParams(e.data.slice(1));
                if (params.get("state") !== state) return;
                const tok = params.get("access_token");
                const exp = parseInt(params.get("expires_in"), 10);
                if (tok) {
                    localStorage.setItem(TOKEN_KEY, tok);
                    localStorage.setItem(EXP_KEY, (Date.now() / 1000) + exp);
                    window.removeEventListener("message", onMsg);
                    resolve(tok);
                }
            }
            window.addEventListener("message", onMsg, false);
        });
    }

    /* ----------- UI injection -------------------- */
    function injectButton() {
        const ctrls = controlsContainer(); if (!ctrls) return;
        const has = ctrls.querySelector("#lyrics-report-btn");
        if (!isLyricsPage()) { if (has) has.remove(); return; }
        if (has) return;
        const b = document.createElement("button");
        b.id = "lyrics-report-btn"; b.className = "ViewControl";
        b.title = "Report lyrics…"; b.appendChild(createToolbarIcon());
        b.onclick = openDialog;
        const close = ctrls.querySelector("#Close");
        close ? ctrls.insertBefore(b, close) : ctrls.appendChild(b);
    }

    /* ----------- Dialog -------------------------- */
    function openDialog() {
        if (document.querySelector("#lyrics-report-dialog")) return;
        const track = Spicetify.Player.data?.item;
        const tName = track?.name || "Unknown title";
        const tArtist = track?.artists?.[0]?.name || "Unknown artist";
        const tUri = track?.uri || "";

        const ov = document.createElement("div"); ov.id = "lyrics-report-dialog";
        Object.assign(ov.style, { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" });
        const modal = document.createElement("div");
        Object.assign(modal.style, { background: "#181818", color: "#fff", padding: "24px", borderRadius: "8px", width: "380px", boxShadow: "0 4px 20px rgba(0,0,0,.4)", display: "flex", flexDirection: "column", gap: "16px" });
        const titleEl = document.createElement("h3"); titleEl.textContent = `${tName} by ${tArtist}`; titleEl.style.margin = 0; modal.appendChild(titleEl);

        const tagBox = document.createElement("div"); Object.assign(tagBox.style, { display: "flex", flexWrap: "wrap", gap: "8px" }); modal.appendChild(tagBox);
        const sel = new Set();
        TAG_DATA.forEach(({ name, icon }) => { const btn = document.createElement("button"); btn.innerHTML = `${icon} <span>${name}</span>`; Object.assign(btn.style, { padding: "6px 10px", border: "1px solid #666", borderRadius: "16px", background: "transparent", color: "#fff", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }); btn.onclick = () => { if (sel.has(name)) { sel.delete(name); btn.style.background = "transparent"; } else { sel.add(name); btn.style.background = "#1db954"; } check(); }; tagBox.appendChild(btn); });

        const textarea = document.createElement("textarea"); textarea.rows = 3; textarea.placeholder = "Describe the issue (required)…"; Object.assign(textarea.style, { resize: "vertical", padding: "8px", borderRadius: "4px", border: "1px solid #666", background: "#121212", color: "#fff", fontSize: "13px" }); textarea.oninput = check; modal.appendChild(textarea);

        const act = document.createElement("div"); Object.assign(act.style, { display: "flex", justifyContent: "flex-end", gap: "8px" }); modal.appendChild(act);
        const cancel = document.createElement("button"); cancel.textContent = "Cancel"; styleAct(cancel); cancel.onclick = () => ov.remove(); act.appendChild(cancel);
        const submit = document.createElement("button"); submit.textContent = "Submit"; styleAct(submit, true); submit.disabled = true; act.appendChild(submit);

        submit.onclick = async () => {
            const tags = [...sel]; const desc = textarea.value.trim(); if (!tags.length || !desc) return;
            let token = validToken(); if (!token) { try { token = await oauthViaPopup(); } catch (e) { console.error("[Lyrics Reporter] OAuth", e); return; } }
            try { await sendToDiscord(buildReport({ track, trackUri: tUri, tags, description: desc }), token); } catch (e) { console.error("[Lyrics Reporter] Discord", e); } ov.remove();
        };
        function check() { submit.disabled = !(sel.size && textarea.value.trim()); }
        function styleAct(btn, primary = false) { Object.assign(btn.style, { padding: "6px 14px", border: "none", borderRadius: "16px", cursor: "pointer", fontSize: "13px" }); if (primary) { btn.style.background = "#1db954"; btn.style.color = "#000"; btn.style.fontWeight = 600; } else { btn.style.background = "transparent"; btn.style.color = "#fff"; } }

        ov.appendChild(modal); document.body.appendChild(ov); ov.onclick = e => e.target === ov && ov.remove();
    }

    /* ----------- Report build & send ------------- */
    const buildReport = ({ track, trackUri, tags, description }) => {
        const trackUrl = trackUri.startsWith("spotify:track:") ? `https://open.spotify.com/track/${trackUri.split(":").pop()}` : trackUri;
        const r = { title: `${track?.name || "Unknown title"} by ${track?.artists?.[0]?.name || "Unknown artist"}`, track: trackUrl, tags, description };
        if (tags.includes("Whole Album")) { const aUri = track?.album?.uri || track?.metadata?.album_uri; if (aUri) { r.album = aUri.startsWith("spotify:album:") ? `https://open.spotify.com/album/${aUri.split(":").pop()}` : aUri; } }
        return r;
    };

    async function sendToDiscord(rep, token) {
        if (!DISCORD_CHANNEL_ID) throw new Error("DISCORD_CHANNEL_ID missing");
        const body = { embeds: [{ title: rep.title, description: `${rep.description}\n\n**Tags:** ${rep.tags.join(", ")}`, color: 0x1db954, fields: [{ name: "Track", value: rep.track, inline: false }] }] };
        if (rep.album) body.embeds[0].fields.push({ name: "Album", value: rep.album, inline: false });
        const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }

    /* ----------- Observe ------------------------- */
    new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
    injectButton();
})();
