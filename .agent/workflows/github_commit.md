---
description: How to commit and push changes to GitHub
---

1. Check the current status of your files to see what has changed.
   ```bash
   git status
   ```

2. Add the files you want to commit. To add all changes, use:
   ```bash
   git add .
   ```
   Or add specific files:
   ```bash
   git add path/to/file
   ```

3. Commit the changes with a descriptive message.
   ```bash
   git commit -m "Your commit message here"
   ```

4. Push the changes to the remote repository (GitHub).
   ```bash
   git push
   ```

# Troubleshooting
- If `git push` fails due to conflicts, run `git pull` first to merge remote changes.
- If you haven't set up the remote yet, use: `git remote add origin <url>`
