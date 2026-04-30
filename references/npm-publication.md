# AAPS npm Publication Reference

This note records the public, non-secret publication setup for AAPS.

## Package

- npm package: `@lazyingart/aaps`
- Initial release: `0.1.0`
- Current package version: follows `package.json`
- Homepage: `https://aaps.lazying.art`
- Repository: `https://github.com/lachlanchen/AAPS`
- CLI binary: `aaps`
- License: Apache-2.0

## Install

```bash
npm install -g @lazyingart/aaps
aaps studio --host 127.0.0.1 --port 8796
```

## Release Publisher

The npm package is configured with Trusted Publishing through GitHub Actions OIDC:

- GitHub repository: `lachlanchen/AAPS`
- Workflow file: `.github/workflows/npm-publish.yml`
- npm Trusted Publisher entry: `lachlanchen/AAPS`, `npm-publish.yml`
- Release command inside workflow: `npm publish --access public --provenance`

The workflow runs tests, validates the project, checks the package tarball, and publishes with provenance. It does not require a committed `.npmrc` or a registry token when Trusted Publishing is active.

## Security Notes

- Never commit `.env`, `.npmrc`, `.aaps-work/`, registry tokens, OTPs, or npm debug logs.
- Prefer Trusted Publishing for future releases.
- If a temporary automation token is used for bootstrapping, revoke or rotate it after the trusted publisher is verified.
