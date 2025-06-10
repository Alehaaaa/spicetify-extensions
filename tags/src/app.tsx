// TrackTags.tsx
// Spicetify “Track Tags” plug-in, rewritten as TypeScript/TSX
// -----------------------------------------------------------------
/* eslint-disable @typescript-eslint/ban-ts-comment */

import React from 'react';
const { createRoot } = Spicetify.ReactDOM;


declare global {
	interface Window { operatingSystem: string | null }
}

console.log('[Track Tags] extension loaded');

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
		.playing-tags {
			display: flex;
			gap: 3px;
			min-width: 0;
			align-items: center;
		}
		.playing-tags span {
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

		// Create the root once
		const root = createRoot(portal);

		const destroy = () => {
			// Use root.unmount() for React 18
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

		// Render the component using the root
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
// Tag creation / removal
// ──────────────────────────────────────────────────────────────────────────
async function removeTags(): Promise<void> {
	const target = await waitForElement('.main-nowPlayingWidget-nowPlaying .main-trackInfo-enhanced');
	target.remove();
}

async function addTags(): Promise<{
	explicitContainerSpan: HTMLSpanElement;
	playlistSpan: HTMLSpanElement;
	savedTrackSpan: HTMLSpanElement;
	downloadedSpan: HTMLSpanElement;
	separator: HTMLSpanElement;
}> {
	const target = await waitForElement('.main-nowPlayingWidget-nowPlaying .main-trackInfo-enhanced');

	const wrapper = document.createElement('div');
	wrapper.className = 'playing-tags';
	target.prepend(wrapper);

	// Explicit
	const explicitContainer = document.createElement('span');
	explicitContainer.dataset.encoreId = 'text';
	explicitContainer.className =
		'e-9640-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges';
	const explicit = document.createElement('span');
	explicit.className = 'playing-explicit-tag';
	explicit.title = explicit.ariaLabel = 'Explicit';
	explicit.textContent = 'E';
	explicitContainer.appendChild(explicit);

	// Playlist
	const playlistSpan = document.createElement('span');
	playlistSpan.className = 'Wrapper-sm-only Wrapper-small-only';
	const playlistImg = document.createElement('img');
	playlistImg.setAttribute('width', '14');
	playlistImg.setAttribute('height', '14');
	playlistImg.classList.add(
		'Svg-img-icon-small-textBrightAccent',
		'playing-playlist-tag'
	);
	playlistSpan.appendChild(playlistImg);

	// Heart
	const savedTrackSpan = document.createElement('span');
	savedTrackSpan.className = 'Wrapper-sm-only Wrapper-small-only';
	savedTrackSpan.title = 'Liked song';
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
	savedTrackSpan.appendChild(heartSvg);

	// Download
	const downloadedSpan = document.createElement('span');
	downloadedSpan.dataset.encoreId = 'text';
	downloadedSpan.className =
		'encore-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges';
	downloadedSpan.title = 'Available offline';
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
	); const dlPath = document.createElementNS(heartSvgNS, 'path');
	dlPath.setAttribute(
		'd',
		'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-4.75a.75.75 0 0 0-.75.75v5.94L6.055 8.744a.75.75 0 1 0-1.06 1.06L8 12.811l3.005-3.006a.75.75 0 1 0-1.06-1.06L8.75 9.939V4A.75.75 0 0 0 8 3.25z'
	);
	dlSvg.appendChild(dlPath);
	downloadedSpan.appendChild(dlSvg);

	// Separator
	const separator = document.createElement('span');
	separator.className = 'e-9640-text encore-text-marginal';
	separator.dataset.encoreId = 'text';
	separator.style.paddingLeft = '2px';
	separator.style.paddingRight = '1px';
	separator.textContent = '•';

	// Initial visibility
	[explicitContainer, playlistSpan, savedTrackSpan, downloadedSpan, separator].forEach(
		(el) => (el.style.display = 'none')
	);

	wrapper.append(explicitContainer, playlistSpan, savedTrackSpan, downloadedSpan, separator);

	return {
		explicitContainerSpan: explicitContainer,
		playlistSpan,
		savedTrackSpan,
		downloadedSpan,
		separator,
	};
}

// ──────────────────────────────────────────────────────────────────────────
// Main tag-update handler
// ──────────────────────────────────────────────────────────────────────────
async function displayTags(
	state: any,
	explicitContainerSpan: HTMLSpanElement,
	playlistSpan: HTMLSpanElement,
	savedTrackSpan: HTMLSpanElement,
	downloadedSpan: HTMLSpanElement,
	separator: HTMLSpanElement
): Promise<void> {
	let separatorNeeded = false;
	const track = state.item;
	if (!track) return;

	// Explicit
	if (track.isExplicit) {
		separatorNeeded = true;
		explicitContainerSpan.style.display = 'inherit';
	} else explicitContainerSpan.style.display = 'none';

	// Liked
	if (track.metadata?.['collection.in_collection'] === 'true') {
		separatorNeeded = true;
		savedTrackSpan.style.display = 'inherit';
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
					displayTags(
						Spicetify.Platform.PlayerAPI.getState(),
						explicitContainerSpan,
						playlistSpan,
						savedTrackSpan,
						downloadedSpan,
						separator
					);
				}, 200);
			}
		};
	} else savedTrackSpan.style.display = 'none';

	// Downloaded
	if (track.metadata?.marked_for_download === 'true') {
		separatorNeeded = true;
		downloadedSpan.style.display = 'inherit';
	} else downloadedSpan.style.display = 'none';

	// Playlist / context
	const ctx = state.context;
	if (ctx) {
		const uriParts = ctx.uri.split(':');
		const songLocation = `/${uriParts[1]}/${uriParts[2]}/tracks?uri=${track.uri}`;

		let pathname: string | undefined;
		const img = playlistSpan.querySelector('img')!;
		if (uriParts[1] === 'user' && uriParts[3] === 'collection') {
			pathname = '/collection/tracks';
			img.src = 'https://misc.scdn.co/liked-songs/liked-songs-300.png';
			playlistSpan.title = 'Playing from Liked Songs';
			playlistSpan.style.display = 'inherit';
			separatorNeeded = true;
			toggleSeparator(separatorNeeded, separator);
		} else {
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
			} catch {
				playlistSpan.style.display = 'none';
			} finally {
				toggleSeparator(separatorNeeded, separator);
				handleImgClick(playlistSpan, pathname, track);
			}
		}
	} else playlistSpan.style.display = 'none';

	toggleSeparator(separatorNeeded, separator);
}

