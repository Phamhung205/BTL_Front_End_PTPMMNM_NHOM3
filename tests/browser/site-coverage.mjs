// Audit the whole document, including hidden sections, options and accessible labels.
// Names, emails, prices, order IDs and avatar initials do not require translation.
export async function verifySiteCoverage(page, dictionary, locale, check) {
    await page.waitForFunction(expected => document.documentElement.lang === expected, locale);
    const result = await page.evaluate(values => {
        const errors = []; let total = 0;
        const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
        const format = (value, element) => {
            let vars = {};
            try { vars = JSON.parse(element.dataset.i18nVars || '{}'); } catch { errors.push('Invalid variables'); }
            return value.replace(/\{([A-Za-z0-9_.-]+)\}/g, (token, key) => Object.hasOwn(vars, key) ? String(vars[key]) : token);
        };
        for (const [attribute, target] of [['data-i18n', null], ['data-i18n-placeholder', 'placeholder'], ['data-i18n-title', 'title'], ['data-i18n-alt', 'alt'], ['data-i18n-aria-label', 'aria-label'], ['data-i18n-document-title', 'documentTitle']]) {
            document.querySelectorAll('[' + attribute + ']').forEach(element => {
                total++;
                const key = element.getAttribute(attribute), value = values[key];
                const actual = target === 'documentTitle' ? document.title : target ? element.getAttribute(target) : element.textContent;
                if (typeof value !== 'string' || normalize(actual) !== normalize(format(value, element))) errors.push({ key, actual, expected: value });
            });
        }
        const invariant = text => !/\p{L}/u.test(text) || /^[A-Z]$/.test(text)
            || /^#?[A-Z]+(?:-\d+)+$/.test(text) || /^\d+(?:[.,]\d+)?[KM]\+?$/.test(text)
            || /^\S+@\S+\.\S+$/.test(text) || /^(https?:)?\/\//.test(text);
        const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode, parent = node.parentElement, text = normalize(node.textContent);
            if (!parent || parent.closest('script,style,svg,code,noscript,[translate="no"],[data-i18n],[data-i18n-document-title]')) continue;
            if (!invariant(text)) errors.push({ untaggedText: text });
        }
        for (const attr of ['placeholder', 'title', 'alt', 'aria-label']) {
            document.querySelectorAll('[' + attr + ']').forEach(element => {
                const value = normalize(element.getAttribute(attr));
                if (!element.closest('[translate="no"]') && !element.hasAttribute('data-i18n-' + attr) && !invariant(value)) errors.push({ untaggedAttribute: attr, value });
            });
        }
        return { total, errors };
    }, dictionary);
    check(result.total > 0 && result.errors.length === 0,
        `${new URL(page.url()).pathname}/${locale}: ${result.total} translated positions; no uncovered UI text ${JSON.stringify(result.errors)}`);
}
