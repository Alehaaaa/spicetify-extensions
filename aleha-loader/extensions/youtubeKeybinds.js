/**
 * YouTube-style keyboard controls for Spicetify.
 */
(function youtubeKeybinds() {
    if (!Spicetify || !Spicetify.Player) {
        console.error("YTKeybinds: Spicetify or Spicetify.Player not available. Retrying in 1s.");
        setTimeout(youtubeKeybinds, 1000);
        return;
    }

    const SEEK_TIME_5_SEC = 5000;
    const SEEK_TIME_10_SEC = 10000;
    const VOLUME_STEP = 0.05;
    const VOLUME_THROTTLE_MS = 100;

    let lastVolumeChangeTimestamp = 0;

    const getPlayerState = () => {
        const duration = Spicetify.Player.getDuration() || 0;
        const progress = Spicetify.Player.getProgress() || 0;
        return { duration, progress };
    };

    const handleVolumeChange = (increase) => {
        const now = Date.now();
        if (now - lastVolumeChangeTimestamp > VOLUME_THROTTLE_MS) {
            const currentVolume = Spicetify.Player.getVolume();
            const newVolume = increase
                ? Math.min(currentVolume + VOLUME_STEP, 1)
                : Math.max(currentVolume - VOLUME_STEP, 0);
            if (currentVolume !== newVolume) {
                Spicetify.Player.setVolume(newVolume);
            }
            lastVolumeChangeTimestamp = now;
        }
    };

    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        const activeElement = document.activeElement;

        if ((event.ctrlKey || event.metaKey || event.altKey) || Spicetify?.PopupModal?.isOpen?.()) {
            return;
        }

        const isTyping = activeElement &&
            (activeElement.tagName === 'INPUT' ||
             activeElement.tagName === 'TEXTAREA' ||
             activeElement.isContentEditable);

        if (isTyping) {
            return;
        }

        let playerState;
        let handled = false;

        switch (key) {
            case 'arrowleft': {
                playerState = getPlayerState();
                const seekBackTime = event.shiftKey ? SEEK_TIME_10_SEC : SEEK_TIME_5_SEC;
                Spicetify.Player.seek(Math.max(playerState.progress - seekBackTime, 0));
                handled = true;
                break;
            }
            case 'arrowright': {
                playerState = getPlayerState();
                const seekForTime = event.shiftKey ? SEEK_TIME_10_SEC : SEEK_TIME_5_SEC;
                Spicetify.Player.seek(Math.min(playerState.progress + seekForTime, playerState.duration));
                handled = true;
                break;
            }
            case 'arrowup':
                handleVolumeChange(true);
                handled = true;
                break;
            case 'arrowdown':
                handleVolumeChange(false);
                handled = true;
                break;

            case 'j':
                playerState = getPlayerState();
                Spicetify.Player.seek(Math.max(playerState.progress - SEEK_TIME_10_SEC, 0));
                handled = true;
                break;
            case 'l':
                playerState = getPlayerState();
                Spicetify.Player.seek(Math.min(playerState.progress + SEEK_TIME_10_SEC, playerState.duration));
                handled = true;
                break;
            case 'k':
                Spicetify.Player.togglePlay();
                handled = true;
                break;
            case 'm':
                Spicetify.Player.toggleMute();
                handled = true;
                break;

            case 'n':
                if (event.shiftKey) {
                    Spicetify.Player.next();
                    handled = true;
                }
                break;
            case 'p':
                if (event.shiftKey) {
                    Spicetify.Player.back();
                    handled = true;
                }
                break;

            default:
                if (/^[0-9]$/.test(key)) {
                    playerState = getPlayerState();
                    if (playerState.duration > 0) {
                        const seekPercent = parseInt(key) / 10;
                        const seekPosition = seekPercent * playerState.duration;
                        Spicetify.Player.seek(seekPosition);
                        handled = true;
                    }
                }
                break;
        }

        if (handled) {
            event.preventDefault();
        }
    });
})();
