const format = (text, vars = {}) => text.replace(/\{([A-Za-z0-9_.-]+)\}/g, (token, key) => Object.hasOwn(vars, key) ? String(vars[key]) : token);

export async function verifyFashionMessages(page, values, locale, check) {
    const dialogs = [];
    const listen = async dialog => { dialogs.push(dialog.message()); await dialog.accept(); };
    page.on('dialog', listen);
    try {
        await page.evaluate(() => {
            showPage('registerPage');
            for (const id of ['registerName', 'registerEmail', 'registerPassword', 'registerConfirmPassword']) document.getElementById(id).value = '';
            register();
            document.getElementById('registerName').value = 'Demo';
            document.getElementById('registerEmail').value = 'demo@example.com';
            document.getElementById('registerPassword').value = 'Example123!';
            document.getElementById('registerConfirmPassword').value = 'different';
            register();
            document.getElementById('registerConfirmPassword').value = 'Example123!';
            register();
            login();
            addToCart(1);
            filterProducts('dresses');
            logout();
        });
    } finally { page.off('dialog', listen); }
    const keys = ['messages.required', 'messages.password_mismatch', 'messages.register_success', 'messages.login_success', 'messages.cart_added', 'messages.filter', 'messages.logged_out'];
    keys.forEach((key, index) => check(dialogs[index] === format(values[key], { category: values.dresses }), `Fashion/${locale}: ${key}`));
}

export async function verifyBeautyMessages(page, values, locale, check) {
    const buttons = page.locator('[onclick="addToCart(this)"]');
    if (await buttons.count()) {
        for (let i = 0; i < await buttons.count(); i++) {
            const button = buttons.nth(i);
            const key = await button.evaluate(el => el.closest('.product-card').querySelector('h3[data-i18n]').dataset.i18n);
            await button.evaluate(el => el.click());
            check((await page.textContent('#toastMsg')) === format(values['messages.cart_added'], { product: values[key] }), `Beauty/${locale}: cart message ${i + 1} uses translated product name`);
            check((await button.textContent()).trim() === values['messages.added'], `Beauty/${locale}: temporary cart label ${i + 1}`);
        }
    }
    if (new URL(page.url()).pathname.endsWith('contact.html')) {
        await page.locator('input[type=text]').fill('Demo');
        await page.locator('input[type=email]').fill('demo@example.com');
        await page.locator('textarea').fill('Demo message');
        await page.locator('button[type=submit]').click();
        check(await page.textContent('#toastMsg') === values['messages.contact_sent'], `Beauty/${locale}: contact success`);
    }
}

export async function verifyTechstoreMessages(page, values, locale, check) {
    const file = new URL(page.url()).pathname;
    if (file.endsWith('register.html')) {
        await page.fill('#regPass', 'abcdefgh');
        await page.fill('#regPassConf', 'different');
        await page.evaluate(() => handleRegister({ preventDefault() {} }));
        check(await page.textContent('#toastMsg') === values['messages.password_mismatch'], `TechStore/${locale}: password mismatch toast`);
        await page.fill('#regPass', 'abc'); await page.fill('#regPassConf', 'abc');
        await page.evaluate(() => handleRegister({ preventDefault() {} }));
        check(await page.textContent('#toastMsg') === format(values['messages.password_short'], { count: 8 }), `TechStore/${locale}: password length and variable`);
        for (const [password, level] of [['abcdefgh', 'weak'], ['Abcdefgh', 'fair'], ['Abcdefg1', 'strong'], ['Abcdefg1!', 'very_strong']]) {
            await page.fill('#regPass', password);
            check(await page.textContent('#strengthText') === format(values['password.strength'], { level: values['password.' + level] }), `TechStore/${locale}: password strength ${level}`);
        }
        const toggle = page.locator('.pwd-toggle').first();
        await toggle.click();
        const show = await page.getAttribute('#regPass', 'type') === 'password';
        check(await toggle.getAttribute('aria-label') === values[show ? 'password.show' : 'password.hide'], `TechStore/${locale}: accessible password toggle`);
    }
    if (file.endsWith('index.html')) {
        await page.locator('.filter-btn[data-category="all"]').click();
        await page.locator('.add-cart-btn').first().click();
        check(await page.textContent('#toastMsg') === values['index.da_them_vao_gio_hang'], `TechStore/${locale}: cart toast`);
        await page.locator('[onclick="filterCategory(\'phone\')"]').click();
        check(await page.locator('.filter-btn.active').getAttribute('data-category') === 'phone', `TechStore/${locale}: category filter remains correct after translation`);
    }
    if (file.endsWith('dashboard.html')) {
        await page.locator('[data-section="analytics"]').click();
        check(await page.textContent('#pageTitle') === values['dashboard.phan_tich'], `TechStore/${locale}: dynamic dashboard heading`);
    }
}
