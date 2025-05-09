// @ts-check
// NAME: Search Modal Queue
// AUTHOR: Alehaaaa
// DESCRIPTION: Adds Ctrl+Enter to add selected items from the search modal to the queue.
// VERSION: 1.0.1

// --- JSDoc Type Definitions for Spicetify ---

/**
 * Interface for the Spicetify Player API.
 * @typedef {object} SpicetifyPlayerAPI
 */

/**
 * Interface for the Spicetify Cosmos Async API.
 * @typedef {object} SpicetifyCosmosAsyncAPI
 */

/**
 * Interface for the Spicetify Cosmos Async API.
 * @typedef {object} SpicetifyPlatform
 */

/**
 * Adds one or more URIs or track objects to the user's queue.
 * @typedef {function(Array<string>|Array<{uri: string}>): Promise<void>} addToQueue
 */

/**
 * Interface for the Spicetify GraphQL API.
 * @typedef {object} SpicetifyGraphQLAPI
 * @property {function(object): Promise<object>} Request - Sends a GraphQL request.
 */

/**
 * The main Spicetify API object available in extensions.
 * @typedef {object} SpicetifyAPI
 * @property {function(string, boolean=, number=): void} showNotification - Displays a notification message to the user.
 * @property {SpicetifyPlayerAPI} Player - The Spicetify Player API.
 * @property {SpicetifyPlatform} Platform - The Spicetify Player API.
 * @property {SpicetifyCosmosAsyncAPI} CosmosAsync - The Spicetify Cosmos Async API.
 * @property {SpicetifyGraphQLAPI} GraphQL - The Spicetify GraphQL API.
 * @property {addToQueue} addToQueue - Function to add tracks to the queue.
 * @property {object} URI - Object containing URI utility functions. */


// --- Tell TypeScript Spicetify exists on window ---
/** @type {Window & typeof globalThis & { Spicetify: SpicetifyAPI }} */

const typedWindow = /** @type {any} */ (window);
const LOG_PREFIX = '[SearchModalQueue]';


