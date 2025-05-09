/**
 * Youtube Keybinds Plugin for Spicetify
 * Version: 1.9.1 (Fixed Shift key early exit)
 * Author: Rastrisr (Original), Refactored by AI Assistant
 * Description: Adds YouTube-style keyboard controls. All custom keybinds
 * (Arrows, J, L, K, M, 0-9, Shift+N/P) are disabled when typing in input fields.
 *
 * Keybinds (Only active when NOT typing in inputs):
 * - 0-9: Jump to % of song duration (0=0%, 5=50%, etc.).
 * - Left Arrow: Seek backwards 5 seconds (10s with Shift).
 * - Right Arrow: Seek forwards 5 seconds (10s with Shift).
 * - Up Arrow: Increase volume by 5%.
 * - Down Arrow: Decrease volume by 5%.
 * - J: Seek backwards 10 seconds.
 * - L: Seek forwards 10 seconds.
 * - K: Toggle play/pause.
 * - M: Toggle mute/unmute.
 * - Shift + N: Next song.
 * - Shift + P: Previous song.
 */
(function youtubeKeybinds() {
    // Check if Spicetify and its Player API are available
    if (!Spicetify || !Spicetify.Player) {
        console.error("YTKeybinds: Spicetify or Spicetify.Player not available. Retrying in 1s.");
        setTimeout(youtubeKeybinds, 1000);
        return;
    }

    // --- Configuration Constants ---
    const SEEK_TIME_5_SEC = 5000;      // 5 seconds in milliseconds
    const SEEK_TIME_10_SEC = 10000;     // 10 seconds in milliseconds
    const VOLUME_STEP = 0.05;         // 5% volume change
    const VOLUME_THROTTLE_MS = 100;     // Prevent rapid volume changes (ms)

    let lastVolumeChangeTimestamp = 0;

    // --- Helper Functions ---

    /** Safely gets player state, returning defaults if unavailable */
    const getPlayerState = () => {
        const duration = Spicetify.Player.getDuration() || 0;
        const progress = Spicetify.Player.getProgress() || 0;
        return { duration, progress };
    };

    /** Handles volume changes with throttling */
    const handleVolumeChange = (increase) => {
        const now = Date.now();
        if (now - lastVolumeChangeTimestamp > VOLUME_THROTTLE_MS) {
            const currentVolume = Spicetify.Player.getVolume();
            const newVolume = increase
                ? Math.min(currentVolume + VOLUME_STEP, 1)
                : Math.max(currentVolume - VOLUME_STEP, 0);
            if (currentVolume !== newVolume) {
                Spicetify.Player.setVolume(newVolume);
                // console.log(`[YTKB] Volume changed to ${Math.round(newVolume * 100)}%`);
            }
            lastVolumeChangeTimestamp = now;
        } else {
            // console.debug('[YTKB] Volume change throttled');
        }
    };

    // --- Event Listener ---
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase(); // Normalize key to lowercase
        const activeElement = document.activeElement;

        // --- Early Exit Conditions ---
        // Ignore if major modifiers (Ctrl, Alt, Meta) are pressed or a Spicetify popup is open.
        // Shift is checked later for specific keybinds.
        if ((event.ctrlKey || event.metaKey || event.altKey) || Spicetify?.PopupModal?.isOpen?.()) { // CORRECTED LINE
            // console.debug('[YTKB] Ignoring key due to modifier or popup:', key);
            return;
        }

        // --- Check for Typing Focus ---
        // Disable ALL custom keybinds below if typing in specific elements.
        const isTyping = activeElement &&
            (activeElement.tagName === 'INPUT' ||
             activeElement.tagName === 'TEXTAREA' ||
             activeElement.isContentEditable);

        if (isTyping) {
            // console.debug('[YTKB] Input focus detected. Ignoring key for custom binds:', key);
            // Allow default browser behavior (e.g., cursor movement, typing)
            return; // Exit before processing ANY custom keybinds
        }

        // --- Process Custom Keybinds (Only if NOT typing) ---
        let playerState; // Lazily get player state only when needed
        let handled = false; // Assume the keypress will NOT be handled unless explicitly set

        switch (key) {
            // Arrow Keys (Volume/Seek) - Now disabled in inputs by the check above
            case 'arrowleft': {
                playerState = getPlayerState();
                // Check shiftKey HERE to modify behavior
                const seekBackTime = event.shiftKey ? SEEK_TIME_10_SEC : SEEK_TIME_5_SEC;
                // console.log(`[YTKB] ArrowLeft: Seeking back ${seekBackTime / 1000}s (Shift: ${event.shiftKey})`);
                Spicetify.Player.seek(Math.max(playerState.progress - seekBackTime, 0));
                handled = true;
                break;
            }
            case 'arrowright': {
                playerState = getPlayerState();
                 // Check shiftKey HERE to modify behavior
                const seekForTime = event.shiftKey ? SEEK_TIME_10_SEC : SEEK_TIME_5_SEC;
                // console.log(`[YTKB] ArrowRight: Seeking forward ${seekForTime / 1000}s (Shift: ${event.shiftKey})`);
                Spicetify.Player.seek(Math.min(playerState.progress + seekForTime, playerState.duration));
                handled = true;
                break;
            }
            case 'arrowup':
                // console.log('[YTKB] ArrowUp: Increasing volume');
                handleVolumeChange(true);
                handled = true;
                break;
            case 'arrowdown':
                // console.log('[YTKB] ArrowDown: Decreasing volume');
                handleVolumeChange(false);
                handled = true;
                break;

            // J, L, K, M Keys
            case 'j':
                playerState = getPlayerState();
                // console.log('[YTKB] J: Seeking back 10s');
                Spicetify.Player.seek(Math.max(playerState.progress - SEEK_TIME_10_SEC, 0));
                handled = true;
                break;
            case 'l':
                playerState = getPlayerState();
                // console.log('[YTKB] L: Seeking forward 10s');
                Spicetify.Player.seek(Math.min(playerState.progress + SEEK_TIME_10_SEC, playerState.duration));
                handled = true;
                break;
            case 'k':
                // console.log('[YTKB] K: Toggling play/pause');
                Spicetify.Player.togglePlay();
                handled = true;
                break;
            case 'm':
                // console.log('[YTKB] M: Toggling mute');
                Spicetify.Player.toggleMute();
                handled = true;
                break;

            // N, P Keys (with Shift)
            case 'n':
                 // Check shiftKey HERE for the required action
                if (event.shiftKey) {
                    // console.log('[YTKB] Shift+N: Next track');
                    Spicetify.Player.next();
                    handled = true;
                }
                break;
            case 'p':
                 // Check shiftKey HERE for the required action
                if (event.shiftKey) {
                    // console.log('[YTKB] Shift+P: Previous track');
                    Spicetify.Player.back();
                    handled = true;
                }
                break;

            // Number Keys (0-9)
            default:
                if (/^[0-9]$/.test(key)) {
                    playerState = getPlayerState();
                    if (playerState.duration > 0) {
                        const seekPercent = parseInt(key) / 10;
                        const seekPosition = seekPercent * playerState.duration;
                        // console.log(`[YTKB] Number ${key}: Seeking to ${seekPercent * 100}% (${Math.round(seekPosition / 1000)}s)`);
                        Spicetify.Player.seek(seekPosition);
                        handled = true;
                    } else {
                        // console.log(`[YTKB] Number ${key} ignored (duration is 0)`);
                    }
                }
                break;
        } // End switch

        // Prevent default browser action only if handled by the plugin
        if (handled) {
            event.preventDefault();
        } else {
             // console.debug(`[YTKB] Key '${key}' (Shift: ${event.shiftKey}) not handled by plugin (outside inputs).`);
        }
    }); // End event listener

    // console.log("YTKeybinds: Plugin initialized (v1.9.1). Custom keybinds disabled during text input.");

})(); // End of IIFE