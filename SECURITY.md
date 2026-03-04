# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in TEKIR, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email **security@tangelo.dev** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix or mitigation**: Depends on severity, but we aim for 30 days for critical issues

## Scope

This policy covers:

- The TEKIR specification (`spec/`)
- The `tekir` npm package (`src/`)
- The JSON Schema (`schema/`)
- Security considerations in the spec itself (prompt injection, credential exfiltration, etc.)

## Spec-Level Security

TEKIR has specific security considerations documented in the spec. If you find
a security gap in the specification itself (e.g., a way that TEKIR fields could
be exploited for prompt injection or confused deputy attacks), please report it
using the same process above.

## Credit

We will credit reporters in our security advisories unless they prefer to
remain anonymous.
