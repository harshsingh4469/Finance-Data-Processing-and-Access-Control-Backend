from dotenv import load_dotenv
load_dotenv()

import os
import subprocess
import asyncio
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import Response

NODE_PORT = int(os.environ.get("NODE_PORT", "8002"))
_nodejs_proc = None

EXCLUDED_HEADERS = {
    "content-encoding", "content-length", "transfer-encoding",
    "connection", "keep-alive", "upgrade",
}


def _start_nodejs():
    global _nodejs_proc
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    nodejs_dir = os.path.join(backend_dir, "nodejs")
    env = os.environ.copy()
    _nodejs_proc = subprocess.Popen(
        ["node", "server.js"],
        cwd=nodejs_dir,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _start_nodejs()
    # Wait for Node.js to be ready
    await asyncio.sleep(4)
    yield
    if _nodejs_proc:
        _nodejs_proc.terminate()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None)


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
)
async def proxy(path: str, request: Request):
    qs = request.url.query
    target = f"http://localhost:{NODE_PORT}/{path}"
    if qs:
        target = f"{target}?{qs}"

    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() not in EXCLUDED_HEADERS and k.lower() != "host"
    }
    body = await request.body()

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=target,
                headers=headers,
                content=body,
                follow_redirects=True,
            )
        except (httpx.ConnectError, httpx.ConnectTimeout):
            return Response(
                content=b'{"message":"Service starting up, please retry in a moment"}',
                status_code=503,
                media_type="application/json",
            )

    resp_headers = {
        k: v
        for k, v in resp.headers.items()
        if k.lower() not in EXCLUDED_HEADERS
    }

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=resp_headers,
        media_type=resp.headers.get("content-type"),
    )
