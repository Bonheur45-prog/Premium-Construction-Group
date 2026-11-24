/**
 * File types accepted in the client space, with a check of each file's first bytes so a renamed
 * program or web page can never pass as a drawing or photo. Isomorphic (the browser uses the list
 * to pick files; the server uses the checks after upload).
 */
type Check = (bytes: Uint8Array) => boolean;
export type FileKind = "image" | "pdf" | "video" | "audio" | "document" | "sheet" | "slides" | "drawing" | "archive" | "text";
type FileType = { mime: string; kind: FileKind; check: Check; compressible?: boolean };

const starts = (...signature: number[]): Check => (bytes) => signature.every((byte, index) => bytes[index] === byte);
const ascii = (offset: number, text: string): Check => (bytes) => [...text].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
const zip = starts(0x50, 0x4b, 0x03, 0x04);
const ole = starts(0xd0, 0xcf, 0x11, 0xe0);
const ftyp = ascii(4, "ftyp");
const plainText: Check = (bytes) => !bytes.slice(0, 1024).includes(0);

export const FILE_TYPES: Record<string, FileType> = {};
const add = (extensions: string[], type: FileType) => extensions.forEach((extension) => { FILE_TYPES[extension] = type; });

add(["jpg", "jpeg"], { mime: "image/jpeg", kind: "image", check: starts(0xff, 0xd8, 0xff) });
add(["png"], { mime: "image/png", kind: "image", check: starts(0x89, 0x50, 0x4e, 0x47) });
add(["webp"], { mime: "image/webp", kind: "image", check: (b) => ascii(0, "RIFF")(b) && ascii(8, "WEBP")(b) });
add(["gif"], { mime: "image/gif", kind: "image", check: ascii(0, "GIF8") });
add(["heic", "heif"], { mime: "image/heic", kind: "image", check: ftyp });
add(["pdf"], { mime: "application/pdf", kind: "pdf", check: ascii(0, "%PDF") });
add(["mp4", "m4v"], { mime: "video/mp4", kind: "video", check: ftyp });
add(["mov"], { mime: "video/quicktime", kind: "video", check: ftyp });
add(["webm"], { mime: "video/webm", kind: "video", check: starts(0x1a, 0x45, 0xdf, 0xa3) });
add(["weba"], { mime: "audio/webm", kind: "audio", check: starts(0x1a, 0x45, 0xdf, 0xa3) });
add(["m4a"], { mime: "audio/mp4", kind: "audio", check: ftyp });
add(["ogg", "oga", "opus"], { mime: "audio/ogg", kind: "audio", check: ascii(0, "OggS") });
add(["mp3"], { mime: "audio/mpeg", kind: "audio", check: (b) => ascii(0, "ID3")(b) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) });
add(["wav"], { mime: "audio/wav", kind: "audio", check: (b) => ascii(0, "RIFF")(b) && ascii(8, "WAVE")(b) });
add(["docx"], { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "document", check: zip });
add(["doc"], { mime: "application/msword", kind: "document", check: ole, compressible: true });
add(["xlsx"], { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "sheet", check: zip });
add(["xls"], { mime: "application/vnd.ms-excel", kind: "sheet", check: ole, compressible: true });
add(["csv"], { mime: "text/csv", kind: "sheet", check: plainText, compressible: true });
add(["pptx"], { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "slides", check: zip });
add(["ppt"], { mime: "application/vnd.ms-powerpoint", kind: "slides", check: ole, compressible: true });
add(["dwg"], { mime: "application/acad", kind: "drawing", check: ascii(0, "AC10") });
add(["dxf"], { mime: "application/dxf", kind: "drawing", compressible: true, check: (bytes) => {
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 256));
  return /^\s*0\s*\r?\n\s*SECTION/.test(head) || head.startsWith("AutoCAD Binary DXF");
} });
add(["ifc"], { mime: "application/x-step", kind: "drawing", check: ascii(0, "ISO-10303-21"), compressible: true });
add(["skp"], { mime: "application/vnd.sketchup.skp", kind: "drawing", check: () => true });
add(["zip"], { mime: "application/zip", kind: "archive", check: zip });
add(["txt"], { mime: "text/plain", kind: "text", check: plainText, compressible: true });

export const ACCEPT_ATTRIBUTE = Object.keys(FILE_TYPES).map((extension) => `.${extension}`).join(",");

export function extensionOf(name: string) {
  const match = /\.([a-z0-9]{1,6})$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

export function fileTypeOf(name: string) {
  return FILE_TYPES[extensionOf(name)] || null;
}

export function kindOfMime(mime: string, name = ""): FileKind {
  const byName = fileTypeOf(name);
  if (byName) return byName.kind;
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "document";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
