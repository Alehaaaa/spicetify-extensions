console.log('[Track Tags] loaded');

// Wait for spicetify to load initially
async function waitForSpicetify() {
	while (!Spicetify || !Spicetify.showNotification) {
		await new Promise(resolve => setTimeout(resolve, 100));
	}
}
// Wait for the track data to load
async function waitForTrackData() {
	while (!Spicetify.Player.data || !Spicetify.Player.data.item) {
		await new Promise(resolve => setTimeout(resolve, 100));
	}
}

async function waitForElement(selector) {
	let element = document.querySelector(selector);
	while (!element) {
		// Wait 100 ms before trying again
		await new Promise(resolve => setTimeout(resolve, 100));
		element = document.querySelector(selector);
	}
	return element;
}


// Set global operating system variable
window.operatingSystem = window.operatingSystem || null;
(async function () {
	await waitForTrackData();
	if (window.operatingSystem == null) {
		window.operatingSystem = await Spicetify.Platform.operatingSystem;
	}
})();

async function tagCSS() {
	// CSS styles
	const tagStyle = document.createElement('style');
	tagStyle.innerHTML = `
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
        .playing-heart-tag {
            vertical-align: middle;
            cursor: pointer;
        }
        .playing-explicit-tag {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            background-color: var(--text-subdued);
            border-radius: 2px;
            color: var(--background-base);
            flex-wrap: nowrap;
            font-size: 10px;
            font-weight: 600;
            overflow: hidden;
            padding-inline: 4px;
            user-select: none;
        }
        .playing-downloaded-tag {
            fill: #1ed760;
        }
        .playing-playlist-tag {
            border-radius: 15%;
        }
    `;
	return tagStyle;
}


//* Initialize
(async function () {
	await initializeTags();
})();


async function initializeTags() {
	try {
		await waitForSpicetify();
		const initialTags = await addTags();
		let {
			explicitContainerSpan,
			playlistSpan,
			savedTrackSpan,
			downloadedSpan,
			separator
		} = initialTags;

		let lastDetails = await Spicetify.Platform.PlayerAPI.getState();
		console.log(lastDetails);

		if (!lastDetails?.context?.url) {
			await removeTags();
		} else {

			let debounceTimer;
			Spicetify.Player.addEventListener("songchange", async () => {
				if (!debounceTimer) {
					debounceTimer = setTimeout(async () => {
						let nowPlayingDetails = await Spicetify.Platform.PlayerAPI.getState();

						if (!nowPlayingDetails?.context) {
							await removeTags();
						} else {

							let newDetails = {
								item: nowPlayingDetails?.item?.uri,
								context: nowPlayingDetails?.context?.uri
							};

							if (JSON.stringify(newDetails) !== JSON.stringify(lastDetails)) {
								lastDetails = newDetails;

								const spansExist = explicitContainerSpan?.isConnected &&
									playlistSpan?.isConnected &&
									savedTrackSpan?.isConnected &&
									downloadedSpan?.isConnected &&
									separator?.isConnected;

								let currentTags;

								if (!spansExist) {
									currentTags = await addTags();
									({
										explicitContainerSpan,
										playlistSpan,
										savedTrackSpan,
										downloadedSpan,
										separator
									} = currentTags);

								} else {
									currentTags = {
										explicitContainerSpan,
										playlistSpan,
										savedTrackSpan,
										downloadedSpan,
										separator
									};
								}

								await displayTags(
									nowPlayingDetails,
									currentTags.explicitContainerSpan,
									currentTags.playlistSpan,
									currentTags.savedTrackSpan,
									currentTags.downloadedSpan,
									currentTags.separator
								);
							}
						}
						debounceTimer = null;
					}, 1);
				}
			});

			if (window.operatingSystem === "Windows") {
				await Spicetify.Player.dispatchEvent(new Event('songchange'));
			} else {
				let nowPlayingDetails = await Spicetify.Platform.PlayerAPI.getState();

				let newDetails = {
					item: nowPlayingDetails?.item?.uri,
					context: nowPlayingDetails?.context?.uri
				};
				if (newDetails && (newDetails.item || newDetails.context)) {
					lastDetails = newDetails;
					await displayTags(
						nowPlayingDetails,
						explicitContainerSpan,
						playlistSpan,
						savedTrackSpan,
						downloadedSpan,
						separator
					);
				}
			}
		}

		document.head.appendChild(await tagCSS());
	} catch (error) {
		console.error('Error initializing: ', error, "\nCreate a new issue on the github repo to get this resolved");
	}
}


/**
 * Opens a Spicetify ConfirmDialog.
 * @param {Object} props – props accepted by Spicetify.ReactComponent.ConfirmDialog
 * @returns {Promise<boolean>} resolves
 *          • true  → user clicked Confirm  
 *          • false → user cancelled or clicked outside
 */
