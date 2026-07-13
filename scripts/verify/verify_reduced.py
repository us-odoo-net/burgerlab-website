#!/usr/bin/env python3
# Requires: pip install websockets · a Chrome with --remote-debugging-port reachable at CDP_URL
"""Verifica el scrub CON prefers-reduced-motion: reduce emulado (caso Raymond).

El scrub debe seguir funcionando (scroll nativo, sin Lenis): ct avanza al
scrollear. dataset.motion debe reportar 'reduced'.
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
URL = sys.argv[1] if len(sys.argv) > 1 else "https://burgerlab.facyt.net/"
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


async def main():
    os.makedirs(OUT, exist_ok=True)
    req = urllib.request.Request(f"{CDP}/json/new?about:blank", method="PUT")
    t = json.loads(urllib.request.urlopen(req, timeout=10).read())
    print("tab:", t["id"])
    try:
        async with websockets.connect(t["webSocketDebuggerUrl"], max_size=64 * 1024 * 1024) as ws:
            await call(ws, "Page.enable")
            await call(ws, "Runtime.enable")
            await call(ws, "Emulation.setDeviceMetricsOverride",
                       {"width": 1600, "height": 900, "deviceScaleFactor": 1, "mobile": False})
            await call(ws, "Emulation.setEmulatedMedia",
                       {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
            await call(ws, "Page.navigate", {"url": URL})

            ready = await ev(ws, """new Promise(res=>{
              const t0=Date.now();
              const chk=()=>{
                const v=document.querySelector('#bgv');
                const mode=document.documentElement.dataset.motion;
                if(document.readyState==='complete' && v && v.readyState>=3)
                  return res({ok:true, mode, rs:v.readyState, dur:v.duration,
                              reducedMQ: matchMedia('(prefers-reduced-motion: reduce)').matches});
                if(Date.now()-t0>30000) return res({timeout:true, mode, rs:v?v.readyState:-1});
                setTimeout(chk,200);
              }; chk();
            })""", ap=True)
            print("ready:", ready)

            for name, p in [("r-hero", 0.0), ("r-mid", 0.45), ("r-end", 1.0)]:
                m = await ev(ws, f"""(async()=>{{
                  const max=document.documentElement.scrollHeight-innerHeight;
                  window.scrollTo(0, Math.round(max*{p}));
                  await new Promise(r=>setTimeout(r,700));
                  const v=document.querySelector('#bgv');
                  return {{y:Math.round(scrollY), ct:+v.currentTime.toFixed(2)}};
                }})()""", ap=True)
                print(name, m)

            shot = await call(ws, "Page.captureScreenshot", {"format": "png"}, timeout=90)
            with open(f"{OUT}/20-reduced-mid.png", "wb") as f:
                f.write(base64.b64decode(shot["data"]))
    finally:
        try:
            urllib.request.urlopen(f"{CDP}/json/close/{t['id']}", timeout=10)
        except Exception as e:
            print("close warn:", e)


asyncio.run(main())
