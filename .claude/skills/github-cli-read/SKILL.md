---
name: github-cli-read
description: Read-only GitHub CLI workflows for inspecting issues, pull requests, labels, milestones, projects, and repository state.
origin: local-project
---

# GitHub CLI Read

Use `gh` for read-only actions when you need to inspect GitHub state without changing anything.

## Use For

- Checking repository status and authentication
- Listing issues, pull requests, labels, and milestones
- Viewing issue or PR details
- Inspecting projects and repository metadata

## Common Commands

```bash
gh auth status
gh repo view
gh issue list --limit 30
gh issue view <issue-number>
gh pr list
gh pr view <pr-number>
gh label list
gh project list
```

## Rules

- Prefer read-only commands unless the user explicitly asks to change GitHub state.
- Review the current repo context before using `gh` commands that assume a repository.
- Use [doc/GITHUB_ISSUES_GUIDE.md](../../../doc/GITHUB_ISSUES_GUIDE.md) for the project’s issue-management workflow.