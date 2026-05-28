/* eslint-disable @typescript-eslint/ban-ts-comment */

import React from 'react';

const { createRoot } = Spicetify.ReactDOM;

declare global {
    interface Window {
        operatingSystem: string | null;
        playingTagsAttachSelector?: string;
        playingTagsCleanup?: () => void;
    }
}

// ── Constants ──────────────────────────────────────────────────────────

const LOG_PREFIX = '[Track Tags]';
const DEFAULT_ATTACH_SELECTOR = '.main-nowPlayingWidget-nowPlaying .main-trackInfo-xsmallBadges';
const DJ_COVER_ART_URL = 'https://lexicon-assets.spotifycdn.com/Your-DJ-Cover-Art-300.png';
const LIKED_ART_URL = 'https://misc.scdn.co/liked-songs/liked-songs-300.png';
const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Early cleanup & logging ────────────────────────────────────────────

console.log(LOG_PREFIX, 'extension loaded');
document.querySelectorAll('#playing-tags').forEach((el) => el.remove());

// ── Types ──────────────────────────────────────────────────────────────

interface TagElements {
    wrapper: HTMLDivElement;
    explicit: HTMLSpanElement;
    playlist: HTMLSpanElement;
    heart: HTMLSpanElement;
    downloaded: HTMLSpanElement;
    separator: HTMLSpanElement;
}

