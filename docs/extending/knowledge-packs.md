# Knowledge packs

A **knowledge pack** is a markdown file under `data/global-knowledge/` that gets concatenated into every agent's system prompt. It's how you tell the whole team "use Expo Router, not React Navigation v5" or "the app's design system is built around these tokens" — without editing seven prompt files.

## What's there today

```
data/global-knowledge/
├── design-system.md     Palette tokens, component conventions, do/don't
├── sdk.md               How to use @agent-team/subscription-sdk in generated apps
└── tech-stack.md        Expo SDK version, navigation lib, state mgmt, testing
```

These three files load on every agent run. The PM uses them when writing specs ("the spec must reference our design tokens"); the Developer uses them when writing code ("import from `@your-org/design-system`, not `react-native-paper`"); the Reviewer uses them when checking diffs.

## Adding a pack

Drop a markdown file. That's it.

```bash
echo "# Analytics conventions

All screen views go through useAnalytics().screen('ScreenName').
Don't call analytics.track() directly from components — use a hook.
Event names are Past Tense:
  ✅ 'CoffeeLogged'
  ❌ 'log_coffee', 'coffee-tracking'
" > data/global-knowledge/analytics.md
```

The file is loaded next time an agent runs. No restart, no config.

## What makes a good pack

| Trait | Why |
|---|---|
| **One topic per file.** | "design-system.md" not "frontend.md". When something changes, a future maintainer can edit one file. |
| **Concrete and prescriptive.** | "Use `useReducer` for forms with >3 fields" beats "consider state management carefully". Agents follow rules better than principles. |
| **Examples in code blocks.** | Agents pattern-match. A 5-line code block of the right shape is worth 200 words of prose. |
| **Negative examples too.** | "Do this, don't do that" with a reason. The "don't" entries are what catch hallucinated patterns. |
| **Short.** | <2KB per file is friendly. Big packs get diluted. If you can't fit it, you have two topics. |

Bad shape:

```md
# Best practices

Try to write clean, readable code. Use TypeScript. Be careful with state.
```

Good shape:

```md
# State management

For forms with >3 fields, use `useReducer`:

  const [state, dispatch] = useReducer(reducer, initialState);

Don't use `useState` per field for forms — it makes derived validation
state diverge.

For server data, use `@tanstack/react-query`. Don't fetch in `useEffect`:

  // ❌ avoid
  useEffect(() => { fetch('/api/x').then(...) }, []);

  // ✅ prefer
  const { data } = useQuery({ queryKey: ['x'], queryFn: () => fetch('/api/x') });

Reason: useEffect-fetch leaks on unmount, doesn't cache, and re-fetches
on every mount.
```

## Per-project knowledge

`data/global-knowledge/` is global — every project sees it. For project-specific notes (e.g. "this app's bundle id is `com.acme.foo`"), use the **Instructions** tab in the board. Those are stored under `data/projects/<id>/` and only inject into that project's agents.

Use the `data/global-knowledge/` files for things that are true across every app you'll generate. Use Instructions for things specific to one project.

## Versioning + ownership

When you contribute a knowledge pack:

1. Open an issue first — packs are opinionated, and we want to make sure two contributors aren't writing contradictory ones.
2. The PR should include the file plus a short justification: who's the audience, what surfaces will it influence (PM specs, Developer code, etc.).
3. After merge, you're the de facto owner. If an agent's output violates the pack, it's a bug; please file or fix.

## Patterns that work

- **Tech stack pack** — version-pinned. "Expo SDK 51, React Native 0.74, Expo Router v3, Zustand for global state, RHF for forms, Reanimated for animations." Cuts down on agent inventing yesterday's API.
- **Design system pack** — token names, primary components, conventions. Big efficiency gain because all 4 builder agents (PM, Designer, Developer, Reviewer) reference the same tokens.
- **API conventions pack** — if generated apps talk to a known backend, the URL patterns, auth header shape, and error response format. Lets agents stop hallucinating endpoints.

## Patterns that don't work

- **Encyclopedic explainers.** Agents already know what a useEffect is. Don't re-teach React.
- **"Best practices" without specifics.** "Write good code" is noise. "Functions over 30 lines must include a test" is signal.
- **Per-task notes.** Those go in the project's Instructions tab. Global packs apply to *every* project.

## What's next

- [New agents](/extending/agents) — when a knowledge pack isn't enough, write an agent that enforces it
- [Project templates](/extending/templates) — wanted feature, not yet built
