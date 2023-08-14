import {
  html,
  ifDefined,
  styleMap,
} from "./lib/lit.all.mjs.js";
import { MozLitElement } from "./lib/lit-utils.mjs.js";

export class HighlighterControlsElement extends MozLitElement {
  static properties = {
    highlighterType: { type: String },
  };

  get highlighterChoices() {
    return this.shadowRoot?.querySelectorAll("[name='highlighter-choice']");
  }

  constructor() {
    super();
    this.rendererTypes = {};
    this.addEventListener("click", (event) => {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
      }
      this._raf = requestAnimationFrame(() => {
        this.onHighlighterControlChange();
        delete this._raf;
      })
    });
  }

  onHighlighterControlChange() {
    let checkedChoice = Array.from(this.highlighterChoices).find(input => input.checked);
    console.log("onHighlighterControlChange:", checkedChoice);
    if (checkedChoice && this.highlighterType != checkedChoice.value) {
      this.highlighterType = checkedChoice.value;
      this.dispatchEvent(new CustomEvent("highlighter-change", {
        bubbles: true,
        detail: this.highlighterType,
      }));
    }
  }

  configureHighlighters(...types) {
    for (let type of types) {
      this.rendererTypes[type] = {
        type,
        label: type,
      };
      if (!this.highlighterType) {
        this.highlighterType = type;
      }
    }
    this.requestUpdate();
  }

  renderItem(type) {
    let rendererDetails = this.rendererTypes[type];
    return html`
      <label id="outline-highlighter-control">
        <input
          value="${type}"
          name="highlighter-choice" type="radio" id="${type}-highlighter-option"
          @change=${this.onHighlighterControlChanged}
          ?checked=${this.highlighterType == type}
        >${rendererDetails.label}
      </label>
    `;
  }

  render() {
    return html`
        <fieldset>
          <legend>Highlighter</legend>
          ${Object.keys(this.rendererTypes).map((type) =>
            this.renderItem(type)
          )}
        </fieldset>
      `
  }
}
window.customElements.define('highlighter-controls', HighlighterControlsElement);

export class AutoplayControlsElement extends MozLitElement {
  static properties = {
    autoPlay: { type: Boolean },
  };
  configure(highlighter) {
    this.highlighter = highlighter;
  }
  playNext() {
    let changed = this.highlighter._move(1, "word", "line", "block", "container");
    if (!changed) {
      // no change; we reached the end
      console.info("Complete");
      return;
    }

    this.playingTimer = setTimeout(() => {
      this.highlighter.renderCurrentRange();
      if (this.autoPlay) {
        this.playNext();
      }
    }, 400);
  }
  play() {
    if (this.playingTimer) {
      clearTimeout(this.playingTimer);
    }
    document.getElementById("lineHighlight").classList.toggle("hidden", false);
    this.autoPlay = true;
    this.highlighter.renderCurrentRange();
    this.playNext();
  }
  stop() {
    this.autoPlay = false;
    clearTimeout(this.playingTimer);
  }
  onClick(event) {
    console.log("autoplay-btn clicked: ", event.target.checked);
    if (event.target.checked) {
      this.play();
    } else {
      this.stop();
    }
  }
  render() {
    return html`
        <label id="autoplay-control">
          <input
            type="checkbox" id="autoplay-btn"
            @click="${this.onClick}"
            ?checked=${this.autoPlay}
          >Autoplay
        </label>
      `
  }
};
window.customElements.define('autoplay-controls', AutoplayControlsElement);

