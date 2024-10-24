Assuming you set up constants like `PROJECT_ID` to match your stuff and you have your Google SDK auth stuff downloaded locally...

1. First run the CORS proxy backend:

```bash
cd back
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

2. Then run the Vite frontend:

```bash
cd front
yarn
yarn dev
```

Badabing badaboom.
