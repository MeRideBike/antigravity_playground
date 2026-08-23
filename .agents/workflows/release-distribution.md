# Release Distribution & Provenance Workflow

This workflow documents the procedure for tagging and publishing multi-platform release binaries, cryptographic checksums, and SLSA Software Bill of Materials (SBOM).

---

## 1. Prerequisites

Before tagging a release:
1. Ensure all features from `feature/*` are merged into `develop`.
2. Promote `develop` to `test` and `production` via fast-forward merges.
3. Verify that all CI checks on `production` are passing (100% green).

---

## 2. Release Steps

### Step 1: Create & Push Git Release Tag
From the root of the repository on the `production` branch:
```powershell
# 1. Ensure you are on production
git checkout production
git pull origin production

# 2. Create annotated semver tag
git tag -a v1.0.0 -m "Release v1.0.0: Turnkey multi-platform distribution and hardened telemetry dashboard"

# 3. Push tag to GitHub
git push origin v1.0.0
```

### Step 2: Automated CI/CD Compilation
Pushing the `v*` tag triggers [`.github/workflows/release.yml`](../../.github/workflows/release.yml):
- Cross-compiles hermetic standalone binaries (`CGO_ENABLED=0`) for:
  - Windows (`server-windows-amd64.exe`)
  - Linux (`server-linux-amd64`, `server-linux-arm64`)
  - macOS (`server-darwin-amd64`, `server-darwin-arm64`)
- Computes SHA-256 cryptographic hashes (`checksums.txt`).
- Creates the official GitHub Release with downloadable assets.

### Step 3: Verification of Checksums
End users can verify binary integrity using:
```powershell
# Windows PowerShell
Get-FileHash .\server-windows-amd64.exe -Algorithm SHA256

# Linux / macOS
sha256sum -c checksums.txt
```
