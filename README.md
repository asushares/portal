# Consent Manager

FHIR Consent resource administration and management UI for visually browsing, creating, and maintaining Consent-related FHIR documents from a FHIR backend URL configured at runtime.

Consent Manager natively supports the FHIR R5 specification. Due to significant differences with the Consent resource in prior FHIR releases, only R5 is supported.

This project is written in TypeScript using [Angular](https://angular.io), [Bootstrap](https://getbootstrap.com/), and [SCSS](http://sass-lang.com) for custom CSS. `npm` is the package manager.

**You must have a running FHIR R5 server backend (such as HAPI FHIR) to use this frontend project.**

 Assuming you already have node installed via [`nvm`](https://github.com/nvm-sh/nvm) or similar, run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files. The following must be set:

	export CONSENT_BUILDER_DEFAULT_FHIR_URL=https://your.fhir.server.example.com/fhir
	export CONSENT_CDS_ROOT_URL=https://cds-hooks.sandbox.asushares.com # Any instance of our CDS Hooks service.


# Building for Production

To build a reusable image with [Docker](https://www.docker.com) and [nginx](http://nginx.org), use the included Dockerfile. For example:

```sh
	docker build -t asushares/consent-manager:latest . # though you probably want your own repo and tag strings :)

	# or cross-platform
	docker buildx build --platform linux/arm64/v8,linux/amd64 -t asushares/consent-manager:latest . --push
```

## Running a Pre-Built Image

On your local machine or container hosting environment:

```sh
	docker run -d -p 4200:80 --restart unless-stopped -e "CONSENT_BUILDER_DEFAULT_FHIR_URL=http://localhost:3000" asushares/consent-manager:latest # or any official tag
```


# Attribution

Preston Lee

# License

Apache 2.0
