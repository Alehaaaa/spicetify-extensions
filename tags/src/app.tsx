/**
 * @fileoverview Spicetify “Track Tags” extension
 * @author Alehaaaa
 */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import React from 'react';
const { createRoot } = Spicetify.ReactDOM;

declare global {
    interface Window { operatingSystem: string | null }
}

const LOG_PREFIX = '[Track Tags]';
console.log(LOG_PREFIX, 'extension loaded');

// ──────────────────────────────────────────────────────────────────────────
// Generic async helpers
// ──────────────────────────────────────────────────────────────────────────
async function waitForSpicetify(): Promise<void> {
    while (!window.Spicetify || !Spicetify.showNotification) {
        await new Promise((r) => setTimeout(r, 100));
    }
}

async function waitForTrackData(): Promise<void> {
    while (!Spicetify.Player?.data?.item) {
        await new Promise((r) => setTimeout(r, 100));
    }
}

/**
 * Waits for a specific DOM element to be available before proceeding.
 * This function is crucial for Spicetify modifications as elements might not be
 * immediately present when the script runs.
 *
 * @param {string} selector
 * @returns {Promise<HTMLElementTagNameMap[K]>}
 */
async function waitForElement<K extends keyof HTMLElementTagNameMap>(
    selector: string
): Promise<HTMLElementTagNameMap[K]> {
    let el = document.querySelector<HTMLElementTagNameMap[K]>(selector);
    while (!el) {
        await new Promise((r) => setTimeout(r, 100));
        el = document.querySelector(selector) as HTMLElementTagNameMap[K] | null;
    }
    return el;
}

// ──────────────────────────────────────────────────────────────────────────
// Global OS cache
// ──────────────────────────────────────────────────────────────────────────
window.operatingSystem = window.operatingSystem ?? null;
(async () => {
    await waitForTrackData();
    if (window.operatingSystem == null) {
        window.operatingSystem = await Spicetify.Platform.operatingSystem;
    }
})();

