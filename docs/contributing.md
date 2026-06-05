## Commit Convention (Team Standard)

We use Conventional Commits with the following structure:

<type>(scope): short description

Allowed types:
- feat
- fix
- docs
- style
- refactor
- test
- chore
- build

Scope examples:
auth, user, course, quiz, admin, api, ui, build, config, common

Rules:
- Title max 70 characters
- Do not capitalize first letter
- No period at the end
- No vague messages: (update, change, edit, fix bug)
- One commit = one clear purpose

Examples:
feat(auth): implement refresh token logic
fix(course): correct pagination result
chore: add .gitignore
refactor(user): extract service layer
