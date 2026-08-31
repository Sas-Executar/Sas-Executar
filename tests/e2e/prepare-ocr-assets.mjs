import { copyFile, cp, mkdir } from "node:fs/promises";

const destino = new URL("./ocr-assets/", import.meta.url);
await Promise.all([
  mkdir(destino, { recursive: true }),
  mkdir(new URL("lang/", destino), { recursive: true }),
]);
await Promise.all([
  copyFile(
    new URL(
      "../../apps/app/node_modules/tesseract.js/dist/tesseract.esm.min.js",
      import.meta.url
    ),
    new URL("tesseract.esm.min.js", destino)
  ),
  copyFile(
    new URL(
      "../../apps/app/node_modules/tesseract.js/dist/worker.min.js",
      import.meta.url
    ),
    new URL("worker.min.js", destino)
  ),
  copyFile(
    new URL(
      "../../node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz",
      import.meta.url
    ),
    new URL("lang/eng.traineddata.gz", destino)
  ),
  cp(
    new URL(
      "../../node_modules/.bun/node_modules/tesseract.js-core/",
      import.meta.url
    ),
    new URL("core/", destino),
    { recursive: true }
  ),
]);
