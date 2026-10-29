/**
 * Modul: Der sichtbare Ausschnitt ueber der Bildschirmtastatur
 * Zweck: Das Dialog-Blatt (components/modal.js, `.modal-overlay--keyboard` in
 *        layout.css) richtet sich nach dem Teil des Bildschirms, den man bei
 *        offener Tastatur noch sieht.
 *
 * WARUM DAS BLATT UNTER DER TASTATUR LAG. Chrome auf Android (ab 108, ohne
 * `interactive-widget` im Viewport-Meta) und Safari auf dem iPhone verkleinern
 * fuer die Tastatur nur den Visual Viewport. Der Layout-Viewport, `100dvh` und
 * alles mit `position: fixed` bleiben bildschirmhoch - also auch der Dialog,
 * an dessen Unterkante das Blatt haengt. Gemessen am Formular "Neue Aufgabe"
 * (Android, Gboard): ab "Tags" lag alles hinter der Tastatur, die Fusszeile mit
 * "Speichern" ganz. Um an ein verdecktes Feld zu kommen, schob der Browser den
 * sichtbaren Ausschnitt nach unten, und oben rutschten Kopf, X und das
 * fokussierte Titelfeld aus dem Bild.
 *
 * WARUM NICHT `interactive-widget=resizes-content`. Das schrumpfte die ganze
 * App bei jeder Tastatur (die Tab-Leiste fuehre ueber ihr mit), Safari kennt es
 * nicht, und router.js erkennt die offene Tastatur genau daran, dass der
 * Visual Viewport kleiner ist als das Fenster (`keyboard-visible`, #634) - mit
 * dem Schalter schrumpften beide gleich, und der FAB bliebe stehen.
 */

/** Unterhalb davon ist der Unterschied Rundung, keine Tastatur. */
const MIN_COVERED_PX = 1;

/** Luft zwischen Feld und Rand des Rumpfs, wenn er nachrollt (`--space-3`). */
const REVEAL_MARGIN_PX = 12;

/**
 * Der Teil des Layout-Viewports, den man gerade sieht - oder `null`, wenn es
 * der ganze ist.
 *
 * PINCH-ZOOM ZAEHLT NICHT. Gezoomt ist der Visual Viewport auch kleiner, aber
 * dann soll der Dialog mitvergroessert werden und nicht in den Ausschnitt
 * umbrechen.
 *
 * DIE HOEHE DES LAYOUT-VIEWPORTS IST DAS GROESSERE VON ZWEI MASSEN. Chrome
 * laesst `innerHeight` bei der Tastatur stehen, Safari hat es in manchen
 * Fassungen mitschrumpfen lassen; `clientHeight` der Wurzel (der initiale
 * Containing Block) bleibt in beiden stehen.
 *
 * @param {{ height: number, offsetTop: number, scale?: number } | null | undefined} vv
 *        `window.visualViewport`
 * @param {number} layoutHeight  Hoehe des Layout-Viewports in CSS-Pixeln
 * @returns {{ top: number, height: number } | null}
 */
export function visibleArea(vv, layoutHeight) {
  if (!vv || !Number.isFinite(vv.height) || !(layoutHeight > 0)) return null;
  if (Math.abs((vv.scale ?? 1) - 1) > 0.01) return null;
  if (layoutHeight - vv.height < MIN_COVERED_PX) return null;
  return {
    top: Math.max(0, Math.round(vv.offsetTop || 0)),
    height: Math.round(vv.height),
  };
}

/**
 * Die Hoehe des Layout-Viewports (siehe visibleArea).
 * @returns {number}
 */
export function layoutViewportHeight() {
  return Math.max(window.innerHeight || 0, document.documentElement?.clientHeight || 0);
}

/**
 * Wie weit ein Scroll-Container rollen muss, damit `field` darin zu sehen ist
 * (positiv: nach unten). Beide Rechtecke im selben Koordinatensystem
 * (`getBoundingClientRect`).
 *
 * Ein Feld, das hoeher ist als der Container (der Notiztext), bleibt mit der
 * OBERKANTE im Bild: dort steht, was man gerade schreibt, nicht am Ende.
 *
 * @param {{ top: number, bottom: number }} field
 * @param {{ top: number, bottom: number }} port
 * @returns {number}
 */
export function revealDelta(field, port) {
  if (field.top < port.top) return field.top - port.top - REVEAL_MARGIN_PX;
  if (field.bottom > port.bottom) {
    const down = field.bottom - port.bottom + REVEAL_MARGIN_PX;
    const roomAbove = Math.max(0, field.top - port.top - REVEAL_MARGIN_PX);
    return Math.min(down, roomAbove);
  }
  return 0;
}
