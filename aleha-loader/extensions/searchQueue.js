// @ts-check
// NAME: Search Modal Queue
// AUTHOR: Alehaaaa
// DESCRIPTION: Adds Ctrl+Enter to add selected items from the search modal to the queue.
// VERSION: 1.0.1

/**
 * @typedef {object} SpicetifyPlayerAPI
 */

/**
 * @typedef {object} SpicetifyCosmosAsyncAPI
 */

/**
 * @typedef {object} SpicetifyPlatform
 */

/**
 * Adds one or more URIs or track objects to the user's queue.
 * @typedef {function(Array<string>|Array<{uri: string}>): Promise<void>} addToQueue
 */

/**
 * @typedef {object} SpicetifyGraphQLAPI
 * @property {function(object): Promise<object>} Request - Sends a GraphQL request.
 */

/**
 * @typedef {object} SpicetifyAPI
 * @property {function(string, boolean=, number=): void} showNotification - Displays a notification message to the user.
 * @property {SpicetifyPlayerAPI} Player - The Spicetify Player API.
 * @property {SpicetifyPlatform} Platform - The Spicetify Player API.
 * @property {SpicetifyCosmosAsyncAPI} CosmosAsync - The Spicetify Cosmos Async API.
 * @property {SpicetifyGraphQLAPI} GraphQL - The Spicetify GraphQL API.
 * @property {addToQueue} addToQueue - Function to add tracks to the queue.
 * @property {object} URI - Object containing URI utility functions. */

/** @type {Window & typeof globalThis & { Spicetify: SpicetifyAPI }} */
const typedWindow = /** @type {any} */ (window);
const LOG_PREFIX = '[SearchModalQueue]';

const { Spicetify } = /** @type {{ Spicetify: any }} */ (typedWindow);
const SpicetifyAny = /** @type {any} */ (Spicetify);


