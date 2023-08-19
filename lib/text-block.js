import { getDimensions } from './utils.js';

// placeholder parser to get us the word offsets and give us something to highlight
function getWordOffsets(textNode) {
  let wordOffsets = [];
  let wordBoundary = true;
  let charIndex = 0;
  let textString = textNode.wholeText;

  for(let lastCharIndex = textString.length-1; charIndex <= lastCharIndex; charIndex++) {
    let char = textString[charIndex];
    if (/[\.\s,"]/.test(char)) {
      if (!wordBoundary) {
        wordOffsets[wordOffsets.length-1].end = charIndex;
        wordBoundary = true;
      }
      continue;
    }
    if (wordBoundary) {
      wordOffsets.push({
        start: charIndex,
        word: char,
        end: -1,
      });
      wordBoundary = false;
    } else {
      wordOffsets[wordOffsets.length-1].word += char;
    }
  }
  wordOffsets[wordOffsets.length-1].end = charIndex;
  return wordOffsets;
}

function snapToLine(textRange, lineBoxHeight, elemRect) {
  // range gives me coordinates for the textNode
  // line box has our grid units
  // element bounding rect has containing coordinates

  let rangeRect = getDimensions(textRange);
  let yOffset = rangeRect.y - elemRect.y;
  let lineRect = DOMRect.fromRect(Object.assign({}, rangeRect, {
    y: elemRect.y + yOffset - (yOffset % lineBoxHeight),
    x: elemRect.x,
    height: lineBoxHeight,
  }));
  return lineRect;
}

function foo() {
  const elemCS = win.getComputedStyle(elem);
  const paddingTop = parseFloat(elemCS.paddingTop);
  const paddingBottom = parseFloat(elemCS.paddingBottom);
  let { lineHeight, fontSize } = elemCS;
  if (lineHeight.endsWith("px")) {
    lineHeight = parseFloat(lineHeight);
  } else {
    // default to 1.2em for non px line-height values
    lineHeight = parseFloat(fontSize) * 1.2;
  }
}

function getLineBoxForTextRange(textRange, containerElem) {
  // returns a DOMRect with bounds for a line of text in this element
  // So that e.g. getting line 3 means box.height * (lineNum -1).
  let { paddingTop, paddingBottom, height, lineHeight } = getElementDimensions(containerElem);
  let topOffset = paddingTop;
  let bottomOffset = paddingBottom;

  // TODO: what if the text range spans elements?
  const lineCount = (height - paddingTop - paddingBottom) / lineHeight;
  const lineRect = snapToLine(textRange, lineHeight, rect);
  lineRect.y += topOffset;
  // lineRect.height += bottomOffset;

  const lineBox = {
    index: Math.floor((lineRect.y - rect.y)/lineHeight),
    lineCount,
    rect: lineRect,
    lineHeight,
  };
  return lineBox;
}

export class TextLine {
  constructor(textNode, startOffset, endOffset, containerBlock) {
    this.textNode;

    const range = containerBlock.elem.ownerDocument.createRange();
    range.setStart(textNode, startOffset);
    range.setEnd(textNode, endOffset);

    this.textRange = range;
    this.lineHeight = containerBlock.lineHeight;
    this.wordOffsets = [];
    this.firstWordIndex = 0;
    this.charStart = 0;
    this.charEnd = 0;
    // compute this.rect and this.index
    this.calculateDimensions(containerBlock);
  }
  calculateDimensions(containerBlock) {
    let { paddingTop, paddingBottom, height, width, lineHeight, top, left } = containerBlock;
    console.log("calculateDimensions, got container dimensions:", { paddingTop, paddingBottom, height, width, lineHeight, top, left });
    let topOffset = paddingTop;
    let bottomOffset = paddingBottom;

    const innerHeight = height - paddingTop - paddingBottom;
    const lineCount = innerHeight / lineHeight;

    // Snap to the nearest line
    let lineRect = getDimensions(this.textRange);
    let yOrigin = top + topOffset;
    let yOffset = lineRect.y - yOrigin;
    let index = Math.floor(yOffset / lineHeight);

    lineRect.y = top + topOffset + (index * lineHeight);
    lineRect.height = Math.max(lineRect.height, lineHeight);
    lineRect.x = left;
    lineRect.width = width;

    this.index = index;
    this.rect = lineRect;
    this.lineCount = lineCount;
  }
}

export class TextBlock {
  constructor(elem, containerElem) {
    this.containerElem = containerElem;
    this.elem = elem;
    this.lines = null;
    this.textNodes = this.collectTextNodes(elem);
    this.wordOffsets = [];
    this.nodeToWordOffsetsMap = new Map();
    // or just parallel arrays with common index
    for (let node of this.textNodes) {
      let offsets = getWordOffsets(node).map(offset => {
        offset.textNode = node;
        return offset;
      });
      this.wordOffsets.push(...offsets);
      this.nodeToWordOffsetsMap.set(node, offsets);
    }
  }
  collectTextNodes(elem) {
    const notEmptyRe = /\w+/;
    const textNodes = [];
    for(let child of elem.childNodes) {
      if (child.nodeType == child.TEXT_NODE && notEmptyRe.test(child.wholeText)) {
        textNodes.push(child);
      } else if (child.nodeType == child.ELEMENT_NODE) {
        textNodes.push(...this.collectTextNodes(child));
      }
    }
    return textNodes;
  }
  get rect() {
    if (!this._rect) {
      this._rect = getDimensions(this.elem);
    }
    return this._rect;
  }
  get width() {
    return this.rect.width;
  }
  get height() {
    return this.rect.height;
  }
  get left() {
    return this.rect.left;
  }
  get top() {
    return this.rect.top;
  }
  calculateLines() {
    const lines = this.lines = [];
    let lineIndex = -1;
    let lineEnd = 0;
    let wordIndex;
    for (wordIndex = 0; wordIndex < this.wordOffsets.length; wordIndex++) {
      const offset = this.wordOffsets[wordIndex];
      console.log(`tentative textLine for offsets: ${offset.start}-${offset.end}`);
      const textLine = new TextLine(offset.textNode, offset.start, offset.end, this);
      if (textLine.index !== lineIndex) {
        // capture the last word index for the previous line
        if (textLine.index > 0 && wordIndex > 0) {
          lines[lines.length -1].lastWordIndex = wordIndex - 1;
        }
        lineIndex = textLine.index;
        console.log(`new line at wordIndex: ${wordIndex}, lineIndex: ${lineIndex}, rect:`, textLine.rect);
        lines.push(textLine);
        // lines.push({
        //   textNode,
        //   wordOffsets: [],
        //   firstWordIndex: wordIndex,
        //   rect: lineBox.rect,
        //   charStart: offset.start,
        // });
      }
      lines[lineIndex].charEnd = offset.end;
      lines[lineIndex].wordOffsets.push(offset);
    }
    if (lines.length) {
      lines[lines.length -1].lastWordIndex = wordIndex;
    }
  }
  _computeProperties() {
    this._properties = {};
    const elemCS = window.getComputedStyle(this.elem);

    this._properties.fontSize = parseFloat(elemCS.fontSize);
    this._properties.paddingTop = parseFloat(elemCS.paddingTop);
    this._properties.paddingBottom = parseFloat(elemCS.paddingBottom);

    let { lineHeight, fontSize } = elemCS;
    if (lineHeight.endsWith("px")) {
      lineHeight = parseFloat(lineHeight);
    } else {
      // default to 1.2em for non px line-height values
      lineHeight = this._properties.fontSize * 1.2;
    }
    this._properties.lineHeight = lineHeight;
  }
  get lineHeight() {
    if (!this._properties) {
      this._computeProperties();
    }
    return this._properties.lineHeight;
  }
  get paddingTop() {
    if (!this._properties) {
      this._computeProperties();
    }
    return this._properties.paddingTop;
  }
  get paddingBottom() {
    if (!this._properties) {
      this._computeProperties();
    }
    return this._properties.paddingBottom;
  }
}
