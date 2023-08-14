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

  let rangeRect = textRange.getBoundingClientRect();
  let yOffset = rangeRect.y - elemRect.y;
  let lineRect = DOMRect.fromRect(Object.assign({}, rangeRect, {
    y: elemRect.y + yOffset - (yOffset % lineBoxHeight),
    x: elemRect.x,
    height: lineBoxHeight,
  }));
  return lineRect;
}

function getLineBoxForTextRange(textRange, containerElem) {
  // returns a DOMRect with bounds for a line of text in this element
  // So that e.g. getting line 3 means box.height * (lineNum -1).
  let { lineHeight, fontSize } = getComputedStyle(containerElem);
  if (lineHeight.endsWith("px")) {
    lineHeight = parseFloat(lineHeight);
  } else {
    // default to 1.2em for non px line-height values
    lineHeight = parseFloat(fontSize) * 1.2;
  }
  const containerCS = getComputedStyle(containerElem);
  const paddingTop = parseFloat(containerCS.paddingTop);
  const paddingBottom = parseFloat(containerCS.paddingBottom);
  // const marginTop = parseFloat(containerCS.marginTop);
  // const marginBottom = parseFloat(containerCS.marginBottom);

  let topOffset = paddingTop; // Math.max(MIN_BLOCK_PADDING, ( + marginTop));
  let bottomOffset = paddingBottom; // Math.max(MIN_BLOCK_PADDING, ( + marginBottom));

  // TODO: what if the text range spans elements?
  const rect = containerElem.getBoundingClientRect();
  const lineCount = (rect.height - paddingTop - paddingBottom) / lineHeight;
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

export class TextBlock {
  constructor(elem, containerElem) {
    this.containerElem = containerElem;
    this.document = this.containerElem.ownerDocument;
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
  calculateLines() {
    const range = this.document.createRange();
    const lines = this.lines = [];
    let lineIndex = -1;
    let lineEnd = 0;
    let wordIndex;
    for (wordIndex = 0; wordIndex < this.wordOffsets.length; wordIndex++) {
      const offset = this.wordOffsets[wordIndex];
      let textNode = offset.textNode;
      range.setStart(textNode, offset.start);
      range.setEnd(textNode, offset.end);
      const lineBox = getLineBoxForTextRange(range, this.elem);
      if (lineBox.index !== lineIndex) {
        // capture the last word index for the previous line
        if (lineBox.index > 0 && wordIndex > 0) {
          lines[lines.length -1 ].lastWordIndex = wordIndex - 1;
        }
        lineIndex = lineBox.index;
        console.log(`new line at wordIndex: ${wordIndex}, lineIndex: ${lineIndex}`);
        lines.push({
          textNode,
          wordOffsets: [],
          firstWordIndex: wordIndex,
          rect: lineBox.rect,
          charStart: offset.start,
        });
      }
      lines[lineIndex].charEnd = offset.end;
      lines[lineIndex].wordOffsets.push(offset);
    }
    if (lines.length) {
      lines[lines.length -1].lastWordIndex = wordIndex;
    }
  }
}

