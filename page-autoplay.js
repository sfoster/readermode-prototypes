export class PageAutoplay {
  constructor(highlighter) {
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
};

