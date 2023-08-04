export class OutlineHighlighterElement extends HTMLElement {
  linePadding = 5;
  connectedCallback() {
    this.lineAreaElem = this;
    this.classList.add("hidden");
    this.lineAreaElem.id = "lineHighlight";
    this.wordAreaElem = document.createElement("div");
    this.wordAreaElem.id = "wordHighlight";
    this.appendChild(this.wordAreaElem);
  }
  // accepts a DOMRect for the outer line rectangle we want to highlight
  // and a DOMRect for the innner word rectangle
  renderAreas(lineRect, wordArea) {
    let lineArea = new DOMRect(
      lineRect.x,
      lineRect.y - this.linePadding,
      lineRect.width,
      lineRect.height + this.linePadding*2
    );
    this.classList.remove("hidden");
    this.lineAreaElem.style.cssText = `
      left: ${window.scrollX + lineArea.x}px;
      top: ${window.scrollY + lineArea.y}px;
      width: ${lineArea.width}px;
      height: ${lineArea.height}px;
    `;
    this.wordAreaElem.style.cssText = `
      left: ${wordArea.x}px;
      transform: translate(${wordArea.x}px, 0px);
      width: ${wordArea.width}px;
      height: ${wordArea.height}px;
    `;
  }
}
customElements.define("reader-highlighter", OutlineHighlighterElement);
