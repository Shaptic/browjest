Assuming you set up constants like `PROJECT_ID` to match your stuff and you have your Google SDK auth stuff downloaded locally...

# The "Backend"

You have a few choices here: 
 - you can either set up CORS on your GCS buckets to allow your frontend's origin and write the correct OAuth code,
 - you can make your GCS bucket publicly accessible from anywhere which lets JS access it via Ajax, or
 - you can use a simple CORS proxy as your backend that just forwards requests to GCS

We'll use the third approach here cuz sharing auth code publicly is a Bad Idea. 
So to run the CORS proxy backend:

```bash
cd back
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

# The Frontend
This is just a simple Vite frontend:

```bash
cd front
yarn      # install dependencies
yarn dev
```

Badabing badaboom.

You might need to make sure the host:port in the front end lines up with your backend, but otherwise it should Just Work once you've configured it with GCS properly.
