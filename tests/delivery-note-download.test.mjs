import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const storeApp = readFileSync(join(root, 'store-app.js'), 'utf8');
const storeStyle = readFileSync(join(root, 'store-style.css'), 'utf8');

assert.ok(storeApp.includes('function downloadDeliveryImage(imgUrl,fileName)'), 'delivery note should use a direct download helper');
assert.ok(storeApp.includes("const link=document.createElement('a')"), 'direct download should create a temporary anchor');
assert.ok(storeApp.includes('link.download=esc(fileName)'), 'direct download should set the image filename');
assert.ok(storeApp.includes('link.click()'), 'direct download should click the temporary anchor');
assert.ok(storeApp.includes('downloadDeliveryImage(imgUrl,'), 'generateDeliveryNote should download immediately after rendering');
assert.ok(!storeApp.includes('showDeliveryImage'), 'delivery note should not show or call an image preview overlay');
assert.ok(!storeApp.includes('function openDeliveryImageFullscreen'), 'delivery note should not expose fullscreen preview');
assert.ok(!storeApp.includes('delivery-note-overlay'), 'delivery note should not render an overlay with the image URL');
assert.ok(!storeApp.includes('delivery-note-preview-img'), 'delivery note should not render a preview image that can be screenshotted with page URL');
assert.ok(storeStyle.includes('.delivery-note-capture-wrap{position:fixed;left:-10000px;top:0'), 'delivery note capture wrapper should render offscreen to prevent flicker');
assert.ok(!storeStyle.includes('.delivery-note-capture-wrap{position:fixed;left:0;top:0'), 'delivery note capture wrapper should not be placed at the visible viewport origin');