interface StateKey {
    itemUri?: string;
    contextUri?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

async function waitFor<T>(predicate: () => T | null | undefined | false, ms = 100): Promise<NonNullable<T>> {
    let result = predicate();
    while (!result) {
        await new Promise((r) => setTimeout(r, ms));
        result = predicate();
    }
    return result as NonNullable<T>;
}

async function waitForElement(selector: string, warnMsg?: string): Promise<HTMLElement> {
    let el = document.querySelector<HTMLElement>(selector);
    let warned = false;
    while (!el) {
        if (warnMsg && !warned) {
            console.warn(LOG_PREFIX, warnMsg, selector);
            warned = true;
        }
        await new Promise((r) => setTimeout(r, 100));
        el = document.querySelector<HTMLElement>(selector);
    }
    return el;
}

function confirmDialog(
    props: React.ComponentProps<typeof Spicetify.ReactComponent.ConfirmDialog>
): Promise<boolean> {
    return new Promise((resolve) => {
        const portal = document.createElement('div');
        portal.className = 'ReactModalPortal';
        document.body.appendChild(portal);

        const root = createRoot(portal);
        const destroy = () => { root.unmount(); portal.remove(); };

        root.render(
            React.createElement(Spicetify.ReactComponent.ConfirmDialog, {
                ...props,
                isOpen: true,
                onConfirm: (e: any) => { props.onConfirm?.(e); destroy(); resolve(true); },
                onClose:   (e: any) => { props.onClose?.(e);   destroy(); resolve(false); },
                onOutside: (e: any) => { props.onOutside?.(e); destroy(); resolve(false); },
            })
        );
    });
}

function stateKeysEqual(a: StateKey, b: StateKey): boolean {
    return a.itemUri === b.itemUri && a.contextUri === b.contextUri;
}

// ── CSS ────────────────────────────────────────────────────────────────

function createStyleSheet(attachSelector: string): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
        ${attachSelector} { align-items: center; }
        #playing-tags {
            display: flex;
            gap: 4px;
            min-width: 0;
            align-items: center;
        }
        #playing-tags span { display: flex; align-items: center; }
        .playing-heart-tag { cursor: pointer; }
        .playing-explicit-tag {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            background-color: var(--text-subdued);
            border-radius: 2px;
            color: var(--background-base);
            font-size: 10px;
            font-weight: 600;
            padding-inline: 4px;
            user-select: none;
        }
        .playing-downloaded-tag { fill: #1ed760; }
        .playing-playlist-tag { border-radius: 15%; }
    `;
    return style;
}

// ── DOM Construction ───────────────────────────────────────────────────

function createTagElements(): TagElements {
    const wrapper = document.createElement('div');
    wrapper.id = 'playing-tags';

    // Explicit badge
    const explicit = document.createElement('span');
    explicit.dataset.encoreId = 'text';
    explicit.className = 'e-9640-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges';
    const eBadge = document.createElement('span');
    eBadge.className = 'playing-explicit-tag';
    eBadge.title = eBadge.ariaLabel = 'Explicit';
    eBadge.textContent = 'E';
    explicit.appendChild(eBadge);

    // Playlist / context image
    const playlist = document.createElement('span');
    playlist.className = 'Wrapper-sm-only Wrapper-small-only';
    const playlistImg = document.createElement('img');
    playlistImg.width = 14;
    playlistImg.height = 14;
    playlistImg.classList.add('Svg-img-icon-small-textBrightAccent', 'playing-playlist-tag');
    playlist.appendChild(playlistImg);

    // Heart (liked) icon
    const heart = document.createElement('span');
    heart.className = 'Wrapper-sm-only Wrapper-small-only';
    heart.title = 'Liked song';
    const heartSvg = document.createElementNS(SVG_NS, 'svg');
    heartSvg.setAttribute('viewBox', '0 0 24 24');
    heartSvg.setAttribute('width', '14');
    heartSvg.setAttribute('height', '14');
    heartSvg.classList.add('Svg-img-icon-small-textBrightAccent', 'playing-playlist-tag', 'playing-heart-tag');
    const heartPath = document.createElementNS(SVG_NS, 'path');
    heartPath.setAttribute(
        'd',
        'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
    );
    heartPath.setAttribute('fill', 'currentColor');
    heartSvg.appendChild(heartPath);
    heart.appendChild(heartSvg);

    // Downloaded icon
    const downloaded = document.createElement('span');
    downloaded.dataset.encoreId = 'text';
    downloaded.className = 'encore-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges';
    downloaded.title = 'Available offline';
    const dlSvg = document.createElementNS(SVG_NS, 'svg');
    dlSvg.setAttribute('viewBox', '0 0 16 16');
    dlSvg.setAttribute('height', '12');
    dlSvg.dataset.encoreId = 'icon';
    dlSvg.setAttribute('role', 'img');
    dlSvg.setAttribute('aria-hidden', 'false');
    dlSvg.classList.add('Svg-img-icon-small-textBrightAccent', 'playing-playlist-tag', 'playing-downloaded-tag');
    const dlPath = document.createElementNS(SVG_NS, 'path');
    dlPath.setAttribute(
        'd',
        'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-4.75a.75.75 0 0 0-.75.75v5.94L6.055 8.744a.75.75 0 1 0-1.06 1.06L8 12.811l3.005-3.006a.75.75 0 1 0-1.06-1.06L8.75 9.939V4A.75.75 0 0 0 8 3.25z'
    );
    dlSvg.appendChild(dlPath);
    downloaded.appendChild(dlSvg);

    // Separator dot
    const separator = document.createElement('span');
    separator.className = 'e-9640-text encore-text-marginal';
    separator.dataset.encoreId = 'text';
    separator.style.paddingLeft = '2px';
    separator.style.paddingRight = '1px';
    separator.textContent = '•';

    // Start hidden
    [explicit, playlist, heart, downloaded, separator].forEach((el) => (el.style.display = 'none'));
    wrapper.append(explicit, playlist, heart, downloaded, separator);

    return { wrapper, explicit, playlist, heart, downloaded, separator };
}

// ── Context Image Logic ────────────────────────────────────────────────

async function updateContextImage(state: any, track: any, playlistSpan: HTMLSpanElement): Promise<boolean> {
    const ctx = state.context;
    if (!ctx) {
        playlistSpan.style.display = 'none';
        return false;
    }

    const uriParts = ctx.uri.split(':');
    const contextType = uriParts[1];
    const isDjContext = ctx.metadata?.agentic_product_type === 'dj';
    const isDjItem = track.metadata?.is_narration === 'true';
    const img = playlistSpan.querySelector('img')!;
    let pathname: string | undefined;

    if (isDjItem) {
        playlistSpan.style.display = 'none';
        return false;
    }

    if (isDjContext) {
        img.src = DJ_COVER_ART_URL;
        playlistSpan.title = 'Playing from DJ';
        playlistSpan.style.display = 'inherit';
        playlistSpan.onclick = null;
        playlistSpan.style.cursor = 'default';
        return true;
    }

    if (contextType === 'user' && uriParts[3] === 'collection') {
        pathname = '/collection/tracks';
        img.src = LIKED_ART_URL;
        playlistSpan.title = 'Playing from Liked Songs';
    } else if (contextType === 'playlist' || contextType === 'album') {
        try {
            const meta = await Spicetify.Platform.PlaylistAPI.getMetadata(ctx.uri);
            if (meta?.images?.[0]?.url && !(meta.canPlay === false && meta.isSaved && meta.name === 'DJ')) {
                pathname = `/${uriParts[1]}/${uriParts[2]}`;
                img.src = meta.images[0].url;
                playlistSpan.title = `Playing from ${meta.name}`;
            } else {
                playlistSpan.style.display = 'none';
                return false;
            }
        } catch (err) {
            console.warn(LOG_PREFIX, `Failed to get context metadata: ${ctx.uri}`, err);
            playlistSpan.style.display = 'none';
            return false;
        }
    } else {
        playlistSpan.style.display = 'none';
        return false;
    }

    playlistSpan.style.display = 'inherit';
    if (pathname) {
        playlistSpan.onclick = () =>
            Spicetify.Platform.History.push({
                pathname,
                search: `?uid=${track.uid}&uri=${track.uri}`,
            });
        playlistSpan.style.cursor = 'pointer';
    } else {
        playlistSpan.onclick = null;
        playlistSpan.style.cursor = 'default';
    }
    return true;
}

// ── Tag Update Logic ───────────────────────────────────────────────────

async function updateTags(state: any, els: TagElements, requestUpdate: () => void): Promise<boolean> {
    const track = state.item;
    if (!track) return false;

    let visible = false;

    // Explicit
    const isExplicit = !!track.isExplicit;
    els.explicit.style.display = isExplicit ? 'inherit' : 'none';
    visible ||= isExplicit;

    // Liked
    const isLiked = track.metadata?.['collection.in_collection'] === 'true';
    els.heart.style.display = isLiked ? 'inherit' : 'none';
    visible ||= isLiked;
    if (isLiked) {
        els.heart.onclick = async () => {
            const confirmed = await confirmDialog({
                titleText: 'Remove from Liked Songs?',
                descriptionText: 'You will not see this song in your Liked Songs.',
                confirmText: 'Delete',
                cancelText: 'Keep',
            });
            if (confirmed) {
                (Spicetify.Player as any).setHeart(false);
                setTimeout(requestUpdate, 200);
            }
        };
    } else {
        els.heart.onclick = null;
    }

    // Downloaded
    const isDownloaded = track.metadata?.marked_for_download === 'true';
    els.downloaded.style.display = isDownloaded ? 'inherit' : 'none';
    visible ||= isDownloaded;

    // Context image
    visible ||= await updateContextImage(state, track, els.playlist);

    els.separator.style.display = visible ? 'inherit' : 'none';
    return visible;
}

// ── Antigravity Button Reposition ──────────────────────────────────────

function repositionAntigravityButton(): void {
    const bar = document.querySelector('.main-nowPlayingBar-extraControls');
    if (!bar) return;

    const btn = Array.from(bar.querySelectorAll('span[role="presentation"]')).find((el) => {
        const d = el.querySelector('svg path')?.getAttribute('d');
        return d?.startsWith('M7.813 14.497') ?? false;
    }) as HTMLElement | undefined;

    if (!btn) return;
    if (btn.style.order !== '-1') btn.style.order = '-1';
    if (bar.firstElementChild !== btn) bar.prepend(btn);
}

// ── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    await waitFor(() => window.Spicetify && Spicetify.showNotification);

    // Clean up any previous instance
    window.playingTagsCleanup?.();
    document.querySelectorAll('#playing-tags').forEach((el) => el.remove());

    // Detect OS (needed for Windows songchange workaround)
    window.operatingSystem ??= null;
    window.playingTagsAttachSelector ??= DEFAULT_ATTACH_SELECTOR;
    await waitFor(() => Spicetify.Player?.data?.item);
    if (window.operatingSystem == null) {
        window.operatingSystem = await Spicetify.Platform.operatingSystem;
    }

    // Build DOM
    const attachSelector = window.playingTagsAttachSelector!;
    await waitForElement(attachSelector, 'Attach selector not found:');
    const els = createTagElements();

    // State tracking
    let lastState: StateKey = {};

    const update = async () => {
        const parent = els.wrapper.parentElement
            || await waitForElement(attachSelector, 'Attach selector not found:');

        const state = await Spicetify.Platform.PlayerAPI.getState();
        const current: StateKey = { itemUri: state.item?.uri, contextUri: state.context?.uri };

        let tagsVisible: boolean;
        if (!stateKeysEqual(current, lastState) || !els.wrapper.isConnected) {
            lastState = current;
            tagsVisible = await updateTags(state, els, update);
        } else {
            tagsVisible =
                els.explicit.style.display !== 'none' ||
                els.playlist.style.display !== 'none' ||
                els.heart.style.display !== 'none' ||
                els.downloaded.style.display !== 'none';
        }

        if (tagsVisible && parent && !els.wrapper.isConnected) {
            parent.querySelectorAll('#playing-tags').forEach((el) => {
                if (el !== els.wrapper) el.remove();
            });
            parent.prepend(els.wrapper);
        } else if (!tagsVisible && els.wrapper.isConnected) {
            els.wrapper.remove();
        }
    };

    // Listen for song changes
    const onSongChange = () => setTimeout(update, 1);
    Spicetify.Player.addEventListener('songchange', onSongChange);

    if (window.operatingSystem === 'Windows') {
        Spicetify.Player.dispatchEvent(new Event('songchange'));
    } else {
        update();
    }

    // Inject styles
    document.head.appendChild(createStyleSheet(attachSelector));

    // Observe DOM for antigravity button repositioning
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes.length > 0) {
                repositionAntigravityButton();
                return;
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    repositionAntigravityButton();

    // Register cleanup for hot-reload
    window.playingTagsCleanup = () => {
        Spicetify.Player.removeEventListener('songchange', onSongChange);
        els.wrapper.remove();
        observer.disconnect();
    };
}

main().catch((e) => console.error(LOG_PREFIX, 'fatal error', e));

export default main;