// ──────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────
async function tagCSS(): Promise<HTMLStyleElement> {
    const style = document.createElement('style');
    style.innerHTML = `
        .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-enhanced {
            align-items: center;
        }
        #playing-tags {
            display: flex;
            gap: 3px;
            min-width: 0;
            align-items: center;
        }
        #playing-tags span {
            display: flex;
            align-items: center;
        }
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

// ──────────────────────────────────────────────────────────────────────────
// UI helpers
// ──────────────────────────────────────────────────────────────────────────
function confirmDialog(
    props: React.ComponentProps<typeof Spicetify.ReactComponent.ConfirmDialog>
): Promise<boolean> {
    return new Promise((resolve) => {
        const portal = document.createElement('div');
        portal.className = 'ReactModalPortal';
        document.body.appendChild(portal);

        const root = createRoot(portal);

        const destroy = () => {
            root.unmount();
            portal.remove();
        };

        const allProps = {
            ...props,
            isOpen: true,
            onConfirm: (e: any) => {
                props.onConfirm?.(e);
                destroy();
                resolve(true);
            },
            onClose: (e: any) => {
                props.onClose?.(e);
                destroy();
                resolve(false);
            },
            onOutside: (e: any) => {
                props.onOutside?.(e);
                destroy();
                resolve(false);
            },
        };

        root.render(React.createElement(Spicetify.ReactComponent.ConfirmDialog, allProps));
    });
}

function toggleSeparator(show: boolean, el: HTMLElement): void {
    el.style.display = show ? 'inherit' : 'none';
}

function handleImgClick(
    playlistSpan: HTMLSpanElement,
    pathname: string | undefined,
    trackDetails: any
): void {
    if (pathname) {
        playlistSpan.onclick = () =>
            Spicetify.Platform.History.push({
                pathname,
                search: `?uid=${trackDetails.uid}&uri=${trackDetails.uri}`,
            });
        playlistSpan.style.cursor = 'pointer';
    } else {
        playlistSpan.style.cursor = 'default';
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Tag creation and management
// ──────────────────────────────────────────────────────────────────────────

/**
 * Creates the initial DOM structure for the playing tags and stores references
 * to its child elements in global variables. This function is called only once
 * during initialization.
 * @returns {HTMLDivElement}
 */
async function createTagsStructure(): Promise<HTMLDivElement> {
    const target = await waitForElement<'div'>('.main-nowPlayingWidget-nowPlaying .main-trackInfo-enhanced');

    const wrapper = document.createElement('div');
    wrapper.id = 'playing-tags';

    // Explicit tag creation
    const explicitContainer = document.createElement('span');
    explicitContainer.dataset.encoreId = 'text';
    explicitContainer.className =
        'e-9640-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges';
    const explicit = document.createElement('span');
    explicit.className = 'playing-explicit-tag';
    explicit.title = explicit.ariaLabel = 'Explicit';
    explicit.textContent = 'E';
    explicitContainer.appendChild(explicit);
    explicitContainerSpan = explicitContainer;

    // Playlist tag creation
    const playlist = document.createElement('span');
    playlist.className = 'Wrapper-sm-only Wrapper-small-only';
    const playlistImg = document.createElement('img');
    playlistImg.setAttribute('width', '14');
    playlistImg.setAttribute('height', '14');
    playlistImg.classList.add(
        'Svg-img-icon-small-textBrightAccent',
        'playing-playlist-tag'
    );
    playlist.appendChild(playlistImg);
    playlistSpan = playlist;

    // Heart tag creation
    const heart = document.createElement('span');
    heart.className = 'Wrapper-sm-only Wrapper-small-only';
    heart.title = 'Liked song';
    const heartSvgNS = 'http://www.w3.org/2000/svg';
    const heartSvg = document.createElementNS(heartSvgNS, 'svg');
    heartSvg.setAttribute('viewBox', '0 0 24 24');
    heartSvg.setAttribute('width', '14');
    heartSvg.setAttribute('height', '14');
    heartSvg.classList.add(
        'Svg-img-icon-small-textBrightAccent',
        'playing-playlist-tag',
        'playing-heart-tag'
    );
    const heartPath = document.createElementNS(heartSvgNS, 'path');
    heartPath.setAttribute(
        'd',
        'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
    );
    heartPath.setAttribute('fill', 'currentColor');
    heartSvg.appendChild(heartPath);
    heart.appendChild(heartSvg);
    savedTrackSpan = heart;

    // Download tag creation
    const downloaded = document.createElement('span');
    downloaded.dataset.encoreId = 'text';
    downloaded.className =
        'encore-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges';
    downloaded.title = 'Available offline';
    const dlSvg = document.createElementNS(heartSvgNS, 'svg');
    dlSvg.setAttribute('viewBox', '0 0 16 16');
    dlSvg.setAttribute('height', '12');
    dlSvg.dataset.encoreId = 'icon';
    dlSvg.setAttribute('role', 'img');
    dlSvg.setAttribute('aria-hidden', 'false');
    dlSvg.classList.add(
        'Svg-img-icon-small-textBrightAccent',
        'playing-playlist-tag',
        'playing-downloaded-tag'
    );
    const dlPath = document.createElementNS(heartSvgNS, 'path');
    dlPath.setAttribute(
        'd',
        'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-4.75a.75.75 0 0 0-.75.75v5.94L6.055 8.744a.75.75 0 1 0-1.06 1.06L8 12.811l3.005-3.006a.75.75 0 1 0-1.06-1.06L8.75 9.939V4A.75.75 0 0 0 8 3.25z'
    );
    dlSvg.appendChild(dlPath);
    downloaded.appendChild(dlSvg);
    downloadedSpan = downloaded;

    // Separator creation
    const sep = document.createElement('span');
    sep.className = 'e-9640-text encore-text-marginal';
    sep.dataset.encoreId = 'text';
    sep.style.paddingLeft = '2px';
    sep.style.paddingRight = '1px';
    sep.textContent = '•';
    separator = sep;

    // Initial visibility (all hidden)
    [explicitContainer, playlist, heart, downloaded, sep].forEach(
        (el) => (el.style.display = 'none')
    );

    wrapper.append(explicitContainer, playlist, heart, downloaded, sep);

    return wrapper;
}


/**
 * Updates the visibility and content of the existing tag elements based on the
 * current player state. This function does not create or remove elements,
 * but rather modifies their display properties and event listeners.
 *
 * @param {any} state Spicetify.Platform.PlayerAPI.getState()
 * @param {HTMLSpanElement} explicitContainerSpan
 * @param {HTMLSpanElement} playlistSpan
 * @param {HTMLSpanElement} savedTrackSpan
 * @param {HTMLSpanElement} downloadedSpan
 * @param {HTMLSpanElement} separator
 * @returns {boolean}
 */
async function updateTags(
    state: any,
    explicitContainerSpan: HTMLSpanElement,
    playlistSpan: HTMLSpanElement,
    savedTrackSpan: HTMLSpanElement,
    downloadedSpan: HTMLSpanElement,
    separator: HTMLSpanElement
): Promise<boolean> {
    let separatorNeeded = false;
    const track = state.item;
    if (!track) return false;

    // Explicit Tag
    if (track.isExplicit) {
        explicitContainerSpan.style.display = 'inherit';
        separatorNeeded = true;
    } else {
        explicitContainerSpan.style.display = 'none';
    }

    // Liked Song Tag
    if (track.metadata?.['collection.in_collection'] === 'true') {
        savedTrackSpan.style.display = 'inherit';
        separatorNeeded = true;
        savedTrackSpan.onclick = async () => {
            if (
                await confirmDialog({
                    titleText: 'Remove from Liked Songs?',
                    descriptionText: 'You will not see this song in your Liked Songs.',
                    confirmText: 'Delete',
                    cancelText: 'Keep',
                })
            ) {
                (Spicetify.Player as any).setHeart(false);
                setTimeout(() => {
                    update();
                }, 200);
            }
        };
    } else {
        savedTrackSpan.style.display = 'none';
    }

    // Downloaded Tag
    if (track.metadata?.marked_for_download === 'true') {
        downloadedSpan.style.display = 'inherit';
        separatorNeeded = true;
    } else {
        downloadedSpan.style.display = 'none';
    }

    // Playlist / Context Tag
    const ctx = state.context;
    if (ctx) {
        const uriParts = ctx.uri.split(':');
        const contextType = uriParts[1];

        let pathname: string | undefined;
        const img = playlistSpan.querySelector('img')!;

        // Handle Liked Songs special case
        if (contextType === 'user' && uriParts[3] === 'collection') {
            pathname = '/collection/tracks';
            img.src = 'https://misc.scdn.co/liked-songs/liked-songs-300.png';
            playlistSpan.title = 'Playing from Liked Songs';
            playlistSpan.style.display = 'inherit';
            separatorNeeded = true;
        }
        // Handle actual playlist or album contexts
        else if (contextType === 'playlist' || contextType === 'album') {
            try {
                const meta = await Spicetify.Platform.PlaylistAPI.getMetadata(ctx.uri);
                if (meta?.images?.[0]?.url && !(meta.canPlay === false && meta.isSaved && meta.name === 'DJ')) {
                    pathname = `/${uriParts[1]}/${uriParts[2]}`;
                    img.src = meta.images[0].url;
                    playlistSpan.title = `Playing from ${meta.name}`;
                    playlistSpan.style.display = 'inherit';
                    separatorNeeded = true;
                } else {
                    playlistSpan.style.display = 'none';
                }
            } catch (error) {
                console.warn(LOG_PREFIX, `Failed to get metadata for ${contextType} context: ${ctx.uri}`, error);
                playlistSpan.style.display = 'none';
            }
        }
        else {
            playlistSpan.style.display = 'none';
        }
        handleImgClick(playlistSpan, pathname, track);

    } else {
        // If no context, hide playlist tag
        playlistSpan.style.display = 'none';
    }

    toggleSeparator(separatorNeeded, separator);
    return separatorNeeded;
}

// ──────────────────────────────────────────────────────────────────────────
// Global state and main update loop
// ──────────────────────────────────────────────────────────────────────────
let playingTagsWrapper: HTMLDivElement | undefined;
let explicitContainerSpan: HTMLSpanElement | undefined;
let playlistSpan: HTMLSpanElement | undefined;
let savedTrackSpan: HTMLSpanElement | undefined;
let downloadedSpan: HTMLSpanElement | undefined;
let separator: HTMLSpanElement | undefined;
let lastPlayerState: { item?: string; context?: string } = {};

/**
 * The main update function for the track tags. It detaches the tags element,
 * updates its content, and then re-attaches it if any tags are valid.
 */
const update = async () => {
    if (!playingTagsWrapper) {
        return;
    }
    const targetParent = playingTagsWrapper.parentElement || await waitForElement<'div'>('.main-nowPlayingWidget-nowPlaying .main-trackInfo-enhanced');

    const state = await Spicetify.Platform.PlayerAPI.getState();
    const current = { item: state.item?.uri, context: state.context?.uri };

    let tagsAreVisible = false;
    if (JSON.stringify(current) !== JSON.stringify(lastPlayerState) || !playingTagsWrapper.isConnected) {
        lastPlayerState = current; // Update last state

        tagsAreVisible = await updateTags(
            state,
            explicitContainerSpan!,
            playlistSpan!,
            savedTrackSpan!,
            downloadedSpan!,
            separator!
        );
    } else {
        tagsAreVisible = explicitContainerSpan?.style.display !== 'none' ||
                         playlistSpan?.style.display !== 'none' ||
                         savedTrackSpan?.style.display !== 'none' ||
                         downloadedSpan?.style.display !== 'none';
    }


    if (tagsAreVisible && targetParent && !playingTagsWrapper.isConnected) {
        targetParent.prepend(playingTagsWrapper);
    } else if (!tagsAreVisible && playingTagsWrapper.isConnected) {
         playingTagsWrapper.remove();
    }
};

// ──────────────────────────────────────────────────────────────────────────
// Initialisation
// ──────────────────────────────────────────────────────────────────────────
async function initializeTags(): Promise<void> {
    await waitForSpicetify();

    playingTagsWrapper = await createTagsStructure();
    if (!playingTagsWrapper) {
        console.error(LOG_PREFIX, "Failed to create initial tags structure. Aborting initialization.");
        return;
    }
    Spicetify.Player.addEventListener('songchange', () => setTimeout(update, 1));

    if (window.operatingSystem === 'Windows') {
        Spicetify.Player.dispatchEvent(new Event('songchange'));
    } else {
        update();
    }

    document.head.appendChild(await tagCSS());
}

// ──────────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
    await initializeTags();
}

main().catch((e) => console.error(LOG_PREFIX, 'fatal error', e));

export default main;
