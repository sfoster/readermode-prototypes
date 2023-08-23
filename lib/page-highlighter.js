import { clamp, isBlockElement } from './utils.js';
import { TextBlock } from "./text-block.js";
import { getDimensions } from './utils.js';

function collectBlockElements(parentElem) {
  console.log("collectBlockElements with parentElem:", parentElem);
  const blocks = [];
  // Find block (non inline) elements with textContent.
  // Discard empty elements
  // Throw in the case an element mixes textNodes and/or inline elements and child block elements
  let hasText = false;
  const notEmptyRe = /\w+/;

  for(let child of parentElem.childNodes) {
    if(isBlockElement(child)) {
      let blockChildren = collectBlockElements(child);
      if (blockChildren) {
        blocks.push(...blockChildren);
      } else {
        blocks.push(child);
      }
    } else if (
      (child.nodeType == child.TEXT_NODE && notEmptyRe.test(child.wholeText)) ||
      (child.nodeType == child.ELEMENT_NODE && notEmptyRe.test(child.textContent))
    ) {
      hasText = true;
    }
  }
  console.assert(!(hasText && blocks.length), "Element has both text nodes and child block elements")
  if (blocks.length) {
    return blocks;
  } else if (hasText) {
    return [parentElem];
  }
  return null;
}

export class PageHighlightManager {
  currentBlockIndex = 0;
  currentWordIndex = 0;
  currentLineIndex = 0;
  currentContainerIndex = 0;

  constructor() {
    this._highlightersById = {};
    this._currentHighlighterId = null;
  }

  init(containerElements) {
    this.containerElements = containerElements.filter((elem) => !!elem);
    // an array of objects with rect coordinates and charStart/charEnd offsets for words on each line
    this._updateContainer();
    this._updateBlock();
    this.document = this.containerElements[0].ownerDocument;
    this.document.addEventListener("keydown", this);
    this.document.addEventListener("highlighter-change", this);
    this.document.defaultView.addEventListener("resize", this);
    this.document.defaultView.addEventListener("scroll", this);

    console.log("at init, containerElement is:", this.containerElement);
    // we can reuse a single range
    this._range = this.document.createRange();
  }

  uninit() {
    this.document.removeEventListener("keydown", this);
    this.document.removeEventListener("highlighter-change", this);
    this.document.defaultView.removeEventListener("resize", this);
    this.document.defaultView.removeEventListener("scroll", this);
    if (this._onScrollPending) {
      clearTimeout(this._onScrollPending);
    }
    for (let highlighterInfo of Object.values(this._highlightersById)) {
      if (highlighterInfo.instanceElem?.isConnected) {
        highlighterInfo.instanceElem.remove();
        delete highlighterInfo.instanceElem;
      }
    }
  }

  get highlighterElement() {
    return document.querySelector(".reader-highlighter");
  }
  get containerElement() {
    return this.containerElements[this.currentContainerIndex];
  }
  get currentBlock() {
    return this.blocks[this.currentBlockIndex];
  }
  get wordOffsets() {
    return this.currentLine.wordOffsets;
  }
  get currentLines() {
    return this.currentBlock.lines;
  }
  get currentLine() {
    return this.currentBlock.lines[this.currentLineIndex];
  }
  get currentWord() {
    let line = this.currentLine;
    let charRangeOffsets = this.wordOffsets[this.currentWordIndex];
    this._range.setStart(charRangeOffsets.textNode, charRangeOffsets.start);
    this._range.setEnd(charRangeOffsets.textNode, charRangeOffsets.end);

    let wordRect = getDimensions(this._range);
    wordRect.y = line.rect.top;
    wordRect.height = Math.max(wordRect.height, line.rect.height);

    return {
      rect: wordRect
    }
  }
  get highlighterElem() {
    const info = this._currentHighlighterId && this._highlightersById[this._currentHighlighterId];
    return info ? info.instanceElem : null;
  }

  initHighlighter(type, Ctor) {
    const rendererInstance = new Ctor();
    rendererInstance.classList.add(`${type}-reader-highlighter`, "reader-highlighter");
    return rendererInstance;
  }

