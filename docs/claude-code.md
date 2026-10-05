# Building with Claude Code

Claude Code is Claude in your terminal. It reads and edits the project files itself, runs commands, and commits to GitHub, so you don't copy code back and forth. It's included with Claude Pro and uses the same usage limits as the Claude app, so the habits below matter.

Every GitHub issue has a **Claude Code prompt** block. The workflow is: open the issue, copy the block, paste it into Claude Code.

## Install (one time, on your PC)

1. Install **Git for Windows** from git-scm.com (Claude Code uses its Bash shell) and **Node.js LTS** from nodejs.org.
2. Open **PowerShell** (your prompt starts with `PS C:\`) and run:

   ```
   irm https://claude.ai/install.ps1 | iex
   ```

3. Close PowerShell, open a new one, and check it worked:

   ```
   claude --version
   ```

   If it says `claude` isn't recognized, see the [install troubleshooting page](https://code.claude.com/docs/en/troubleshoot-install).
4. Clone the project and start Claude Code inside it:

   ```
   git clone https://github.com/mrwolf710/Neon-Ledger.git
   cd Neon-Ledger
   claude
   ```

5. The first time, a browser window opens. Log in with your Claude Pro account.
6. Type `/model` and choose **Sonnet**. It handles almost every issue here and uses much less of your limit than Opus.

## Working through an issue

1. In PowerShell: `cd Neon-Ledger` then `claude` (or type `/clear` if Claude Code is already open from the last issue).
2. Copy the **Claude Code prompt** block from the issue and paste it in. Press Enter.
3. Claude Code asks permission before editing files or running commands. Read the request and approve it.
4. When it finishes, run `npm run dev` in a **second** PowerShell window and check the game at http://localhost:5173 against the issue's **Done when** list.
5. If something's wrong, tell Claude Code in one sentence ("the rain falls sideways"). Paste the exact console error line if there is one.
6. When every **Done when** box is ticked, close the issue on GitHub.

## Habits that save your usage

| Habit | Why |
| --- | --- |
| `/clear` between issues | Claude Code sends the whole conversation with every message. A fresh start per issue keeps each message small. Clearing costs nothing. |
| Stay on Sonnet (`/model`) | Switch to Opus only when stuck on a hard shader or bug, then switch back. |
| Press **Esc** the moment it goes the wrong way | Stops it before it wastes work. `/rewind` (or Esc twice) restores an earlier point. |
| Use plan mode for the big stages | Press **Shift+Tab** until it says plan mode. Claude proposes an approach first, so you can correct it before it writes code. |
| Describe visual problems in words | Screenshots cost far more than "bloom is too strong on the signs". |
| Tweak numbers yourself | Each file keeps its tunable values in a constants object at the top. Change them in VS Code instead of asking Claude. |
| Check `/usage` before a big issue | Shows how much of your plan limit is left. Start a large issue when you have room to finish it. |
| Hit your limit mid-issue? | Stop. When it resets, open Claude Code, paste the same prompt, and add "Continue from where NOTES.md and git log say you stopped." |

CLAUDE.md in the project root holds the standing rules (no asset files, read NOTES.md first, keep replies short, build and commit at the end). Claude Code reads it automatically, which is why the prompts are short.

Sources: [Claude Code setup](https://code.claude.com/docs/en/setup), [Manage costs effectively](https://code.claude.com/docs/en/costs)
