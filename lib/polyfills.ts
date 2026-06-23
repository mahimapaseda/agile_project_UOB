/**
 * Runtime polyfills for Safari / iOS 15 (below Next.js 16 default Safari 16.4 target).
 * Loaded via instrumentation-client.ts before application code runs.
 */
import 'core-js/actual/array/at';
import 'core-js/actual/array/flat';
import 'core-js/actual/array/flat-map';
import 'core-js/actual/object/from-entries';
import 'core-js/actual/object/has-own';
import 'core-js/actual/string/replace-all';
import 'core-js/actual/promise/all-settled';
import 'core-js/actual/structured-clone';