// ──────────────────────────────────────────────────────────────────────────
// Initialisation
// ──────────────────────────────────────────────────────────────────────────
let explicitContainerSpan: HTMLSpanElement | undefined;
let playlistSpan: HTMLSpanElement | undefined;
let savedTrackSpan: HTMLSpanElement | undefined;
let downloadedSpan: HTMLSpanElement | undefined;
let separator: HTMLSpanElement | undefined;
let lastPlayerState: { item?: string; context?: string } = {};


async function initializeTags(): Promise<void> {
	await waitForSpicetify();

	const initialElements = await addTags();
	if (!initialElements) {
		console.error("Failed to add initial tags. Aborting initialization.");
		return;
	}
	({ explicitContainerSpan, playlistSpan, savedTrackSpan, downloadedSpan, separator } = initialElements);


	const update = async () => {
		if (
			!explicitContainerSpan?.isConnected ||
			!playlistSpan?.isConnected ||
			!savedTrackSpan?.isConnected ||
			!downloadedSpan?.isConnected ||
			!separator?.isConnected
		) {
			console.warn("Tags not connected to DOM. Attempting to re-add.");
			await removeTags(); // Clean up any old, disconnected elements
			const freshElements = await addTags();
			if (!freshElements) {
				console.error("Failed to re-add tags. Cannot update.");
				return;
			}
			({ explicitContainerSpan, playlistSpan, savedTrackSpan, downloadedSpan, separator } = freshElements);
		}

		const state = await Spicetify.Platform.PlayerAPI.getState();
		if (!state?.context) {
			await removeTags();
			lastPlayerState = {}; // Reset last state
			return;
		}

		const current = { item: state.item?.uri, context: state.context?.uri };

		// Only update if the item or context has actually changed
		if (JSON.stringify(current) !== JSON.stringify(lastPlayerState)) {
			lastPlayerState = current; // Update last state
			await displayTags(
				state,
				explicitContainerSpan!,
				playlistSpan!,
				savedTrackSpan!,
				downloadedSpan!,
				separator!
			);
		}
	};

	// Listen for song changes
	Spicetify.Player.addEventListener('songchange', () => setTimeout(update, 1));

	if (window.operatingSystem === 'Windows') {
		Spicetify.Player.dispatchEvent(new Event('songchange'));
	} else {
		update();
	}

	// Append CSS
	document.head.appendChild(await tagCSS());
}

// ──────────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
	await initializeTags();
}

main().catch((e) => console.error('[Track Tags] fatal error', e));

export default main;
