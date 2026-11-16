/**
 * The words of the tile, as the devices app loads them.
 *
 * No `prefix` here, unlike the vis-2 side: the devices app hands the dictionary to
 * `I18n.extendTranslations` unchanged, and the keys already carry the `alarm_` prefix themselves.
 */

import { dictionary } from '@alarm/dictionary';

export default dictionary;
