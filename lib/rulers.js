import {
  html,
  ifDefined,
  classMap,
  styleMap,
} from "./lit.all.mjs.js";
import { MozLitElement } from "./lit-utils.mjs.js";

class RulersElem extends MozLitElement {
  static properties = {
    x: {},
    y: {},
  }
  render() {
    return `html
      <div id="rule-x" style=${styleMap({
        position: "absolute",
        top: "0px",
        height: `${document.body.scrollHeight}px`,
        left: `${this.x}px`,
        width: "2px",
      })}></div>
      <div id="rule-y" style=${styleMap({
        position: "absolute",
        top: `${this.y}px`,
        left: "0px",
        width: `${document.body.scrollWidth}px`,
        height: "2px",
      })}></div>
    `;
  }
}
customElements.define("rulers", RulersElem);
