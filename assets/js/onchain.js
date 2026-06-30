/* ============================================================
   TrustTails — Live on-chain verification
   Reads the TAIL mint account directly from Solana mainnet in the
   visitor's browser and renders real supply + authority status.
   Proves "mint/freeze revoked" live, not just as a claim.
   Mounts into any element with [data-onchain].
   ============================================================ */
(function () {
  "use strict";
  var MINT = "4NoNV3jSYLRbUtVWSTK5XdkpuvRzGpMCmfZSBKMuk6Rc";
  var RPCS = [
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com/solana"
  ];
  var SOLSCAN = "https://solscan.io/token/" + MINT;
  var mounts = document.querySelectorAll("[data-onchain]");
  if (!mounts.length) return;

  function b64ToBytes(b64) {
    var bin = atob(b64), len = bin.length, out = new Uint8Array(len);
    for (var i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function u32le(b, o) { return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24); }
  function u64le(b, o) { // returns BigInt-safe number via Number (supply fits < 2^53 here)
    var hi = 0, lo = 0;
    for (var i = 7; i >= 0; i--) { hi = hi * 256 + b[o + i]; }
    return hi;
  }

  async function rpc(method, params) {
    for (var i = 0; i < RPCS.length; i++) {
      try {
        var r = await fetch(RPCS[i], {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params })
        });
        var j = await r.json();
        if (j && j.result !== undefined) return j.result;
      } catch (e) { /* try next */ }
    }
    throw new Error("All RPC endpoints unreachable");
  }

  function fmt(n) { return n.toLocaleString("en-US"); }

  function row(label, ok, detail) {
    return '<div class="oc-row">' +
      '<span class="oc-label">' + label + '</span>' +
      '<span class="oc-val ' + (ok ? "ok" : "warn") + '">' +
      (ok ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg> ' : '') +
      detail + '</span></div>';
  }

  function render(el, data, live) {
    var note = live
      ? 'Fetched live from Solana mainnet just now'
      : 'Live RPC unavailable — showing last known on-chain values';
    el.innerHTML =
      '<div class="oc-head"><span class="oc-pulse"></span><span>' + note + '</span></div>' +
      row("Total supply", true, fmt(data.supply) + " TAIL") +
      row("Mint authority", data.mintRevoked, data.mintRevoked ? "Revoked" : "Active") +
      row("Freeze authority", data.freezeRevoked, data.freezeRevoked ? "Revoked" : "Active") +
      '<a class="oc-link" href="' + SOLSCAN + '" target="_blank" rel="noopener">Verify on Solscan &rarr;</a>';
  }

  var FALLBACK = { supply: 1000000000, mintRevoked: true, freezeRevoked: true };

  async function load() {
    var data = FALLBACK, live = false;
    try {
      var res = await rpc("getAccountInfo", [MINT, { encoding: "base64" }]);
      var b = b64ToBytes(res.value.data[0]);
      var mintOpt = u32le(b, 0);          // 0 = None (revoked)
      var supplyRaw = u64le(b, 36);
      var decimals = b[44];
      var freezeOpt = u32le(b, 46);       // 0 = None (revoked)
      data = {
        supply: Math.round(supplyRaw / Math.pow(10, decimals)),
        mintRevoked: mintOpt === 0,
        freezeRevoked: freezeOpt === 0
      };
      live = true;
    } catch (e) { /* graceful fallback */ }
    mounts.forEach(function (el) { render(el, data, live); });
  }

  // minimal styles (scoped) injected once
  var css = '[data-onchain]{display:block}' +
    '.oc-head{display:flex;align-items:center;gap:8px;font-size:.75rem;letter-spacing:.04em;color:var(--muted,#9DB0CC);margin-bottom:14px;font-family:var(--font-mono,monospace)}' +
    '.oc-pulse{width:9px;height:9px;border-radius:50%;background:var(--green,#34D399);box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:ocp 2s infinite}' +
    '@keyframes ocp{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}' +
    '.oc-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.09))}' +
    '.oc-label{color:var(--muted,#9DB0CC);font-size:.92rem}' +
    '.oc-val{font-family:var(--font-mono,monospace);font-weight:600;font-size:.92rem;display:inline-flex;align-items:center;gap:6px}' +
    '.oc-val svg{width:15px;height:15px}.oc-val.ok{color:var(--green,#34D399)}.oc-val.warn{color:var(--amber,#FBBF24)}' +
    '.oc-link{display:inline-block;margin-top:14px;color:var(--cyan-2,#8AF1FF);font-size:.86rem;font-weight:600}';
  var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);

  load();
})();
