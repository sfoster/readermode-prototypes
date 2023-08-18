export function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

export function isBlockElement(elem) {
  if (!elem || elem.nodeType !== elem.ELEMENT_NODE) {
    return false;
  }
  if (["p", "section"].includes(elem.localName)) {
    return true;
  }
  let csDisplay = getComputedStyle(elem).display;
  return !csDisplay.startsWith("inline");
}


