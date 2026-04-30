# npm Publishing

AAPS is prepared for npm distribution as `@lazyingart/aaps`.

## Trusted Publishing Setup

The repository uses `.github/workflows/npm-publish.yml` for tokenless publishing with GitHub Actions OIDC.

Configure npm package settings with:

- Package: `@lazyingart/aaps`
- Publisher: GitHub Actions
- Organization or user: `lachlanchen`
- Repository: `AAPS`
- Workflow filename: `npm-publish.yml`
- Environment: blank, unless a GitHub deployment environment is added later

Equivalent npm CLI command after the package exists:

```bash
npm install -g npm@^11.10.0
npm trust github @lazyingart/aaps --repo lachlanchen/AAPS --file npm-publish.yml
```

The npm trust CLI requires the package to already exist on the registry. If `@lazyingart/aaps` has not been published yet, first publish the initial version interactively with 2FA/OTP, then add the trusted publisher and use the GitHub workflow for subsequent releases.

The workflow runs `npm test`, `npm run project:validate`, `npm pack --dry-run`, then publishes with provenance.

## Release Flow

1. Confirm `package.json` has a new version.
2. Push the release commit and tag or create a GitHub Release.
3. Publish the GitHub Release, or run the `Publish npm package` workflow manually.
4. Confirm the package page shows provenance after npm publish completes.

## Security Notes

Do not commit `.npmrc`, `.env`, or registry tokens. After Trusted Publishing is working, prefer npm's strongest publishing-access setting that allows trusted publishers and rejects long-lived publish tokens.
