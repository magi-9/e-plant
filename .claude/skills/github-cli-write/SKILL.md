---
name: github-cli-write
description: Write workflows with GitHub CLI for creating and editing issues, pull requests, labels, milestones, and project metadata.
origin: local-project
---

# GitHub CLI Write

Use `gh` when you need to change GitHub state from the terminal.

## Use For

- Creating and editing issues
- Creating pull requests and updating their metadata
- Adding assignees, labels, milestones, and project links
- Commenting on issues or PRs

## Common Commands

```bash
gh issue create --title "..." --body "..."
gh issue edit <issue-number> --add-label "backend"
gh issue edit <issue-number> --add-assignee @me
gh issue edit <issue-number> --milestone "Phase 1: Critical Refactoring"
gh pr create --title "..." --body "..."
gh pr edit <pr-number> --add-label "documentation"
gh pr comment <pr-number> --body "..."
```

## Rules

- Confirm the target repository and branch before creating or editing anything.
- Preview the command and body text before running a destructive or permanent action.
- Use [doc/GITHUB_ISSUES_GUIDE.md](../../../doc/GITHUB_ISSUES_GUIDE.md) as the project reference for issue creation and management.