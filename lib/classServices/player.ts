export class Player {
  private playbackNode: AudioWorkletNode | null = null;
  public mediaRecorder: MediaRecorder | null = null;

  async init(sampleRate: number) {
    const audioContext = new AudioContext({ sampleRate });
    await audioContext.audioWorklet.addModule('audio-playback-worklet.js');

    this.playbackNode = new AudioWorkletNode(audioContext, 'audio-playback-worklet');
    const streamDestiation = audioContext.createMediaStreamDestination();
    this.playbackNode.connect(streamDestiation);
    this.playbackNode.connect(audioContext.destination);

    this.mediaRecorder = new MediaRecorder(streamDestiation.stream);
    this.mediaRecorder.start();
  }

  play(buffer: Int16Array) {
    if (this.playbackNode) {
      this.playbackNode.port.postMessage(buffer);
    }
  }

  stop() {
    if (this.playbackNode) {
      this.playbackNode.port.postMessage(null);
    }
  }
}