import Loader from './loader';

export default async function main(): Promise<void> {
  /* your previous startup logic */
  await Loader();

/* single <style> tag with all rules, but *scoped* to our id */
const style = document.createElement('style');
style.textContent = `
  button[id="ale-loader-settings.save-and-reload"] {
    /* encore-text-body-small-bold */
    font-weight: 700;
    /* encore-text-body-small */
    font-family: var(--encore-body-font-stack);
    font-size:   var(--encore-text-size-smaller);

    /* e-9812-button--small */
    min-block-size: var(--encore-control-size-smaller);
    padding-block:  var(--encore-spacing-tighter-4);
    padding-inline: var(--encore-spacing-base);

    /* Button-buttonSecondary-small-useBrowserDefaultFocusStyle */
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    background-color: transparent;
    border-radius: var(--encore-button-corner-radius, 9999px);
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    touch-action: manipulation;
    transition-duration: var(--shortest-3);
    transition-timing-function: var(--productive);
    user-select: none;
    vertical-align: middle;
    will-change: transform;
    border: 1px solid var(--essential-subdued, #818181);
    color: var(--text-base, #000000);
    min-inline-size: 0px;
    display: inline-flex;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: center;
    justify-content: center;
    transition-property: border-color, transform;
  }

  @supports (overflow-wrap:anywhere) {
    #ale-loader-settings.save-and-reload {
      overflow-wrap: anywhere;
    }
  }
`;
document.head.appendChild(style);

}