import {
  html,
  ifDefined,
  styleMap,
} from "./lit.all.mjs.js";
import { MozLitElement } from "./lit-utils.mjs.js";

class HighlightBox extends MozLitElement {
  constructor() {
    super();
    this.rect = {
      top: 0,
      left: 0,
      height: 0,
      width: 0
    };
  }
  static properties = {
    rect: {},
  }
  static get queries() {
    return {
      highlightElem: ".highlight",
      topElem: ".side.top",
      leftElem: ".side.left",
      rightElem: ".side.right",
      bottomElem: ".side.bottom",
    }
  }
  createRenderRoot() {
    return this;
  }
  render() {
    console.log("render()");
    let { top, left, height, width } = this.rect;
    let bottom = top+height;
    let right = left+width;
    return html`
        <div class="highlight"   style=${styleMap({ top: `${top}px`, left: `${left}px`, height: `${height}px`, width: `${width}px` })}></div>
        <div class="side top"    style=${styleMap({ top: 0, left: 0, height: `${top}px`, width: '100%' } )}></div>
        <div class="side left"   style=${styleMap({ top: `${top}px`, left: 0, height: `${height}px`, width: `${left}px` })}></div>
        <div class="side right"  style=${styleMap({ top: `${top}px`, height: `${height}px`, left: `${right}px`, width: `calc(100% - ${right}px)` })}></div>
        <div class="side bottom" style=${styleMap({ top: `${bottom}px`, left:0, height:`calc(100% - ${bottom}px)`, width: '100%' })}></div>
    `;
  }
  connectedCallback() {
    super.connectedCallback();
    console.log("connectedCallback()");
  }
  willUpdate() {
    console.log("willUpdate on HighlightBox");
  }
  positionChild(name, dims) {
    let elem = this[name];
    if (!elem) {
      console.log(elem, name +" lookup failed");
      return;
    }

    for (let [prop, value] of Object.entries(dims)) {
      elem.style[prop] = typeof value == "string" ? value : `${value}px`;
    }
  }
  moveTo(targetRect = {}) {
    Object.assign(this.rect, targetRect);
    this.requestUpdate();
  }
  moveToElement(targetElem, offsets = [0,0]) {
    console.log("moveToElement:", targetElem, offsets);
    const coords = targetElem.getBoundingClientRect();
    const [xOffset, yOffset] = offsets;
    const { scrollTop, scrollLeft } = targetElem.ownerDocument.documentElement;
    const lineHeight = parseFloat(getComputedStyle(targetElem).lineHeight);
    const padding = {
      left: 10,
      right: 10,
      top: 5,
      bottom: 5,
    };
    const rect = {
      left: coords.left + scrollLeft - padding.left,
      top: coords.top + scrollTop - padding.top + yOffset,
      width: coords.width + padding.left + padding.right,
      height: lineHeight + padding.top + padding.bottom,
    };
    console.log("Moving highlight to rect:", rect);
    this.moveTo(rect);
  }
}
customElements.define("highlight-box", HighlightBox);