function confirmDialog(props) {
	return new Promise((resolve) => {
		// 1 · Create a single portal container
		const portal = document.createElement('div');
		portal.className = 'ReactModalPortal';
		document.body.appendChild(portal);

		const destroy = () => {
			root.unmount();
			portal.remove();
		};

		const allProps = {
			...props,
			isOpen: true,
			onConfirm: (e) => {
				props.onConfirm?.(e);
				destroy();
				resolve(true);
			},
			onClose: (e) => {
				props.onClose?.(e);
				destroy();
				resolve(false);
			},
			onOutside: (e) => {
				props.onOutside?.(e);
				destroy();
				resolve(false);
			},
		};

		// 4 · Render via a dedicated React root
		const root = Spicetify.ReactDOM.createRoot(portal);
		root.render(
			Spicetify.React.createElement(
				Spicetify.ReactComponent.ConfirmDialog,
				allProps
			)
		);
	});
}




async function displayTags(nowPlayingPlaylistDetails, explicitContainerSpan, playlistSpan, savedTrackSpan, downloadedSpan, separator) {
	try {
		let showSeparator = false;

		let trackDetails = nowPlayingPlaylistDetails.item;

		if (!trackDetails) {
			return;
		}

		// Check if the song is explicit
		if (trackDetails.isExplicit) {
			showSeparator = true;
			explicitContainerSpan.style.display = 'inherit';
		} else {
			explicitContainerSpan.style.display = 'none';
		}

		// Check if the song is saved to liked songs collection
		if (trackDetails && trackDetails.metadata["collection.in_collection"] === 'true') {

			let showSeparator = true;
			separator.style.display = showSeparator ? 'inherit' : 'none';
			savedTrackSpan.style.display = 'inherit';

			savedTrackSpan.onclick = async function () {
				if (await confirmDialog({
					titleText: 'Remove from Liked Songs?',
					descriptionText: 'You will not see this song in your Liked Songs.',
					confirmText: 'Delete',
					cancelText: 'Keep'
				})) {
					Spicetify.Player.setHeart(false)
					setTimeout(() => {
						displayTags(Spicetify.Platform.PlayerAPI.getState(), explicitContainerSpan, playlistSpan, savedTrackSpan, downloadedSpan, separator)
					}, 200);
				}
			};

		} else {
			savedTrackSpan.style.display = 'none';
		}

		// Check if the song is downloaded
		if (trackDetails.metadata.marked_for_download === 'true') {
			showSeparator = true;
			downloadedSpan.style.display = 'inherit';
		}
		else {
			downloadedSpan.style.display = 'none';
		}


		// Check if the song is saved in a playlist
		const context = nowPlayingPlaylistDetails.context;

		if (context) {
			const contextUri = context.uri;

			const split = contextUri.split(':');
			songLocation = `/${split[1]}/${split[2]}/tracks?uri=${trackDetails.uri}`;

			let pathname;
			let playlistImg = playlistSpan.querySelector('img');

			if (split[1] == "user" && split[3] == "collection") {

				pathname = `/collection/tracks`;
				
				playlistImgSrc = "https://misc.scdn.co/liked-songs/liked-songs-300.png";
				playlistImg.setAttribute('src', playlistImgSrc);

				playlistSpan.setAttribute('title', `Playing from Liked Songs`);

				playlistSpan.style.display = 'inherit';

				showSeparator = true;
				toggleSeparatorVisibility(showSeparator, separator);


			} else {
				Spicetify.Platform.PlaylistAPI.getMetadata(contextUri)
					.then(data => {
						if (data && data.images && data.images.length > 0) {
							if (!(!data.canPlay && data.isSaved && data.name === 'DJ')) {
								pathname = `/${split[1]}/${split[2]}`;
							}
							playlistImgSrc = data.images[0].url;

							playlistImg.setAttribute('src', playlistImgSrc);
							playlistSpan.setAttribute('title', `Playing from ${data.name}`);

							playlistSpan.style.display = 'inherit';

							showSeparator = true;
						}
						else {
							playlistSpan.style.display = 'none';
						}

						toggleSeparatorVisibility(showSeparator, separator);
						handleImgClick(playlistSpan, pathname, trackDetails);

					})
			}
			handleImgClick(playlistSpan, pathname, trackDetails);

		} else {
			playlistSpan.style.display = 'none';
		}

	} catch (error) {
		console.error('Error displaying tags: ', error);
	}
}

function handleImgClick(playlistSpan, pathname, trackDetails) {
	if (pathname) {
		playlistSpan.onclick = function () {
			Spicetify.Platform.History.push({
				pathname,
				search: `?uid=${trackDetails.uid}&uri=${trackDetails.uri}`
			});
		};
		playlistSpan.style.cursor = 'pointer';
	} else {
		playlistSpan.style.cursor = 'default';
	}
}

function toggleSeparatorVisibility(showSeparator, separatorElement) {
	if (separatorElement) {
		separatorElement.style.display = showSeparator ? 'inherit' : 'none';
	}
}

