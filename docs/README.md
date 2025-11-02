# Slight Documentation

This directory contains design documents and guides for the Slight LISP interpreter.

## Quick Links

### Design Documents
- **[DEPENDENCY_INJECTION_DESIGN.md](./DEPENDENCY_INJECTION_DESIGN.md)** - Complete DI refactoring design (✅ Implemented)
  - Architecture overview
  - Implementation details
  - Migration checklist
  - Test strategy

### Developer Guides
- **[DI_PLUGIN_GUIDE.md](./DI_PLUGIN_GUIDE.md)** - How to write DI plugins
  - Custom OutputSinks
  - Custom Platforms
  - Decorator Interpreters
  - Complete TracingInterpreter example
  - Testing patterns
  - Best practices

- **[PROFILING.md](./PROFILING.md)** - Performance profiling guide
  - CPU profiling
  - Memory profiling
  - Chrome DevTools integration
  - Optimization strategies

### Next Session
- **[NEXT_SESSION_PROMPT.md](./NEXT_SESSION_PROMPT.md)** - Ready-to-use prompt for implementing TracingInterpreter
  - Complete specification
  - Step-by-step implementation plan
  - Test requirements
  - Success criteria

## Documentation Status

| Document | Status | Description |
|----------|--------|-------------|
| DEPENDENCY_INJECTION_DESIGN.md | ✅ Implemented | DI system design and implementation |
| DI_PLUGIN_GUIDE.md | ✅ Complete | Plugin development guide with examples |
| NEXT_SESSION_PROMPT.md | 📋 Ready | TracingInterpreter implementation prompt |
| PROFILING.md | ✅ Complete | Performance profiling guide |

## Quick Start

### For Users
Start with the main [README.md](../README.md) and [CLAUDE.md](../CLAUDE.md) in the root directory.

### For Plugin Developers
1. Read [DI_PLUGIN_GUIDE.md](./DI_PLUGIN_GUIDE.md)
2. Look at `tests/integration/dependency-injection.test.ts` for examples
3. See `src/Slight/Dependencies/` for existing implementations

### For Contributors
1. Check [DEPENDENCY_INJECTION_DESIGN.md](./DEPENDENCY_INJECTION_DESIGN.md) to understand the architecture
2. Review [PROFILING.md](./PROFILING.md) for performance considerations
3. Follow patterns in existing code

## Related Files

- **Main Documentation**: `../CLAUDE.md` - Development guide with DI section
- **Design Document**: `./DEPENDENCY_INJECTION_DESIGN.md` - This refactoring
- **Test Examples**: `../tests/integration/dependency-injection.test.ts` - 13 integration tests
- **Plugin Guide**: `./DI_PLUGIN_GUIDE.md` - How to write plugins

## Future Documentation

Planned documentation (not yet written):
- WebAssembly Integration Guide
- Remote Process Runtime Design
- Security Sandboxing Guide
- Browser Extension Development

## Contributing

When adding new documentation:
1. Place design docs in `docs/`
2. Use markdown format
3. Include code examples
4. Add entry to this README
5. Update status table
