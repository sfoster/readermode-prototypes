import {
  html,
  ifDefined,
  styleMap,
} from "./lit.all.mjs.js";
import { MozLitElement } from "./lit-utils.mjs.js";

export class OutlineHighlighterElement extends MozLitElement {
  linePadding = 5;
  static stylesheetUrl = "outline-highlight.css";
  static properties = {
    lineRect: {},
    wordRect: {},
  }
  constructor() {
    super();
    this.lineRect = {
      top: 0,
      left: 0,
      height: 0,
      width: 0
    };
    this.wordRect = {
      top: 0,
      left: 0,
      height: 0,
      width: 0
    };
  }
  static get queries() {
    return {
      highlightElem: ".highlight",
      wordAreaElem: ".word-highlight",
    }
  }
  render() {
    let { top, left, height, width } = this.lineRect;
    return html`
        <link rel="stylesheet" href=${this.constructor.stylesheetUrl} />
        <div id="lineHighlight" style=${styleMap({
          top: `${top}px`,
          left: `${left}px`,
          height: `${height}px`,
          width: `${width}px`
        })}>
          <div id="wordHighlight" style=${styleMap({
            left: `${this.wordRect.x}px`,
            transform: `translate(${this.wordRect.x}px, 0px)`,
            height: `${this.wordRect.height}px`,
            width: `${this.wordRect.width}px`
          })}></div>
        </div>
    `;
  }
  // accepts a DOMRect for the outer line rectangle we want to highlight
  // and a DOMRect for the innner word rectangle
  renderAreas(lineRect = null, wordRect = null) {
    if (lineRect) {
      this.lineRect = lineRect
    }
    if (wordRect) {
      this.wordRect = wordRect;
    }
    console.log("renderAreas, ", lineRect, wordRect);
  }
}
customElements.define("reader-highlighter", OutlineHighlighterElement);