async function removeTags() {
	try {
		const Tagslist = await waitForElement('.main-nowPlayingWidget-nowPlaying .main-trackInfo-enhanced');

		if (!Tagslist) {
			console.warn('[Track Tags] Could not find the target element for tags.');
			return null;
		}

		Tagslist.remove();
	} catch (error) {
		console.error('Error removing tags: ', error);
	}
}


async function addTags() {
	try {
		const Tagslist = await waitForElement('.main-nowPlayingWidget-nowPlaying .main-trackInfo-enhanced');

		if (!Tagslist) {
			console.warn('[Track Tags] Could not find the target element for tags.');
			return null;
		}

		const tagsDiv = document.createElement('div');
		tagsDiv.setAttribute('class', 'playing-tags');
		Tagslist.prepend(tagsDiv);

		// Create the Explicit element
		const explicitContainerSpan = document.createElement('span');
		explicitContainerSpan.setAttribute('data-encore-id', 'text');
		explicitContainerSpan.setAttribute('class', 'e-9640-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges');

		const explicitSpan = document.createElement('span');
		explicitSpan.setAttribute('aria-label', 'Explicit');
		explicitSpan.setAttribute('title', 'Explicit');
		explicitSpan.setAttribute('class', 'playing-explicit-tag');
		explicitSpan.textContent = 'E';

		explicitContainerSpan.appendChild(explicitSpan);

		// Create the Playlist element
		const playlistSpan = document.createElement('span');
		const playlistImg = document.createElement('img');
		playlistSpan.appendChild(playlistImg);
		playlistSpan.setAttribute('class', 'Wrapper-sm-only Wrapper-small-only');
		playlistImg.setAttribute('height', '14');
		playlistImg.setAttribute('width', '14');
		playlistImg.setAttribute('class', 'Svg-img-icon-small-textBrightAccent playing-playlist-tag');


		// Create the Heart element
		const savedTrackSpan = document.createElement('span');
		savedTrackSpan.className = 'Wrapper-sm-only Wrapper-small-only';
		savedTrackSpan.setAttribute('title', 'Liked song');
		const heartSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		heartSvg.setAttribute('viewBox', '0 0 24 24');
		heartSvg.setAttribute('width', '14');
		heartSvg.setAttribute('height', '14');
		heartSvg.setAttribute('class', 'Svg-img-icon-small-textBrightAccent playing-playlist-tag playing-heart-tag'); // Use current color for theming
		const heartPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
		heartPath.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
		heartPath.setAttribute('fill', 'currentColor');
		heartSvg.appendChild(heartPath);
		savedTrackSpan.appendChild(heartSvg);

		// Create the Downloaded element
		const downloadedSpan = document.createElement('span');
		downloadedSpan.setAttribute('class', 'encore-text encore-text-body-medium encore-internal-color-text-subdued main-trackList-rowBadges');
		downloadedSpan.setAttribute('data-encore-id', 'text');
		downloadedSpan.setAttribute('title', 'Available offline');

		const downloadedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		downloadedSvg.setAttribute('viewBox', '0 0 16 16');
		downloadedSvg.setAttribute('height', '12');
		downloadedSvg.setAttribute('data-encore-id', 'icon');
		downloadedSvg.setAttribute('role', 'img');
		downloadedSvg.setAttribute('aria-hidden', 'false');
		downloadedSvg.setAttribute('class', 'Svg-img-icon-small-textBrightAccent playing-playlist-tag playing-downloaded-tag');
		downloadedSpan.appendChild(downloadedSvg);

		const downloadedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		downloadedPath.setAttribute('d', 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-4.75a.75.75 0 0 0-.75.75v5.94L6.055 8.744a.75.75 0 1 0-1.06 1.06L8 12.811l3.005-3.006a.75.75 0 1 0-1.06-1.06L8.75 9.939V4A.75.75 0 0 0 8 3.25z');
		downloadedSvg.appendChild(downloadedPath);



		// Create the Separator element
		const separator = document.createElement('span');
		separator.setAttribute('class', 'e-9640-text encore-text-marginal');
		separator.setAttribute('data-encore-id', 'text');
		separator.setAttribute('style', 'padding-left: 2px; padding-right: 1px;');
		separator.textContent = '•';

		explicitContainerSpan.style.display = 'none';
		playlistSpan.style.display = 'none';
		savedTrackSpan.style.display = 'none';
		downloadedSpan.style.display = 'none';
		separator.style.display = 'none';

		// Append the elements to the tagsDiv
		tagsDiv.appendChild(explicitContainerSpan);
		tagsDiv.appendChild(playlistSpan);
		tagsDiv.appendChild(savedTrackSpan);
		tagsDiv.appendChild(downloadedSpan);
		tagsDiv.appendChild(separator);

		return {
			explicitContainerSpan,
			playlistSpan,
			savedTrackSpan,
			downloadedSpan,
			separator
		};
	} catch (error) {
		console.error('[Track Tags] Error in addTags:', error);
		return null;
	}
}