  setCurrentHighlighter(id) {
    console.log("Setting current highlighter to:", id);
    const highlighterInfo = this._highlightersById[id];
    if (!highlighterInfo) {
      throw new Error("No highlighter registered for: ", typeName);
    }
    this._currentHighlighterId = id;
    if (!highlighterInfo.instanceElem) {
      highlighterInfo.instanceElem = new highlighterInfo.Ctor();
    }
    this.document.body.appendChild(highlighterInfo.instanceElem);
    for (let info of Object.values(this._highlightersById)) {
      info.instanceElem?.classList.toggle("hidden", info.typeName != this._currentHighlighterId);
    }
    requestAnimationFrame(() => {
      this.renderCurrentRange();
    });
  }

  registerHighlighter(typeName, Ctor) {
    this._highlightersById[typeName] = {
      typeName,
      Ctor,
      instanceElem: null,
    };
  }

  handleEvent(event) {
    if (event.type == "highlighter-change") {
      this.setCurrentHighlighter(event.detail);
      return;
    }
    if (event.type == "resize") {
      this.scheduleResize();
      return;
    }
    if (event.type == "scroll") {
      this.handleScroll();
      return;
    }

    if (event.type == "keydown") {
      if (!(event.target == document.body || event.target == document.documentElement)) {
        //
        return;
      }
      switch (event.key) {
        case "ArrowDown":
          this.moveDown();
          event.preventDefault();
          break;
        case "ArrowUp":
          this.moveUp();
          event.preventDefault();
          break;
        case "ArrowLeft":
          this.moveLeft();
          event.preventDefault();
          break;
        case "ArrowRight":
          this.moveRight();
          event.preventDefault();
          break;
      }
    }
  }
  scheduleResize() {
    console.log("scheduleResize");
    if (this._resizePending) {
      clearTimeout(this._resizePending);
    }
    this._resizePending = setTimeout(() => {
      requestAnimationFrame(() => {
        this._updateWindowDimensions();
        console.log("doing the resize");
        this._updateContainer();
        this._updateBlock();
        delete this._resizePending;
      });
    }, 500);
  }

  handleScroll(event) {
    this.highlighterElem.isScrolling = true;
    this.scheduleOnScroll();
  }

  scheduleOnScroll() {
    this.document.defaultView.addEventListener("scroll", this);
    console.log("scheduleOnScroll");
    if (this._onScrollPending) {
      clearTimeout(this._onScrollPending);
    }
    this._onScrollPending = setTimeout(() => {
      this._updateWindowDimensions();
      this.highlighterElem.isScrolling = false;
      this.renderCurrentRange();
      delete this._onScrollPending;
    }, 500);
  }

