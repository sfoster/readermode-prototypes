import { HighlightBox as LetterBoxHighlighterElement } from "./lib/highlight-box.js";
import { OutlineHighlighterElement } from "./lib/outline-highlighter.js";
import { PageAutoplay } from "./page-autoplay.js";
import { PageHighlighter } from "./lib/page-highlighter.js";

export function onHighlighterControlChange() {
  switch (document.querySelector("[name='highlighter-choice']:checked")?.id) {
    case "letterbox-highlighter-option":
      initHighlighter("letterbox");
      break;
    case "outline-highlighter-option":
      initHighlighter("outline");
      break;
  }
  pageHighlighter?.renderCurrentRange();
}

export function initHighlighter(highlighterType) {
  let outlineHighlighter = document.querySelector(".outline-reader-highlighter");
  let letterboxHighlighter = document.querySelector(".letterbox-reader-highlighter");
  Array.from(document.querySelectorAll(".reader-highlighter")).forEach(elem => {
    elem.classList.remove("reader-highlighter");
    elem.classList.add("hidden");
  });

  if (highlighterType == "letterbox") {
    if (!letterboxHighlighter) {
      letterboxHighlighter = new LetterBoxHighlighterElement();
      letterboxHighlighter.classList.add("letterbox-reader-highlighter");
      letterboxHighlighter.classList.remove("hidden");
      document.body.appendChild(letterboxHighlighter);
    }
    letterboxHighlighter.classList.add("reader-highlighter");
    return letterboxHighlighter;
  } else {
    if (!outlineHighlighter) {
      outlineHighlighter = new OutlineHighlighterElement();
      outlineHighlighter.classList.add("outline-reader-highlighter");
      outlineHighlighter.classList.remove("hidden");
      document.body.appendChild(outlineHighlighter);
    }
    outlineHighlighter.classList.add("reader-highlighter");
    return outlineHighlighter;
  }
}

export function init() {
  let highlighterChoices = document.querySelectorAll("[name='highlighter-choice']");
  console.log("highlighterChoices:", highlighterChoices);
  Array.from(highlighterChoices).forEach(input => {
    input.onchange = onHighlighterControlChange;
  });

  window.pageHighlighter = new PageHighlighter();
  const autoPlayer = window.autoPlayer = new PageAutoplay(window.pageHighlighter);

  document.getElementById("autoplay-btn").checked = false;
  document.getElementById("autoplay-btn").addEventListener("click", (event) => {
    console.log("autoplay-btn clicked: ", event.target.checked);
    if (event.target.checked) {
      autoPlayer.play();
    } else {
      autoPlayer.stop();
    }
  });

  pageHighlighter.init([
    document.querySelector("body > header"),
    ...document.querySelectorAll("body > section")
  ]);

  onHighlighterControlChange();
}

document.addEventListener("DOMContentLoaded", init);
