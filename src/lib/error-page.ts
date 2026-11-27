export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>TASMEEM SOURCE — Something went wrong</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      *{box-sizing:border-box} body { font: 15px/1.6 "Manrope", system-ui, sans-serif; background: linear-gradient(160deg,#f7f5ef,#f3ead3); color: #1c2742; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.25rem; }
      .card { max-width: 26rem; width: 100%; text-align: center; padding: 2.4rem 2rem; background:#fff; border:1px solid #e8e2d2; border-radius: 20px; box-shadow: 0 24px 60px -24px rgba(20,31,56,.35); }
      .mark { width:64px;height:64px;margin:0 auto 1rem;border-radius:18px;background:#141f38;color:#d9a441;display:grid;place-items:center;font-size:26px;font-weight:800; }
      h1 { font-size: 1.3rem; margin: 0 0 .5rem; letter-spacing:.02em }
      p { color: #667085; margin: 0 0 1.6rem; font-size:.92rem }
      .actions { display: flex; gap: .6rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: .8rem 1.3rem; border-radius: 12px; font: inherit; font-weight:700; cursor: pointer; text-decoration: none; border: 1px solid transparent; min-height:48px }
      .primary { background: #141f38; color: #fff; }
      .secondary { background: #fff; color: #141f38; border-color: #ddd6c2; }
      small{display:block;margin-top:1.4rem;color:#98a2b3;letter-spacing:.18em;font-size:.62rem;text-transform:uppercase}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="mark">T</div>
      <h1>Something went wrong</h1>
      <p>Sorry — this page didn't load. Your data is safe. Please try again, or head back to your workspace.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go to workspace</a>
      </div>
      <small>TASMEEM SOURCE · Discover. Evaluate. Source.</small>
    </div>
  </body>
</html>`;
}