  _updateWindowDimensions() {
    this.windowDims = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      scrollWidth: window.document.body.scrollWidth,
      scrollHeight: window.document.body.scrollHeight,
    };
  }
  _updateLine() {
    this.currentWordIndex = clamp(this.currentWordIndex, 0, this.wordOffsets.length - 1);
  }
  _updateBlock() {
    this.currentBlock.calculateLines();
    // default to positioning at the first word of the first line
    this.currentLineIndex = 0;
    this.currentWordIndex = this.currentBlock.lines[this.currentLineIndex].firstWordIndex;
  }
  _updateContainer() {
    const containerElem = this.containerElement;
    console.log("_updateContainer, currentContainer:", containerElem);
    let blockElements = collectBlockElements(containerElem);
    this.blocks = blockElements.map(elem => new TextBlock(elem, containerElem));
    // default to positioning at the first block in the container
    this.currentBlockIndex = 0;
  }
  moveDown() {
    if (this._move(1, "line", "block", "container")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveUp() {
    if (this._move(-1, "line", "block", "container")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveLeft() {
    if (this._move(-1, "word", "line", "block", "container")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveRight() {
    if (this._move(1, "word", "line", "block", "container")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  _moveWord(offset) {
    let newIndex = clamp(this.currentWordIndex + offset, 0, this.wordOffsets.length - 1);
    if (newIndex !== this.currentWordIndex) {
      this.currentWordIndex = newIndex;
      return true;
    }
    return false;
  }
  moveWordNext() {
    // tries to move to the next word in the line
    // doesnt advance to the next line
    if (this._move(1, "word")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveWordPrevious() {
    // tries to move to the first word in the line
    // doesnt back up to the previous line
    if (this._move(-1, "word")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveWordEnd() {
    if (this._move(Infinity, "word")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveWordStart() {
    if (this._move(-Infinity, "word")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  _moveLine(offset) {
    let newIndex = clamp(this.currentLineIndex + offset, 0, this.currentLines.length -1);
    if (newIndex !== this.currentLineIndex) {
      this.currentLineIndex = newIndex;
      return true;
    }
    return false;

}  moveLineNext() {
    // tries to move the next line, doesnt advance to next block at the last
    if (this._move(1, "line")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveLinePrevious() {
    // tries to previous the next line, doesnt back up to previous block at the first
    if (this._move(-1, "line")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveLineEnd() {
    if (this._move(Infinity, "line")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  moveLineStart() {
    if (this._move(-Infinity, "line")) {
      this.renderCurrentRange();
      return true;
    }
    return false;
  }
  _moveBlock(offset) {
    let newIndex = clamp(this.currentBlockIndex + offset, 0, this.blocks.length -1);
    if (newIndex !== this.currentBlockIndex) {
      console.log("_moveBlock, old/new index: ", this.currentBlockIndex, newIndex);
      this.currentBlockIndex = newIndex;
      return true;
    }
    return false;
  }
  moveBlockNext() {
    if (this._move(1, "block")) {
      this.renderCurrentRange();
    }
  }
  moveBlockPrevious() {
    if (this._move(-1, "block")) {
      this.renderCurrentRange();
    }
  }
  moveBlockEnd() {
    if (this._move(Infinity, "block")) {
      this.renderCurrentRange();
    }
  }
  moveBlockStart() {
    if (this._move(-Infinity, "block")) {
      this.renderCurrentRange();
    }
  }
  _moveContainer(offset) {
    let newIndex = clamp(this.currentContainerIndex + offset, 0, this.containerElements.length - 1);
    if (newIndex !== this.currentContainerIndex) {
      console.log("_moveContainer, old/new index: ", this.currentContainerIndex, newIndex);
      this.currentContainerIndex = newIndex;
      return true;
    }
    return false;
  }
  moveContainerNext() {
    if (this._move(1, "container")) {
      this.renderCurrentRange();
    }
  }
  moveContainerPrevious() {
    if (this._move(-1, "container")) {
      this.renderCurrentRange();
    }
  }
  _move(offset, ...targets) {
    let isForward  = offset > 0;
    let direction = offset > 0 ? 1 : -1;
    for (let target of targets) {
      switch (target) {
        case "word":
          if (this._moveWord(offset)) {
            console.log(`move to ${isForward ? "next" : "previous"} word`);
            return true;
          }
          break;
        case "line":
          if (this._moveLine(offset)) {
            console.log(`move to ${isForward ? "next" : "previous"} line`);
            if (targets.includes("word")) {
              // if at the last word, move to first word in the new line
              // if at the first word, move to last word in the new line
              this._moveWord(-1 * direction * Infinity);
            }
            this._updateLine();
            return true;
          }
          break;
        case "block":
          if (this._moveBlock(offset)) {
            console.log(`move to ${isForward ? "next" : "previous"} block`);
            this._updateBlock();
            if (targets.includes("line")) {
              // if at the last line, move to first line in the new block
              // if at the first line, move to last line in the new block
              this._moveLine(-1 * offset * Infinity);
              if (targets.includes("word")) {
                // if at the last word, move to first word in the new line
                // if at the first word, move to last word in the new line
                this._moveWord(-1 * direction * Infinity);
              }
            }
            return true;
          }
          break;
        case "container":
          if (this._moveContainer(offset)) {
            console.log(`move to ${isForward ? "next" : "previous"} container`);
            // update all the blocks for the new container
            this._updateContainer();
            if (targets.includes("block")) {
              // if at the last block, move the index to first block in the new container
              // if at the first block, move the index to last block in the new container
              this._moveBlock(-1 * direction * Infinity);
            }
            // update the lines for the new block
            this._updateBlock();
            if (targets.includes("line")) {
              // if at the last line, move to first line in the new block
              // if at the first line, move to last line in the new block
              this._moveLine(-1 * direction * Infinity);
            }
            if (targets.includes("word")) {
              // if at the last word, move to first word in the new line
              // if at the first word, move to last word in the new line
              this._moveWord(-1 * direction * Infinity);
            }
            return true;
          }
          break;
      }
    }
  }
  onScroll() {

  }
  renderCurrentRange() {
    requestAnimationFrame(() => {
      const lineRect = this.currentLine.rect;
      const wordRect = this.currentWord.rect;

      this.highlighterElem.renderAreas(
        this.currentLine.rect,
        this.currentWord.rect,
        this.windowDims,
      );
    });
  }
}
