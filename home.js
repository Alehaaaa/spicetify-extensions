// NAME: HomeWhereYouBelong
// AUTHOR: yodaluca23 & Alehaaaa
// DESCRIPTION: Move Home and History Buttons into custom nav container.

(function HomeWhereYouBelong() {
    function waitForElements() {
        const homeButton = document.querySelector('button[aria-label="Home"]');
        const historyButtons = document.querySelector('.main-globalNav-historyButtons');
        const marketplaceButton = document.querySelector('button[aria-label="Marketplace"]');

        if (homeButton && historyButtons && marketplaceButton) {
            observer.disconnect();
            const marketplaceButtonParent = marketplaceButton.parentElement;
            // Move Home button to the beginning of customIcons.
            marketplaceButtonParent.insertBefore(homeButton, marketplaceButtonParent.firstChild);
            // Move History buttons to the beginning of customIcons (after Home).
            marketplaceButtonParent.insertBefore(historyButtons, marketplaceButtonParent.firstChild);

            console.log("[HomeWhereYouBelong] Moved Home to where it belongs");
        }
    }

    const observer = new MutationObserver(waitForElements);
    observer.observe(document.body, { childList: true, subtree: true });
})();
