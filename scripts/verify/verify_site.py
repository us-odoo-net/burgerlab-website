#!/usr/bin/env python3
# Requires: pip install websockets · a Chrome with --remote-debugging-port reachable at CDP_URL
"""Verificación v2 BurgerLab: red simulada (4Mbps) + scrub buffer-aware + drawer.

1. Throttlea la red, mide cuándo el preloader destapa y el buffer del video.
2. Verifica el scrub en 5 puntos (buffer-aware: ct <= bufferedEnd).
3. Abre el drawer (Order now), agrega del menú, screenshot, cierra con Escape.
"""
import asyncio
import base64
import json
import os
import sys
import urllib.parse
import urllib.request

import websockets

CDP = os.environ.get("CDP_URL", "http://localhost:9267")
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8901/"
OUT = os.environ.get("SHOTS_DIR", "./verify-shots")
_id = 0


async def call(ws, method, params=None, timeout=60):
    global _id
    _id += 1
    mid = _id
    await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))

    async def waiter():
        while True:
            r = json.loads(await ws.recv())
            if r.get("id") == mid:
                if "error" in r:
                    raise RuntimeError(f"{method}: {r['error']}")
                return r.get("result", {})

    return await asyncio.wait_for(waiter(), timeout)  # kernel-cancel-only


async def ev(ws, expr, ap=False, retries=14):
    r = None
    for i in range(retries):
        try:
            r = await call(ws, "Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": ap})
            break
        except RuntimeError as e:
            if "-32000" in str(e) and i < retries - 1:
                await asyncio.sleep(0.7)  # backoff legitimate
                continue
            raise
    if r.get("exceptionDetails"):
        raise RuntimeError(str(r["exceptionDetails"])[:400])
    return r.get("result", {}).get("value")


async def shot(ws, name):
    s = await call(ws, "Page.captureScreenshot", {"format": "png"}, timeout=90)
    with open(f"{OUT}/{name}.png", "wb") as f:
        f.write(base64.b64decode(s["data"]))


async def main():
    os.makedirs(OUT, exist_ok=True)
    req = urllib.request.Request(f"{CDP}/json/new?about:blank", method="PUT")
    t = json.loads(urllib.request.urlopen(req, timeout=10).read())
    print("tab:", t["id"])
    try:
        async with websockets.connect(t["webSocketDebuggerUrl"], max_size=64 * 1024 * 1024) as ws:
            await call(ws, "Page.enable")
            await call(ws, "Runtime.enable")
            await call(ws, "Network.enable")
            # 4 Mbps down / 1 Mbps up / 40ms RTT — conexión doméstica modesta
            await call(ws, "Network.emulateNetworkConditions", {
                "offline": False, "latency": 40,
                "downloadThroughput": 4 * 1024 * 1024 / 8,
                "uploadThroughput": 1 * 1024 * 1024 / 8,
            })
            await call(ws, "Emulation.setDeviceMetricsOverride",
                       {"width": 1600, "height": 900, "deviceScaleFactor": 1, "mobile": False})
            await call(ws, "Page.navigate", {"url": URL})

            # medir preloader + buffer (event-driven en página, muestreo 300ms)
            timeline = await ev(ws, """new Promise(res=>{
              const t0=performance.now(); const samples=[];
              const iv=setInterval(()=>{
                const v=document.querySelector('#bgv');
                const pre=document.getElementById('preloader');
                const done=pre&&pre.classList.contains('preloader--done');
                let buf=0; try{ if(v&&v.buffered.length) buf=v.buffered.end(v.buffered.length-1);}catch{}
                samples.push({t:Math.round(performance.now()-t0), done, buf:+buf.toFixed(2), rs:v?v.readyState:-1});
                if(done && buf>=7.9){ clearInterval(iv); res({unveiled:samples.find(s=>s.done)?.t??null, samples:samples.filter((s,i)=>i%4===0||s.done), full:Math.round(performance.now()-t0)}); }
                if(performance.now()-t0>45000){ clearInterval(iv); res({timeout:true, samples:samples.slice(-8)}); }
              },300);
            })""", ap=True)
            print("carga (4Mbps):", json.dumps(timeline)[:400])
            await shot(ws, "10-loaded")

            # scrub en 5 puntos con verificación buffer-aware
            for name, p in [("11-hero", 0.0), ("12-split", 0.30), ("13-catalog", 0.66), ("14-cta", 1.0), ("15-mid-back", 0.5)]:
                m = await ev(ws, f"""(async()=>{{
                  const max=document.documentElement.scrollHeight-innerHeight;
                  const y=Math.round(max*{p});
                  window.scrollTo(0,y);
                  await new Promise(r=>setTimeout(r,500));
                  window.scrollTo(0,y);
                  await new Promise(r=>setTimeout(r,600));
                  const v=document.querySelector('#bgv');
                  let buf=0; try{{ if(v.buffered.length) buf=v.buffered.end(v.buffered.length-1);}}catch{{}}
                  return {{y:Math.round(scrollY), ct:+v.currentTime.toFixed(2), buf:+buf.toFixed(2)}};
                }})()""", ap=True)
                print(name, m)
            await shot(ws, "14-cta")

            # DRAWER: abrir con Order now (nav), tab menu, add, screenshot
            drawer = await ev(ws, """(async()=>{
              window.scrollTo(0,0);
              await new Promise(r=>setTimeout(r,400));
              document.querySelector('.nav__order').click();
              await new Promise(r=>setTimeout(r,500));
              const dlg=document.querySelector('.drawer');
              if(!dlg) return {open:false};
              // ir a la tab Menu y agregar 2 items
              const tabs=[...document.querySelectorAll('.drawer__tab')];
              tabs[0].click();
              await new Promise(r=>setTimeout(r,300));
              const adds=[...document.querySelectorAll('.drawer__menu-item .btn')];
              adds[0]&&adds[0].click();
              adds[1]&&adds[1].click();
              await new Promise(r=>setTimeout(r,300));
              tabs[1].click();
              await new Promise(r=>setTimeout(r,400));
              const lines=[...document.querySelectorAll('.drawer__lines li')].length;
              const total=document.querySelector('.drawer__total .mono')?.textContent;
              const badge=document.querySelector('.nav__badge')?.textContent;
              return {open:true, lines, total, badge};
            })()""", ap=True)
            print("drawer:", drawer)
            await shot(ws, "16-drawer")

            checkout = await ev(ws, """(async()=>{
              const btn=document.querySelector('.drawer__checkout');
              if(!btn) return {checkout:false};
              btn.click();
              await new Promise(r=>setTimeout(r,400));
              const placed=!!document.querySelector('.drawer__placed');
              return {checkout:true, placed};
            })()""", ap=True)
            print("checkout:", checkout)
            await shot(ws, "17-placed")

            closed = await ev(ws, """(async()=>{
              document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
              await new Promise(r=>setTimeout(r,400));
              return {drawerGone: !document.querySelector('.drawer')};
            })()""", ap=True)
            print("escape:", closed)
    finally:
        try:
            urllib.request.urlopen(f"{CDP}/json/close/{t['id']}", timeout=10)
        except Exception as e:
            print("close tab warn:", e)


asyncio.run(main())
