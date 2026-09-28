"use strict";
// The baked epistemic caveats are the fallback for the service's own (meta.epistemic_caveats),
// shown only while the bubblegauge API is unreachable. Derived from the service's guardrail #4,
// NOT from this implementation: since bubblegauge #136 (owner decision D10, 2026-09-28) the
// service keeps the caveat that nominal weights are not measured influence (Paruolo, Saisana &
// Saltelli 2013) and no longer promises an annual sensitivity script. That script had failed at
// import since the service's v3.3.0 and was deleted. A fallback must not promise what the
// service withdrew.
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

const CAVEAT = "NOMINAL≠EFFECTIVE WEIGHTS: weights are design intent, not measured influence (PSS 2013).";

module.exports = function register(t) {
  t("guardrail #4: the baked caveats say what the service says and promise no sensitivity script", () => {
    for (const f of ["src/bubblegauge.tsx", "bubblegauge.js"]) {
      const src = raw(f);
      ok(src.includes(CAVEAT), `${f}: the baked guardrail #4 caveat must be the service's text`);
      ok(!/sensitivity script/i.test(src), `${f}: the baked caveats promise a sensitivity script the service withdrew`);
    }
  });
};
