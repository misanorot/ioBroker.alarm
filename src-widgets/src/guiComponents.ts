/**
 * What the widget set takes from `@iobroker/gui-components`: `I18n`, nothing else.
 *
 * The build points every import of the package here (see `vite.config.ts`). vis-2 does not share
 * gui-components, so each widget set bundles its own copy, and the package's entry drags in
 * cronstrue, cropperjs, the type detector and parts of react-icons, which tree-shaking cannot take
 * out again - hundreds of kilobytes for a single class. `I18n` has no imports of its own, and a
 * second copy of it is harmless: it keeps the dictionary and the language on `window`, shared by
 * every copy.
 *
 * `Connection` is a type only, so it is erased at compile time and needs nothing here.
 *
 * A shared component that starts importing anything else from the package fails the build with a
 * missing export, rather than silently pulling the rest back in.
 */

export { I18n } from '@iobroker/gui-components/build/i18n.js';
