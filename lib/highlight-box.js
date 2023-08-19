import {
  html,
  ifDefined,
  classMap,
  styleMap,
} from "./lit.all.mjs.js";
import { MozLitElement } from "./lit-utils.mjs.js";

export class HighlightBox extends MozLitElement {
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
  static stylesheetUrl = "highlight-box.css";
  static properties = {
    lineRect: {},
    wordRect: {},
    scrollY: {},
    scrollX: {},
    isScrolling: {},
  }
  static get queries() {
    return {
      highlightElem: ".highlight",
      wordAreaElem: ".word-highlight",
      topElem: ".side.top",
      leftElem: ".side.left",
      rightElem: ".side.right",
      bottomElem: ".side.bottom",
    }
  }
  render() {
    let { scrollX = 0, scrollY = 0 } = this.windowDims ?? {};

    let top = Math.max(this.lineRect.top - scrollY, 0);
    let bottom = Math.max(this.lineRect.top - scrollY + this.lineRect.height, 0);
    let height = bottom - top;

    // TODO: handle horizontal scrolling
    let width = this.lineRect.width;
    let left = this.lineRect.left;
    let right = left+width;
    console.log("At render, scrollY:", scrollY);
    console.log("At render, this.lineRect:", this.lineRect);
    // line rect coordinates are from document 0,0 not the viewport

    const classes = { scrolling: this.isScrolling, hidden: height==0, highlight: true };
    console.log(`render, top: ${top}, left: ${left}, width: ${width}, height: ${height}, bottom: ${bottom}, right: ${right}`);
    return html`
        <link rel="stylesheet" href=${this.constructor.stylesheetUrl} />
        <div class=${classMap(classes)} style=${styleMap({
          top: `${top}px`,
          left: `${left}px`,
          height: `${height}px`,
          width: `${width}px`
        })}>
          <div class="word-highlight"  style=${styleMap({
            left: "0px",
            transform: `translate(${this.wordRect.x - left}px, 0px)`,
            height: `${this.wordRect.height}px`,
            width: `${this.wordRect.width}px`
          })}></div>
        </div>
        <div class="side top"    style=${styleMap({
          top: 0, left: 0, height: `${top}px`, width: '100%' }
        )}></div>
        <div class="side left"   style=${styleMap({
          top: `${top}px`, left: 0, height: `${height}px`, width: `${left}px`
        })}></div>
        <div class="side right"  style=${styleMap({
          top: `${top}px`, height: `${height}px`, left: `${right}px`, width: `calc(100% - ${right}px)`
        })}></div>
        <div class="side bottom" style=${styleMap({
          top: `${bottom}px`, left:0, height:`calc(100% - ${bottom}px)`, width: '100%'
        })}></div>
    `;
  }
  renderAreas(lineRect = null, wordRect = null, windowDims = null) {
    if (lineRect) {
      this.lineRect = lineRect
    }
    if (wordRect) {
      this.wordRect = wordRect;
    }
    if (windowDims) {
      this.windowDims = windowDims;
    }
    // console.log("renderAreas, ", lineRect, wordRect);
  }
}
customElements.define("highlight-box", HighlightBox);
