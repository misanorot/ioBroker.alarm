/**
 * The words the element shows, in the language of the ioBroker system.
 *
 * They come from the dictionary of the widgets (`src-shared/i18n`): the build picks the keys of `WORD_KEYS` in every
 * language and puts them in as `__ALARM_WORDS__` (`vite.config.ts`), so the vis-2 widget, the devices tile and this
 * element say the same.
 */
import type { WordKey } from './constants';

declare const __ALARM_WORDS__: Record<string, Partial<Record<WordKey, string>>>;

/** A word in the language of the system; every `%s` takes the next argument, as `I18n.t` of the widgets does */
export type Translate = (key: WordKey, ...args: (string | number)[]) => string;

/**
 * The words of one language, English where it has none
 *
 * @param lang the language of the ioBroker system
 */
export function getTranslate(lang: string): Translate {
    const words = __ALARM_WORDS__[lang] || {};
    const english = __ALARM_WORDS__.en || {};
    return (key, ...args) => {
        let text = words[key] || english[key] || key;
        for (const arg of args) {
            text = text.replace('%s', String(arg));
        }
        return text;
    };
}
