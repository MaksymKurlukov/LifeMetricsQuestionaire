# PSS10 characterization tests

These tests freeze the existing WordPress PSS10 behavior before the generic migration. They execute the current source without changing it and use only Node.js/PHP standard capabilities.

Run from the repository root:

```sh
node lifemetrics-questionnaires/tests/pss10-frontend-characterization.test.js
/Applications/XAMPP/xamppfiles/bin/php lifemetrics-questionnaires/tests/pss10-rest-characterization.test.php
node lifemetrics-questionnaires/tests/backend-logic.test.js
```

The frontend test safely instruments an in-memory copy of `app.js` inside a VM to call its actual score/payload functions. It checks the exact questions, labels, reverse mapping, 10/20/21/26/27/50 vectors, stored/displayed category mismatch, payload shape, 400 ms timing, errors, root isolation, markup hooks, CTA stubs, and 13 deliberate mutations. It never writes an instrumented runtime file.

The PHP test loads the real plugin entry point behind minimal test-only WordPress stubs. It checks REST boundary categories, server-derived category, forwarded payload, duplicate response, validation/upstream errors, and two template instances with unique IDs.

Browser screenshots, live timing/focus interaction, responsive layout, WordPress activation, Gutenberg, and Elementor are not claimed here because the isolated WordPress/browser environment is deferred to STAGES 8-9.
