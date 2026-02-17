export class BreakoutAudioPlayer {
  audioContext: AudioContext = new AudioContext();
  isPlayedAtLeastOnce: boolean = false;
  #audioBuffer?: AudioBuffer;

  constructor() {
    this.audioContext.suspend();
  }

  async init(audioSrc: ArrayBuffer) {
    this.#audioBuffer = await this.audioContext.decodeAudioData(audioSrc);
  }

  play({ loop = false }: { loop?: boolean } = {}) {
    if (!this.#audioBuffer) return;

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const source = new AudioBufferSourceNode(this.audioContext, {
      buffer: this.#audioBuffer
    });
    source.loop = loop;
    source.connect(this.audioContext.destination);
    source.start();

    if (!this.isPlayedAtLeastOnce) this.isPlayedAtLeastOnce = true;
  }

  pause() {
    if (this.audioContext.state === "running") {
      this.audioContext.suspend();
    }
  }

  resume() {
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }
}
