/**
 * The words of the widget set, as vis-2 loads them.
 *
 * `prefix` is not decoration: vis-2 reads it to learn the widget set's i18n prefix, and uses that
 * to prefix the labels of `visAttrs` and the name of the set itself. The keys of the dictionary
 * already carry it, so nothing is prefixed twice.
 */

import { dictionary } from '@alarm/dictionary';

const translations = { ...dictionary, prefix: 'alarm_' };

export default translations;
