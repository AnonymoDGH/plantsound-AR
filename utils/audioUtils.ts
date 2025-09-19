
/**
 * Decodes a base64 string into an ArrayBuffer.
 * @param base64 The base64-encoded string.
 * @returns An ArrayBuffer containing the decoded binary data.
 */
export const decode = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Asynchronously decodes an ArrayBuffer of audio data into an AudioBuffer.
 * @param audioContext The global AudioContext instance.
 * @param arrayBuffer The ArrayBuffer containing the audio data.
 * @returns A Promise that resolves with the decoded AudioBuffer.
 */
export const decodeAudioData = (
  audioContext: AudioContext,
  arrayBuffer: ArrayBuffer,
): Promise<AudioBuffer> => {
  return audioContext.decodeAudioData(arrayBuffer);
};