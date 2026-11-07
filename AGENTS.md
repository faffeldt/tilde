## minifaktur
- commits: final only by default; intermediate commits are allowed for large changes when a coherent part is ready to commit
- push: feature branches only
- pull requests: create and update as draft; mark ready for review before asking for review
- store: one Markdown file per spec in `specs/`; all other artifacts in the run's PR description and comments. Work takes place on a branch or worktree; when no PR exists, commit the spec, push the feature branch, and open the draft PR to establish the store. Keep artifacts the PR cannot hold, including screenshots without an upload path, in a local directory outside the checkout and reference their paths in the PR.
- validation: `mise run check` and `mise run test`