(function searchModalQueue() {
	const { Spicetify } = typedWindow; // Use the typed window
	if (!Spicetify || !Spicetify.Player || !Spicetify.CosmosAsync) {
		// console.warn(LOG_PREFIX, "Spicetify not ready, trying again in 500ms.");
		setTimeout(searchModalQueue, 500);
		return;
	}

	// console.log(LOG_PREFIX, "Extension loaded.");
	const SNACKBAR_CONTAINER_ID = 'custom-snackbar-container';

	// --- Custom Snackbar Implementation ---

	/**
	 * Creates and manages the snackbar container element.
	 * Appends it to document.body to ensure high visibility.
	 * @returns {HTMLElement} The snackbar container element.
	 */
	function getOrCreateSnackbarContainer() {
		let container = document.getElementById(SNACKBAR_CONTAINER_ID);
		if (!container) {
			container = document.createElement('div');
			container.id = SNACKBAR_CONTAINER_ID;
			// --- Basic Styling (add more CSS rules below) ---
			container.style.position = 'fixed';
			container.style.bottom = '30px'; // Position from bottom
			container.style.zIndex = '10000'; // High z-index to appear above most elements
			container.style.display = 'flex';
			container.style.flexDirection = 'column-reverse'; // Newest snackbar appears at the bottom
			container.style.alignItems = 'center'; // Center snackbars within the container
			container.style.gap = '10px'; // Space between snackbars
			// Ensure it doesn't block interaction if it somehow grows too wide
			container.style.width = '100%';

			document.body.appendChild(container);

			// --- Inject CSS for Snackbar Styling ---
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
                    opacity: 0; /* Start hidden for animation */
                    transform: translateY(20px); /* Start slightly lower for animation */
                    animation: snackbar-fade-in 0.3s ease-out forwards;
                    max-width: 500px; /* Prevent overly wide snackbars */
                    word-wrap: break-word; /* Ensure long text wraps */

					text-align: center; /* Center text inside snackbar */
					margin-inline: auto; /* Center the snackbar horizontally */
                }

                #${SNACKBAR_CONTAINER_ID} .custom-snackbar.error {
                    background-color: #d32f2f; /* Red for errors */
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
                        transform: translateY(20px); /* Move down slightly on exit */
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
		// Add ARIA roles for accessibility
		snackbar.setAttribute('role', 'alert');
		snackbar.setAttribute('aria-live', 'assertive');


		// Prepend to have the newest at the bottom visually due to flex-direction: column-reverse
		container.prepend(snackbar);

		// Automatically remove the snackbar after the duration
		setTimeout(() => {
			snackbar.classList.add('exit'); // Add exit animation class
			// Remove the element after the animation completes
			snackbar.addEventListener('animationend', () => {
				if (snackbar.parentNode === container) { // Check if it hasn't been removed already
					container.removeChild(snackbar);
				}
				// Optional: Remove container if empty? Decide based on preference.
				// if (container.children.length === 0) {
				//    container.remove();
				// }
			}, { once: true }); // Ensure the listener runs only once

		}, duration);
	}

	const SEARCH_MODAL_SELECTOR = 'div[role="dialog"] #search-modal-listbox'; // More specific selector for the modal containing the listbox
	const ACCESSIBILITY_BAR_SELECTOR = '.search-modal-keyboard-accessibility-bar';
	const SELECTED_ITEM_SELECTOR = '.search-modal-resultItem[aria-selected="true"]';
	const HINT_ID = 'search-modal-queue-hint'; // ID to prevent duplicate hints

	/** @type {MutationObserver | null} */
	let observer = null;
	let keydownListenerAttached = false;

	// --- Helper Functions ---

	/**
	 * @returns {object | null}
	 */
	function getSelectedUriAndTitle() {
		const selectedItem = document.querySelector(SELECTED_ITEM_SELECTOR);
		let uri = Object.create(null);
		if (!selectedItem) return uri;

		// const titleElement = selectedItem.querySelector('span.hidden-visually');

		// console.log(LOG_PREFIX, selectedItem);

		const href = selectedItem.getAttribute('href');
		if (href) {
			uri = Spicetify.URI.from(href)
		};
		return uri;
	}

	async function handleCtrlEnter(showNotification) {
		const selectedInfo = getSelectedUriAndTitle();
		if (!selectedInfo) {
			// console.log(LOG_PREFIX, "No selected item found.");
			return;
		}

		try {
			let info
			let tracks = []
			let title = ''; // Initialize title

			switch (selectedInfo.type) {
				case 'track':
					info = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${selectedInfo.id}`);
					tracks = [{ uri: selectedInfo.toURI() }];
					title = `“${info.name}” by ${info.artists[0].name} (Track)`;
					break;
	
				case 'episode':
					info = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/episodes/${selectedInfo.id}`);
					tracks = [{ uri: selectedInfo.toURI() }];
					title = `“${selectedInfo.name}” (Episode)`;
					break;
	
				case 'album':
					info = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/albums/${selectedInfo.id}/`);
					await Spicetify.Platform.AlbumAPI.getContents(selectedInfo.toURI()).then(data => {
						tracks = data.items
						title = `“${info.name}” by ${info.artists[0].name} (Album) - ${tracks.length} track${tracks.length > 1 ? 's' : ''}`;
					})
					break;
	
				case 'playlist':
				case 'playlist-v2':
					info = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/playlists/${selectedInfo.id}/`);
					await Spicetify.Platform.PlaylistAPI.getContents(selectedInfo.toURI()).then(data => {
						tracks = data.items
						title = `“${info.name}” by ${info.owner.display_name} (Playlist) - ${tracks.length} track${tracks.length > 1 ? 's' : ''}`;
					})
					break;
	
				case 'show':
					info = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/shows/${selectedInfo.id}/`);
					tracks = await fetchPages(`shows/${selectedInfo.id}/episodes?limit=50`);
					tracks.reverse()
					title = `“${info.name}” (Show) - ${tracks.length} episode${tracks.length > 1 ? 's' : ''}`;
					break;
	
				case 'artist':
					info = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/artists/${selectedInfo.id}/`);
					try {
						// Try playlist "This Is [Artist]"
						const query = encodeURIComponent(`This Is ${info.name}`);
						const search = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/search?q=${query}&type=playlist&limit=1`);
						const thisIsPlaylist = search?.playlists?.items?.[0];
				
						if (thisIsPlaylist) {
							const playlistId = thisIsPlaylist.id;
							const playlistData = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/playlists/${playlistId}`);
							const playlistTracks = playlistData.tracks.items.map(item => item.track).filter(Boolean);
				
							tracks = playlistTracks;
							title = `"${thisIsPlaylist.name}" by ${playlistData.owner.display_name} (Playlist) - ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;
							break;
						}
					} catch (error) {
						console.error(LOG_PREFIX, `Error fetching "This Is ${info.name}" playlist`, error);
					}
					tracks = await fetchPages(`artists/${selectedInfo.id}/top-tracks?market=from_token`);
					title = `“${info.name}” (Artist) - ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;
					break;

				default:
					showNotification(LOG_PREFIX + ` Cannot add type “${selectedInfo.type}” to queue`, true, 5000)
					console.error(LOG_PREFIX, `Cannot add type “${selectedInfo.type}” to queue`)
					return
			}

			if (tracks.length === 0) {
				showNotification(`${title} can't be added`, true)
				return
			}

			await Spicetify.addToQueue(tracks)
			console.log(LOG_PREFIX, `${title} added to queue`)
			showNotification(`${title} added to queue`, false)
		} catch (err) {
			showNotification('Error adding to queue.', true)
			console.error(LOG_PREFIX, `${selectedInfo.uri}:`, err, 5000)
		}
	}

	// helper to page through Spotify’s paginated endpoints
	async function fetchPages(u) {
		const allTracks = [];
		let url = `https://api.spotify.com/v1/${u}`;
		console.log("Fetching:", url);
		while (url) {
			try {
				const data = await Spicetify.CosmosAsync.get(url);
				if (!data) break;
				const tracks = data.tracks || (data.items && data.items.map(i => i.track || i)) || [];
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

	// --- Keyboard Event Listener ---

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		// Check if the search modal is still open
		if (!document.querySelector(SEARCH_MODAL_SELECTOR)) {
			// console.log(LOG_PREFIX, "Modal closed, ignoring keydown.");
			removeKeyboardListener(); // Clean up listener if modal closed unexpectedly
			return;
		}

		// Check for Ctrl + Enter (or Command + Enter on Mac)
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault(); // Prevent default 'Enter' action (opening item)
			event.stopPropagation(); // Stop event from bubbling further
			// console.log(LOG_PREFIX, "Ctrl+Enter combination captured.");
			handleCtrlEnter(showNotification);
		}
	}

	function addKeyboardListener() {
		if (!keydownListenerAttached) {
			document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
			keydownListenerAttached = true;
			// console.log(LOG_PREFIX, "Keyboard listener attached.");
		}
	}

	function removeKeyboardListener() {
		if (keydownListenerAttached) {
			document.removeEventListener('keydown', handleKeyDown, true);
			keydownListenerAttached = false;
			// console.log(LOG_PREFIX, "Keyboard listener removed.");
		}
	}

	// --- UI Modification ---

	function addQueueHint() {
		const accessibilityBar = document.querySelector(ACCESSIBILITY_BAR_SELECTOR);
		if (!accessibilityBar || document.getElementById(HINT_ID)) {
			// Bar not found or hint already added
			return;
		}

		// console.log(LOG_PREFIX, "Adding 'Queue' hint.");

		const queueHint = document.createElement('p');
		queueHint.id = HINT_ID;
		queueHint.className = "e-9800-text encore-text-body-small encore-internal-color-text-subdued"; // Match existing style
		queueHint.dataset.encoreId = "text";
		queueHint.style.display = "flex";
		queueHint.style.alignItems = "center";
		queueHint.style.gap = "0";

		// Create KBD elements for better styling consistency
		const ctrlKbd = document.createElement('kbd');
		ctrlKbd.className = "e-9800-text encore-text-body-small encore-internal-color-text-base c4hmXDjs2Dv8n3VCLz1g"; // Match existing style
		ctrlKbd.dataset.encoreId = "text";
		ctrlKbd.textContent = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'; // Use Cmd on Mac

		const enterKbd = document.createElement('kbd');
		enterKbd.className = "e-9800-text encore-text-body-small encore-internal-color-text-base c4hmXDjs2Dv8n3VCLz1g"; // Match existing style
		enterKbd.dataset.encoreId = "text";
		enterKbd.textContent = 'Enter';

		// Add KBDs and text to the paragraph
		queueHint.appendChild(ctrlKbd);
		queueHint.appendChild(document.createTextNode(' ')); // Space between keys
		queueHint.appendChild(enterKbd);
		queueHint.appendChild(document.createTextNode(' Queue'));

		accessibilityBar.appendChild(queueHint);
	}

	function removeQueueHint() {
		const hint = document.getElementById(HINT_ID);
		if (hint) {
			hint.remove();
			// console.log(LOG_PREFIX, "'Queue' hint removed.");
		}
	}


	// --- Mutation Observer ---

	function observeModal() {
		if (observer) {
			observer.disconnect(); // Disconnect previous observer if any
			// console.log(LOG_PREFIX, "Disconnected existing observer.");
		}

		observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'childList') {
					// Check if the modal was added by checking added nodes
					const modalAppeared = Array.from(mutation.addedNodes).some(node => {
						// Check if the node itself is an Element AND (it matches the selector OR it contains the selector)
						return node.nodeType === Node.ELEMENT_NODE &&
							(/** @type {Element} */ (node).matches(SEARCH_MODAL_SELECTOR) || /** @type {Element} */ (node).querySelector(SEARCH_MODAL_SELECTOR));
					});

					// Check if the modal was removed by checking removed nodes
					const modalDisappeared = Array.from(mutation.removedNodes).some(node => {
						// Check if the node itself is an Element AND (it contained the selector)
						// This is harder to check definitively after removal, often checking if the selector *no longer exists* is better
						return node.nodeType === Node.ELEMENT_NODE &&
							(/** @type {Element} */ (node).querySelector(SEARCH_MODAL_SELECTOR) || /** @type {Element} */ (node).matches(SEARCH_MODAL_SELECTOR));
					});

					// Refined check: Does the modal exist now?
					const modalExists = document.querySelector(SEARCH_MODAL_SELECTOR);

					if (modalExists && (modalAppeared || !keydownListenerAttached)) { // If it exists AND (it just appeared OR listener isn't attached yet)
						// console.log(LOG_PREFIX, "Search modal detected or confirmed present.");
						// Use setTimeout to ensure elements are fully rendered after mutation
						setTimeout(() => {
							// Double check existence inside timeout
							if (document.querySelector(SEARCH_MODAL_SELECTOR)) {
								addQueueHint();
								addKeyboardListener();
							} else {
								// console.log(LOG_PREFIX, "Modal disappeared before timeout callback.");
								removeKeyboardListener();
								removeQueueHint();
							}
						}, 150); // Slightly longer delay just in case
					} else if (!modalExists && keydownListenerAttached) { // If it doesn't exist AND listener *was* attached
						// console.log(LOG_PREFIX, "Search modal confirmed closed.");
						removeKeyboardListener();
						removeQueueHint();
					}
				}
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });
		// console.log(LOG_PREFIX, "Mutation observer started.");
	}

	// --- Initial Execution ---
	observeModal();

})();