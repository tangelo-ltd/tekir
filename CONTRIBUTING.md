# Contributing to TEKIR

Thank you for your interest in contributing to TEKIR (Transparent Endpoint Knowledge for Intelligent Reasoning)! This guide will help you get started.

## Reporting Bugs

- Use [GitHub Issues](https://github.com/tangelo-ltd/tekir/issues) to report bugs.
- Search existing issues first to avoid duplicates.
- Include a clear title and description.
- Provide steps to reproduce the issue.
- Include the TEKIR version and your environment details.

## Suggesting Features

- Open a [GitHub Issue](https://github.com/tangelo-ltd/tekir/issues) with the `[Feature]` prefix in the title.
- Describe the use case and why it would be valuable.
- Be open to discussion - the community may have alternative ideas.

## Spec Contributions

TEKIR is a specification-first project. If you want to propose changes to the spec:

1. **Open an issue first.** Use the `[Proposal]` prefix in the title.
2. Describe the motivation, the proposed change, and any alternatives considered.
3. Wait for community feedback before writing a PR.
4. Spec changes require a review period before merging (see [GOVERNANCE.md](GOVERNANCE.md)).

Small clarifications and typo fixes can go directly to a PR without a proposal.

## Submitting Pull Requests

1. Fork the repository and create a branch from `main`.
2. Make your changes in the branch.
3. Write or update tests as needed.
4. Ensure all tests pass (`npm test`).
5. Ensure the project builds (`npm run build`).
6. Run the linter and fix any issues.
7. Submit your PR with a clear description of the changes.

### PR Guidelines

- Keep PRs focused - one change per PR.
- Reference any related issues in the PR description.
- Update documentation if your change affects it.
- Be responsive to review feedback.

## Code Style

- **TypeScript** with strict mode enabled.
- **ESM** modules (no CommonJS).
- **No classes** - use pure functions and plain objects.
- Keep code simple and readable.
- Follow existing patterns in the codebase.

## Development Setup

```bash
git clone https://github.com/tangelo-ltd/tekir.git
cd tekir
npm install
npm run build
npm test
```

### Project Structure

- `src/` - TypeScript source code
- `spec/` - TEKIR specification documents
- `schema/` - JSON schemas
- `examples/` - Usage examples

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## License

By contributing to TEKIR, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

TEKIR is maintained by [Tangelo Bilisim Ltd.](https://tangelo.com.tr) We appreciate every contribution, big or small!
