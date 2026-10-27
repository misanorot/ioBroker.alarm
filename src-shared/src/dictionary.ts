/**
 * The words of the alarm widgets, in the eleven languages the adapter supports.
 *
 * One dictionary for everything: the panel, the vis-2 widget's settings and the devices tile's
 * settings. Every key already carries the `alarm_` prefix, which is what lets the same file serve
 * both hosts - vis-2 prefixes the keys of a widget set that does not carry the prefix yet, the
 * devices app prefixes nothing at all, and a key that is already prefixed passes through either.
 *
 * English stands in wherever a language has no translation of its own; `I18n.t` falls back to it.
 */

import en from '../i18n/en.json';
import de from '../i18n/de.json';
import ru from '../i18n/ru.json';
import pt from '../i18n/pt.json';
import nl from '../i18n/nl.json';
import fr from '../i18n/fr.json';
import it from '../i18n/it.json';
import es from '../i18n/es.json';
import pl from '../i18n/pl.json';
import uk from '../i18n/uk.json';
import zhCn from '../i18n/zh-cn.json';

export const dictionary = { en, de, ru, pt, nl, fr, it, es, pl, uk, 'zh-cn': zhCn };

export default dictionary;
