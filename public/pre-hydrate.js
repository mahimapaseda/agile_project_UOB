/**
 * Runs before React hydrates:
 * 1. ES5 polyfills for iOS Safari 15.0–15.3
 * 2. Strips attributes injected by browser extensions (Bitdefender, etc.)
 *
 * Loaded in <body> via PreHydrateScript — not in <head>, to avoid hydration
 * mismatches when extensions inject scripts into <head>.
 */
(function () {
  'use strict';

  if (!Array.prototype.at) {
    Array.prototype.at = function (n) {
      var len = this.length;
      var k = n >= 0 ? n : len + n;
      if (k < 0 || k >= len) return undefined;
      return this[k];
    };
  }

  if (!Object.hasOwn) {
    Object.hasOwn = function (obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    };
  }

  if (typeof globalThis.structuredClone !== 'function') {
    globalThis.structuredClone = function (val) {
      return JSON.parse(JSON.stringify(val));
    };
  }

  var EXT = ['bis_skin_checked', 'bis_register'];

  function strip(el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = 0; i < EXT.length; i++) {
      if (el.hasAttribute(EXT[i])) el.removeAttribute(EXT[i]);
    }
    for (var j = 0; j < el.children.length; j++) strip(el.children[j]);
  }

  function stripAll() {
    strip(document.documentElement);
  }

  stripAll();

  if (typeof MutationObserver === 'undefined') return;

  var obs = new MutationObserver(function (records) {
    for (var k = 0; k < records.length; k++) {
      var rec = records[k];
      if (
        rec.type === 'attributes' &&
        rec.attributeName &&
        EXT.indexOf(rec.attributeName) !== -1
      ) {
        rec.target.removeAttribute(rec.attributeName);
      } else if (rec.type === 'childList') {
        for (var n = 0; n < rec.addedNodes.length; n++) {
          strip(rec.addedNodes[n]);
        }
      }
    }
  });

  obs.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    childList: true,
    attributeFilter: EXT,
  });

  var frames = 0;
  function rafStrip() {
    stripAll();
    if (++frames < 150) requestAnimationFrame(rafStrip);
  }
  requestAnimationFrame(rafStrip);

  try {
    var fontScale = localStorage.getItem('dbms-font-scale') || 'device';
    var multipliers = { device: 1, small: 0.875, medium: 1, large: 1.125, xlarge: 1.25 };
    if (multipliers[fontScale] != null) {
      document.documentElement.dataset.fontScale = fontScale;
      document.documentElement.style.setProperty(
        '--dbms-font-scale',
        String(multipliers[fontScale]),
      );
    }
    if (localStorage.getItem('dbms-compact-density') === 'true') {
      document.documentElement.classList.add('dbms-compact');
    }
  } catch (e) {
    /* localStorage unavailable */
  }

  window.addEventListener(
    'load',
    function () {
      setTimeout(function () {
        obs.disconnect();
      }, 8000);
    },
    { once: true }
  );
})();