(function searchModalQueue() {
	const { Spicetify } = typedWindow;
	if (!Spicetify || !Spicetify.Player || !SpicetifyAny.CosmosAsync) {
		setTimeout(searchModalQueue, 500);
		return;
	}

	const SNACKBAR_CONTAINER_ID = 'custom-snackbar-container';

	function getOrCreateSnackbarContainer() {
		let container = document.getElementById(SNACKBAR_CONTAINER_ID);
		if (!container) {
			container = document.createElement('div');
			container.id = SNACKBAR_CONTAINER_ID;
			container.style.position = 'fixed';
			container.style.bottom = '30px';
			container.style.zIndex = '10000';
			container.style.display = 'flex';
			container.style.flexDirection = 'column-reverse';
			container.style.alignItems = 'center';
			container.style.gap = '10px';
			container.style.width = '100%';

			document.body.appendChild(container);

			const style = document.createElement('style');
			style.textContent = `
                #${SNACKBAR_CONTAINER_ID} .custom-snackbar {
					background-color: #ffffff;
                    color: #000000;
                    padding: 12px 20px;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    font-family: SpotifyMixUI, CircularSp-Arab, CircularSp-Hebr, CircularSp-Cyrl, CircularSp-Grek, CircularSp-Deva, var(--fallback-fonts, sans-serif);
                    font-size: 1rem;
					font-weight: 400;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: snackbar-fade-in 0.3s ease-out forwards;
                    max-width: 500px;
                    word-wrap: break-word;

					text-align: center;
					margin-inline: auto;
                }

                #${SNACKBAR_CONTAINER_ID} .custom-snackbar.error {
                    background-color: #d32f2f;
                }

                #${SNACKBAR_CONTAINER_ID} .custom-snackbar.exit {
                     animation: snackbar-fade-out 0.3s ease-in forwards;
                }


                @keyframes snackbar-fade-in {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes snackbar-fade-out {
                    from {
                         opacity: 1;
                         transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                }
            `;
			document.head.appendChild(style);
		}
		return container;
	}

	/**
	 * Displays a custom snackbar message.
	 * @param {string} message The text to display.
	 * @param {boolean} [isError=false] If true, applies error styling.
	 * @param {number} [duration] How long to display the message in ms.
	 */
	function showNotification(message, isError = false, duration = 2000) {
		const container = getOrCreateSnackbarContainer();

		const snackbar = document.createElement('div');
		snackbar.className = 'custom-snackbar';
		if (isError) {
			snackbar.classList.add('error');
		}
		snackbar.textContent = message;
		snackbar.setAttribute('role', 'alert');
		snackbar.setAttribute('aria-live', 'assertive');

		container.prepend(snackbar);

		setTimeout(() => {
			snackbar.classList.add('exit');
			snackbar.addEventListener('animationend', () => {
				if (snackbar.parentNode === container) {
					container.removeChild(snackbar);
				}
			}, { once: true });

		}, duration);
	}

	const SEARCH_MODAL_DIALOG_SELECTOR = 'div[role="dialog"][aria-label="Search"][aria-modal="true"]';
	const SEARCH_MODAL_LISTBOX_SELECTOR = `${SEARCH_MODAL_DIALOG_SELECTOR} #search-modal-listbox`;
	const SELECTED_ITEM_SELECTOR = 'a[role="option"][aria-selected="true"]';
	const HINT_ID = 'search-modal-queue-hint';

	/** @type {MutationObserver | null} */
	let observer = null;
	let keydownListenerAttached = false;

	function getSearchModal() {
		return document.querySelector(SEARCH_MODAL_DIALOG_SELECTOR);
	}

	function getSearchListbox() {
		return document.querySelector(SEARCH_MODAL_LISTBOX_SELECTOR);
	}

	function getAccessibilityBar() {
		const modal = getSearchModal();
		if (!modal) return null;

		return Array.from(modal.querySelectorAll("div")).find((el) => {
			if (el.querySelector(`#${HINT_ID}`)) return true;
			const directParagraphs = Array.from(el.children).filter((child) => child.tagName === "P");
			return directParagraphs.length >= 2 && directParagraphs.some((p) => p.querySelector("kbd"));
		}) || null;
	}

	/**
	 * @returns {object | null}
	 */
	function getSelectedUriAndTitle() {
		const selectedItem = getSearchModal()?.querySelector(SELECTED_ITEM_SELECTOR);
		let uri = Object.create(null);
		if (!selectedItem) return uri;

		const href = selectedItem.getAttribute('href');
		if (href) {
			uri = SpicetifyAny.URI.from(href)
		};
		uri.label = selectedItem.querySelector(".hidden-visually")?.textContent?.trim();
		return uri;
	}

	/**
	 * @param {any} item
	 */
	function getArtistNames(item) {
		return item?.artists?.map((/** @type {any} */ artist) => artist?.name).filter(Boolean).join(", ") || "Unknown artist";
	}

	/**
	 * @param {string | null | undefined} fallback
	 * @param {any} item
	 * @param {string} type
	 */
	function getDisplayTitle(fallback, item, type) {
		if (item?.name) {
			const artists = getArtistNames(item);
			return artists === "Unknown artist" ? `"${item.name}" (${type})` : `"${item.name}" by ${artists} (${type})`;
		}

		return fallback || `Selected ${type}`;
	}

	/**
	 * @param {any[] | null | undefined} items
	 */
	function normalizePlayableItems(items) {
		return (items || [])
			.map((/** @type {any} */ item) => item?.item || item?.track || item)
			.filter((/** @type {any} */ item) => item?.uri);
	}

	/** @param {any} showNotification */
	async function handleCtrlEnter(showNotification) {
		/** @type {any} */
		const selectedInfo = getSelectedUriAndTitle();
		if (!selectedInfo) {
			return;
		}

		try {
			/** @type {any} */
			let info
			let tracks = []
			let title = '';

			switch (selectedInfo.type) {
				case 'track':
					info = await SpicetifyAny.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${selectedInfo.id}`);
					tracks = [{ uri: selectedInfo.toURI() }];
					title = getDisplayTitle(selectedInfo.label, info, "Track");
					break;

				case 'episode':
					info = await SpicetifyAny.CosmosAsync.get(`https://api.spotify.com/v1/episodes/${selectedInfo.id}`);
					tracks = [{ uri: selectedInfo.toURI() }];
					title = info?.name ? `"${info.name}" (Episode)` : selectedInfo.label || "Selected episode";
					break;

				case 'album':
					info = await SpicetifyAny.CosmosAsync.get(`https://api.spotify.com/v1/albums/${selectedInfo.id}/`);
					tracks = normalizePlayableItems(info?.tracks?.items);
					title = `${getDisplayTitle(selectedInfo.label, info, "Album")} - ${tracks.length} track${tracks.length > 1 ? 's' : ''}`;
					break;

				case 'playlist':
				case 'playlist-v2':
					info = await SpicetifyAny.CosmosAsync.get(`https://api.spotify.com/v1/playlists/${selectedInfo.id}/`);
					tracks = await fetchPages(`playlists/${selectedInfo.id}/items?limit=50`);
					title = `"${info?.name || selectedInfo.label || "Selected playlist"}" by ${info?.owner?.display_name || "Unknown owner"} (Playlist) - ${tracks.length} item${tracks.length > 1 ? 's' : ''}`;
					break;

				case 'show':
					info = await SpicetifyAny.CosmosAsync.get(`https://api.spotify.com/v1/shows/${selectedInfo.id}/`);
					tracks = await fetchPages(`shows/${selectedInfo.id}/episodes?limit=50`);
					tracks.reverse()
					title = `"${info.name}" (Show) - ${tracks.length} episode${tracks.length > 1 ? 's' : ''}`;
					break;

				case 'artist':
					info = await SpicetifyAny.CosmosAsync.get(`https://api.spotify.com/v1/artists/${selectedInfo.id}/`);
					try {
						const query = encodeURIComponent(`This Is ${info?.name || selectedInfo.label || ""}`);
						const search = await SpicetifyAny.CosmosAsync.get(`https://api.spotify.com/v1/search?q=${query}&type=playlist&limit=10`);
						const thisIsPlaylist = search?.playlists?.items?.[0];

						if (thisIsPlaylist) {
							const playlistData = await SpicetifyAny.CosmosAsync.get(`https://api.spotify.com/v1/playlists/${thisIsPlaylist.id}`);
							tracks = await fetchPages(`playlists/${thisIsPlaylist.id}/items?limit=50`);
							title = `"${thisIsPlaylist.name}" by ${playlistData?.owner?.display_name || "Unknown owner"} (Playlist) - ${tracks.length} item${tracks.length !== 1 ? 's' : ''}`;
							break;
						}
					} catch (error) {
						console.error(LOG_PREFIX, `Error fetching "This Is ${info?.name || selectedInfo.label}" playlist`, error);
					}
					title = `"${info?.name || selectedInfo.label || "Selected artist"}" (Artist)`;
					break;

				default:
					showNotification(LOG_PREFIX + ` Cannot add type "${selectedInfo.type}" to queue`, true, 5000)
					console.error(LOG_PREFIX, `Cannot add type "${selectedInfo.type}" to queue`)
					return
			}

			if (tracks.length === 0) {
				showNotification(`${title} can't be added`, true)
				return
			}

			await Spicetify.addToQueue(normalizePlayableItems(tracks))
			console.log(LOG_PREFIX, `${title} added to queue`)
			showNotification(`${title} added to queue`, false)
		} catch (err) {
			showNotification('Error adding to queue.', true)
			console.error(LOG_PREFIX, `${selectedInfo.uri}:`, err, 5000)
		}
	}

	/** @param {string} u */
	async function fetchPages(u) {
		const allTracks = [];
		let url = `https://api.spotify.com/v1/${u}`;
		console.log("Fetching:", url);
		while (url) {
			try {
				const data = await SpicetifyAny.CosmosAsync.get(url);
				if (!data) break;
				const tracks = normalizePlayableItems(data.items || data.tracks?.items || data.tracks);
				if (!tracks.length) break;
				allTracks.push(...tracks);
				url = data.next;
				console.log("Fetched:", tracks.length, "Next:", url);
			} catch (e) {
				console.error("Error:", e);
				break;
			}
		}
		console.log("Total:", allTracks.length);
		return allTracks;
	}

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (!getSearchListbox()) {
			removeKeyboardListener();
			return;
		}

		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			handleCtrlEnter(showNotification);
		}
	}

	function addKeyboardListener() {
		if (!keydownListenerAttached) {
			document.addEventListener('keydown', handleKeyDown, true);
			keydownListenerAttached = true;
		}
	}

	function removeKeyboardListener() {
		if (keydownListenerAttached) {
			document.removeEventListener('keydown', handleKeyDown, true);
			keydownListenerAttached = false;
		}
	}

	/**
	 * @param {Element} bar
	 */
	function normalizeMacShortcutGlyphs(bar) {
		if (!navigator.platform.toUpperCase().includes("MAC")) return;

		const kbds = Array.from(bar.querySelectorAll("kbd"));
		kbds.forEach((kbd) => {
			if (["Cmd", "Command"].includes(kbd.textContent?.trim() || "")) {
				kbd.textContent = "⌘";
			}
		});

		kbds.forEach((kbd) => {
			if (kbd.textContent?.trim() === "Shift") {
				const height = kbd.getBoundingClientRect().height;
				kbd.textContent = "⇧";
				kbd.style.fontFamily = "Arial, Helvetica, sans-serif";
				kbd.style.fontSize = "1.1em";
				kbd.style.height = `${height}px`;
				kbd.style.minHeight = `${height}px`;
			}
		});
	}

	function addQueueHint() {
		const bar = getAccessibilityBar();
		if (!bar || document.getElementById(HINT_ID)) return;

		const sample = bar.querySelector("p");
		if (!sample) return;

		const queueHint = document.createElement("p");
		queueHint.id = HINT_ID;

		queueHint.className = sample.className;
		queueHint.dataset.encoreId = sample.dataset.encoreId;
		if (sample.style.cssText) queueHint.style.cssText = sample.style.cssText;

		const sampleKbd = sample.querySelector("kbd") || document.createElement("kbd");

		const ctrlKbd = sampleKbd.cloneNode(false);
		ctrlKbd.textContent = navigator.platform.toUpperCase().includes("MAC") ? "⌘" : "Ctrl";

		const enterKbd = sampleKbd.cloneNode(false);
		enterKbd.textContent = "Enter";

		queueHint.append(ctrlKbd, enterKbd, document.createTextNode(" Queue"));

		bar.appendChild(queueHint);
		normalizeMacShortcutGlyphs(bar);
	}


	function removeQueueHint() {
		const hint = document.getElementById(HINT_ID);
		if (hint) {
			hint.remove();
		}
	}

	function observeModal() {
		if (observer) {
			observer.disconnect();
		}

		observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'childList') {
					const modalAppeared = Array.from(mutation.addedNodes).some(node => {
						return node.nodeType === Node.ELEMENT_NODE &&
							(/** @type {Element} */ (node).matches(SEARCH_MODAL_LISTBOX_SELECTOR) || /** @type {Element} */ (node).querySelector(SEARCH_MODAL_LISTBOX_SELECTOR));
					});

					const modalDisappeared = Array.from(mutation.removedNodes).some(node => {
						return node.nodeType === Node.ELEMENT_NODE &&
							(/** @type {Element} */ (node).querySelector(SEARCH_MODAL_LISTBOX_SELECTOR) || /** @type {Element} */ (node).matches(SEARCH_MODAL_LISTBOX_SELECTOR));
					});

					const modalExists = getSearchListbox();

					if (modalExists && (modalAppeared || !keydownListenerAttached)) {
						setTimeout(() => {
							if (getSearchListbox()) {
								addQueueHint();
								addKeyboardListener();
							} else {
								removeKeyboardListener();
								removeQueueHint();
							}
						}, 150);
					} else if (!modalExists && keydownListenerAttached) {
						removeKeyboardListener();
						removeQueueHint();
					}
				}
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });
	}

	observeModal();

})();
