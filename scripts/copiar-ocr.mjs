// Copia os arquivos da leitura de texto (OCR) para public/ocr, para o app não depender de CDN.
import { cpSync, mkdirSync } from 'node:fs'

const destino = 'public/ocr'
mkdirSync(destino, { recursive: true })
const arquivos = {
  'node_modules/tesseract.js/dist/worker.min.js': 'worker.min.js',
  'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js': 'tesseract-core-lstm.wasm.js',
  'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js': 'tesseract-core-simd-lstm.wasm.js',
  'node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz': 'por.traineddata.gz',
}
for (const [origem, nome] of Object.entries(arquivos)) cpSync(origem, `${destino}/${nome}`)
