# Disaster Buddy

A mobile-first disaster preparedness and resource discovery app.

## Setup

1. Create a folder called `disaster-buddy-v2`
2. Put these files into the matching folders.
3. Create a `.env` file in the project root:

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

4. Run:

```bash
npm install
npm run dev
```

5. Open the local URL on your computer.

## Phone testing

Make sure your phone and laptop are on the same Wi-Fi. Vite will show a Network URL. Open that URL on your phone.

## Data

Replace:

```text
public/data/resources.geojson
```

with your real Mapbox-ready GeoJSON data.

Coordinates must be WGS84 longitude/latitude:

```json
[-117.1611, 32.7157]
```

## AI

The app currently includes a placeholder assistant. Do not put API keys in frontend code. Add a secure backend or serverless function for real AI responses.
