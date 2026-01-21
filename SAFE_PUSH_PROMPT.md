# Git Safe Push Protocol

**User Instruction:**
Before asking the AI to `git push` or finalize a commit, copy and paste the following prompt to ensure a safety check is performed.

---
**COPY BELOW THIS LINE**
---

## 🛡️ Git Safety Check Protocol

I am about to push changes to the remote repository. Before executing any `git push` command, you **MUST** perform the following safety verification steps:

1.  **Check Staged/Committed Files**:
    Run the following command to see exactly what is about to be pushed (checking the last commit and any staged changes):
    ```bash
    git show --name-only HEAD
    git diff --cached --name-only
    ```

2.  **Scan for Sensitive Files**:
    Verify that NONE of the following files appear in the output:
    - `.env` files (e.g., `.env`, `.env.local`, `.env.production`)
    - `*.json` files containing keys (e.g., `service-account.json`, `credentials.json`)
    - Temporary result files (e.g., `mcd_result.json`)
    - `node_modules`

3.  **Verify Git Ignore**:
    If you are unsure about a file, run:
    ```bash
    git check-ignore -v <filename>
    ```

4.  **Execution**:
    - **IF AND ONLY IF** the check passes and no sensitive files are detected, you may proceed to run `git push`.
    - **IF** sensitive files are found, **STOP IMMEDIATELY**. Do not push. instead, remove the file from the index (`git rm --cached <file>`), amend the commit if necessary, and report the issue to me.

**Current Task**: Please execute the safety check now and then push if safe.
