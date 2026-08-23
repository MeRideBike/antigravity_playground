# Rule: Documentation Synchronization

**Status**: Always On  
**Scope**: All functional or configuration changes

---

## Documentation Sync Requirements

1. **Continuous Synchronization**:
   - Whenever a new feature, route, CLI flag, or architectural change is introduced, update both `README.md` and relevant files in `docs/`.
   - Update file trees, command-line usage examples, and test instructions if filenames or parameters change.

2. **No Orphaned Documentation**:
   - Outdated flags, obsolete endpoints, or removed components must be purged immediately from documentation during the same task.
   - Run the [`.agents/workflows/documentation-maintenance.md`](file:///c:/Users/ethan/OneDrive/Desktop/antigravity_playground/.agents/workflows/documentation-maintenance.md) workflow when completing non-trivial modifications.
