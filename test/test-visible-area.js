/**
 * Tests: der Dialog steht im sichtbaren Ausschnitt ueber der Bildschirmtastatur
 * Modul: /public/utils/visible-area.js, /public/components/modal.js,
 *        `.modal-overlay--keyboard` in /public/styles/layout.css
 * Ausfuehren: npm run test:visible-area
 *
 * Anlass: Am Telefon (Android, Gboard) lag beim Anlegen einer Aufgabe alles ab
 * "Tags" und die Fusszeile mit "Speichern" hinter der Tastatur; holte der
 * Browser ein verdecktes Feld ins Bild, rutschten Kopf und Titelfeld oben
 * hinaus. Der Dialog war `position: fixed; inset: 0` und damit so hoch wie der
 * Bildschirm - die Tastatur verkleinert nur den Visual Viewport.
 *
 * Im Browser nachgestellt (Playwright, 360x780, Tastatur 330px als
 * Visual-Viewport-Attrappe, Notizfeld fokussiert): vorher Fusszeile bei
 * 694..767 und Notizfeld bei 400..559 in einem Ausschnitt 0..450; nachher
 * Kopf 13..90, Notizfeld 148..307, Fusszeile 364..437. Hier steht, was ohne
 * Browser pruefbar ist: die Rechnung und dass Skript und Blatt sie benutzen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { visibleArea, revealDelta } from '../public/utils/visible-area.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('ohne Tastatur ist der Ausschnitt der ganze Viewport - nichts zu tun', () => {
  assert.equal(visibleArea({ height: 780, offsetTop: 0, scale: 1 }, 780), null);
  // Rundung ist keine Tastatur.
  assert.equal(visibleArea({ height: 779.6, offsetTop: 0, scale: 1 }, 780), null);
});

test('mit Tastatur: Lage und Hoehe des sichtbaren Teils, ganzzahlig', () => {
  assert.deepEqual(visibleArea({ height: 450.4, offsetTop: 0, scale: 1 }, 780), { top: 0, height: 450 });
  // Der Browser hat den Ausschnitt nach unten geschoben, um an ein Feld zu kommen.
  assert.deepEqual(visibleArea({ height: 450, offsetTop: 120.2, scale: 1 }, 780), { top: 120, height: 450 });
});

test('Pinch-Zoom vergroessert - der Dialog bricht nicht in den Ausschnitt um', () => {
  assert.equal(visibleArea({ height: 390, offsetTop: 200, scale: 2 }, 780), null);
});

test('ohne visualViewport oder ohne Mass bleibt alles beim Alten', () => {
  assert.equal(visibleArea(undefined, 780), null);
  assert.equal(visibleArea(null, 780), null);
  assert.equal(visibleArea({ height: 450, offsetTop: 0, scale: 1 }, 0), null);
  assert.equal(visibleArea({ height: Number.NaN, offsetTop: 0, scale: 1 }, 780), null);
});

test('der Rumpf rollt nur, wenn das Feld draussen liegt, und mit Luft', () => {
  const port = { top: 100, bottom: 400 };
  assert.equal(revealDelta({ top: 150, bottom: 200 }, port), 0);
  // Unter dem Rumpf: so weit, dass die Unterkante 12px Luft hat.
  assert.equal(revealDelta({ top: 420, bottom: 470 }, port), 82);
  // Darueber: zurueck, bis die Oberkante 12px Luft hat.
  assert.equal(revealDelta({ top: 60, bottom: 110 }, port), -52);
});

test('ein Feld hoeher als der Rumpf bleibt mit der Oberkante im Bild', () => {
  const port = { top: 100, bottom: 300 };
  // Das Notizfeld (300px) beginnt bei 250: die Oberkante rueckt an den Rand
  // (Luft 12px), nicht die Unterkante - dort steht nicht, was man schreibt.
  assert.equal(revealDelta({ top: 250, bottom: 550 }, port), 138);
  assert.equal(revealDelta({ top: 105, bottom: 405 }, port), 0);
});

test('modal.js folgt dem Ausschnitt bei resize UND scroll und schreibt die Werte ans Overlay', () => {
  const src = read('../public/components/modal.js');
  assert.match(src, /from '\/utils\/visible-area\.js'/);
  assert.match(src, /visualViewport\.addEventListener\('resize', _scheduleVisibleArea\)/);
  // Der Browser verschiebt den Ausschnitt (scroll), ohne seine Groesse zu aendern.
  assert.match(src, /visualViewport\.addEventListener\('scroll', _scheduleVisibleArea\)/);
  assert.match(src, /setProperty\('--visible-top'/);
  assert.match(src, /setProperty\('--visible-height'/);
  assert.match(src, /classList\.toggle\('modal-overlay--keyboard'/);
  // Ein Dialog, der bei schon offener Tastatur aufgeht, misst selbst.
  const enter = src.slice(src.indexOf('function _enterTopLayer('), src.indexOf('function _leaveTopLayer('));
  assert.match(enter, /_scheduleVisibleArea\(\)/);
});

test('layout.css legt den Dialog auf den Ausschnitt und begrenzt die Tafel darauf', () => {
  const css = read('../public/styles/layout.css');
  const block = (selector) => {
    const at = css.indexOf(`${selector} {`);
    assert.notEqual(at, -1, `Regel fehlt: ${selector}`);
    return css.slice(at, css.indexOf('}', at));
  };
  const overlay = block('.modal-overlay.modal-overlay--keyboard:not(.modal-overlay--docked)');
  assert.match(overlay, /top:\s*var\(--visible-top\)/);
  assert.match(overlay, /bottom:\s*auto/);
  assert.match(overlay, /height:\s*var\(--visible-height\)/);
  // Nicht die dvh-Rechnung: `dvh` kennt die Tastatur nicht.
  assert.match(block('.modal-overlay--keyboard:not(.modal-overlay--docked) > .modal-panel'), /max-height:\s*100%/);
});

test('der Service Worker precacht die neue Datei', () => {
  assert.match(read('../public/sw.js'), /'\/utils\/visible-area\.js'/);
});
