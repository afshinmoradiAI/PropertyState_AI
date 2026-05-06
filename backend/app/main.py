from fastapi import FastAPI
 
app = FastAPI(title="Paper Writer API", version="0.1.0")
 
@app.get("/health")
async def health():
    return {"status": "ok"}
