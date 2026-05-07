---
layout: home

hero:
  name: agent-team
  text: Six AI agents that ship Expo apps together
  tagline: A PM, a critic, a designer, a developer, a reviewer, and a QA — coordinated by a manager — collaborating on a shared task board you can watch live.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: How it works
      link: /how-it-works
    - theme: alt
      text: GitHub
      link: https://github.com/brsoyan/agent-team

features:
  - title: No Anthropic API key needed
    details: Each agent runs as a separate Claude Code CLI session. Log in once with `claude login` and every agent reuses your subscription. No `.env`, no per-token bill (if you have Pro / Max).
  - title: Real Expo output
    details: The Developer scaffolds an actual Expo app, the Quality Gate runs `tsc` against it, and the QA agent writes E2E tests. You can `run:ios` it on a real iPhone from the board.
  - title: Watch it on a board
    details: A React + Vite frontend at localhost:7788 shows pipeline state, live agent activity, file diffs, bug reports, and per-task comments — without ever leaving the browser.
  - title: Add your own agents
    details: The whole pipeline is one TypeScript array. Insert a security auditor between reviewer and QA in three steps; the orchestrator, prompts, and UI all derive from that array.
  - title: Quality gate, not just chatter
    details: Between Developer and Reviewer sits a non-LLM gate that runs `tsc` and unit tests. Failed builds bounce back to the Developer with the failing output — the Reviewer never wastes a turn on broken code.
  - title: Localhost-only by default
    details: The API binds to 127.0.0.1. Agents are sandboxed to a workspace/ directory. The repo ships with explicit warnings about what running with `--dangerously-skip-permissions` means on your machine.
---

## What is this?

A multi-agent system that takes a one-paragraph product brief and turns it into a working Expo app — a spec, a design, code, code review, and QA tests — by spawning six specialized Claude Code sessions and routing tasks between them through a shared board.

It's a small, opinionated codebase (under ~5k lines of TypeScript) that you can read in an afternoon and modify the same day. The pipeline lives in [one file](https://github.com/brsoyan/agent-team/blob/main/src/agents/pipeline.ts).

## Who is this for?

- **Builders curious about multi-agent patterns** — this is a working reference, not a paper.
- **Indie devs** who want to throw a PRD at a machine and see something compile.
- **Claude Code power users** who want to see how to compose multiple sessions through file system + shared state.

## Who is this *not* for?

- Anyone expecting a no-code app builder. You will read code, run `xcodebuild`, fight signing certificates.
- Anyone wanting agents to ship to production unsupervised. The agents run with `--dangerously-skip-permissions`. **Don't point them at a machine with secrets you can't afford to leak.** See [security in the FAQ](/faq#security).
- Apps with complex backends. The Expo template here assumes mostly client-side logic + an optional subscription SDK.
