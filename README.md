# Consent Portal

The SHARES Consent Portal is a FHIR Consent resource administration and management UI for visually browsing, creating, validating, simulating, and executing data sharing based on FHIR R5 `Consent`. It connects to a configurable FHIR server and an optional CDS service to label sensitive data and preview how consents impact sharing.

Consent Portal natively supports the FHIR R5 specification. Due to significant differences with the Consent resource in prior FHIR releases, only R5 is supported.

This project is written in TypeScript using [Angular](https://angular.io), [Bootstrap](https://getbootstrap.com/), and [SCSS](http://sass-lang.com) for custom CSS. `npm` is the package manager.

**You must have a running FHIR R5 server backend (such as HAPI FHIR) to use this frontend project.**

## Quick start (dev)

Assuming you already have node installed via [`nvm`](https://github.com/nvm-sh/nvm) or similar, run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files. The following must be set:

	export CONSENT_PORTAL_DEFAULT_FHIR_URL=https://your.fhir.server.example.com/fhir
	export CONSENT_PORTAL_CDS_ROOT_URL=https://cds-hooks.sandbox.asushares.com # Any instance of our CDS Hooks service.

Runtime configuration is read from `src/assets/configuration.js` at startup and provides the FHIR and CDS base URLs:

```javascript
(function(window) {
    window["CONSENT_PORTAL_DEFAULT_FHIR_URL"] = "https://fhir.sandbox.asushares.com/fhir";
    window["CONSENT_PORTAL_CDS_ROOT_URL"] = "https://cds-hooks.sandbox.asushares.com";
})(this);
```

Optional auth: if you enable bearer tokens in the backend service and store a JWT at `localStorage['jwt']`, requests will include `Authorization: Bearer <token>`.

## Key screens and routes

- Landing: `/`
- Login: `/login`
- Patient search/launch: `/patient`
- Patient portal: `/portal/:patient_id`
- Patient consent builder: `/portal/:patient_id/consent`
- Consent browser (manager): `/manager/browser`
- Consent builder (manager): `/manager/builder` and `/manager/builder/:consent_id`
- Simulator: `/simulator/:consent_id`
- Provider portal: `/provider`
- Settings and sandbox: `/settings`, `/sandbox`

## Capabilities

### Patient portal
- loads the selected patient’s data via FHIR `$everything` and renders sections incrementally as pages arrive
- sections include medications, conditions, encounters, labs, allergies, procedures, care plans, and documents/notes (inline decoded text when present)
- “view as” consent toggle applies a selected consent to show shared vs redacted items
- optional sensitivity labeling via CDS with adjustable confidence and post‑simulation filters
- quick link to build a new patient‑scoped consent

### Provider portal
- select organization and purpose(s) of use (e.g., treatment, research)
- view patients with active consents authorizing that organization/purpose
- apply consent to generate an “allowed‑only” bundle view
- optionally transfer the allowed‑only data to a destination FHIR server as a transaction

### Consent manager
- browser: list, sort, page, and review consents; shows patient and organization names
- builder: create and update FHIR R5 `Consent` with structured editing for provisions, actors, labels, and policy fields
- validation: invoke server `$validate` (optional profile) and surface results

### Simulator
- package patient data into a bundle and call a CDS Hooks service for sensitivity labeling
- filter by label category and by consent decision (permit / deny / all)
- optional bulk data prefetch via HAPI‑FHIR `$export` (NDJSON) with progress polling and local caching to speed repeated runs
- alternate demonstration path for CQL evaluation

## Data flow highlights

- patient data retrieval: `GET {FHIR}/Patient/{id}/$everything?_count=1000` with pagination by following `link[rel=next]`
- consent lifecycle: `GET/POST/PUT/DELETE {FHIR}/Consent`
- labeling: CDS Hooks request with patient bundle; labels returned in `meta.security` per resource; “view as” consent intersects labels with consent `provision.securityLabel`

## Building for Production

To build a reusable image with [Docker](https://www.docker.com) and [nginx](http://nginx.org), use the included Dockerfile. For example:

```sh
	docker build -t asushares/portal:latest . # though you probably want your own repo and tag strings :)

	# or cross-platform
	docker buildx build --platform linux/arm64/v8,linux/amd64 -t asushares/portal:latest . --push
```

### Running a Pre-Built Image

On your local machine or container hosting environment:

```sh
	docker run -d -p 4200:80 --restart unless-stopped \
	  -e "CONSENT_PORTAL_DEFAULT_FHIR_URL=http://localhost:3000/fhir" \
	  -e "CONSENT_PORTAL_CDS_ROOT_URL=https://cds-hooks.sandbox.asushares.com" \
	  asushares/portal:latest # or any official tag
```

## Troubleshooting

- CORS: ensure your FHIR/CDS endpoints allow the browser origin
- 401s: set a JWT at `localStorage['jwt']` and enable bearer tokens if your servers require auth
- `$everything` paging: large charts will stream in; the UI renders sections incrementally


## Attribution & Contributors

- Preston Lee
- Abhishek Dhadwal
- Daniel Mendoza

## License

Apache 2.0
