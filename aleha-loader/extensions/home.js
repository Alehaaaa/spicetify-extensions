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
            marketplaceButtonParent.insertBefore(homeButton, marketplaceButtonParent.firstChild);
            marketplaceButtonParent.insertBefore(historyButtons, marketplaceButtonParent.firstChild);

            console.log("[HomeWhereYouBelong] Moved Home to where it belongs");
        }
    }

    const observer = new MutationObserver(waitForElements);
    observer.observe(document.body, { childList: true, subtree: true });
})();
