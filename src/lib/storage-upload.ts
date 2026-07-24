/**
 * Supabase Storageへ渡すバイナリを、長さが確定したArrayBufferへコピーする。
 *
 * Node.jsのBufferをそのままfetch経路へ渡すと、実行環境によってはUTF-8文字列として
 * 再エンコードされ、画像や動画の非ASCIIバイトが壊れることがある。
 * ArrayBufferへ明示的に変換し、元Bufferのオフセットや共有領域も持ち込まない。
 */
export function toStorageUploadBody(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}
