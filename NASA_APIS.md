# NASA APIs

NASA and USGS data sources used by the project. Add each source with its endpoint, auth, and the fields the project reads.
Endpoints below come from public documentation and have not been tested against the project yet.

| Source | Base URL | Auth | Use |
|---|---|---|---|
| NASA Open APIs | `https://api.nasa.gov` | API key (`NASA_API_KEY`; `DEMO_KEY` has low rate limits) | Entry point for NASA public APIs |
| Mars Rover Photos | `https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/photos` | API key | Rover images by sol or Earth date |
| NASA Image and Video Library | `https://images-api.nasa.gov/search?q={query}` | None | Search images, video and audio |
| NASA Mars Trek (WMTS tiles) | `https://trek.nasa.gov/tiles/Mars/EQ/` | None | Global Mars map layers |
| USGS Astrogeology STAC | `https://stac.astrogeology.usgs.gov/api/` | None | Mars DTM and image products |
| PDS Geosciences Node | `https://pds-geosciences.wustl.edu` | None | Mars mission data archives |
| NASA OSDR | `https://osdr.nasa.gov/bio/repo/` | None | Space biology and health data |

## Configuration

- `NASA_API_KEY` goes in `.env` (see `.env.example`). Never commit the key.

## Per-source notes

Add one section per source: request example, response fields used, rate limits, caching.
