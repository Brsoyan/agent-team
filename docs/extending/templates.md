# Project templates

::: warning Wanted feature, not yet built
This is a documented contribution lane with no plumbing yet. The intent is to let users pick from a curated set of starter PRDs ("habit tracker", "RSS reader", "fitness companion") when creating a new project, and have the team scaffold from a known-good blueprint instead of a blank page.

If you want to champion this, [open an issue](https://github.com/brsoyan/agent-team/issues/new/choose) so the design can be agreed before code lands.
:::

## What this would solve

Today, creating a project requires the user to either:

- Paste a PRD (anything from one paragraph to several pages), or
- Leave it blank and let the PM make something up.

Both work, but the first asks for effort and the second is hit-or-miss. Templates split the difference: pick a known-good app archetype, optionally customize a few fields, and the PM starts from a solid spec.

## Sketched design

A template is a folder under `templates/` at the repo root:

```
templates/
├── habit-tracker/
│   ├── manifest.json     Title, description, params, default values
│   ├── prd.md            The PRD the PM starts with (Mustache-style {{params}})
│   ├── designs.md        Optional: starter design notes the Designer can build on
│   └── icon.svg          Shown in the picker
├── rss-reader/
│   └── ...
└── fitness-companion/
    └── ...
```

`manifest.json` shape (proposal):

```json
{
  "id": "habit-tracker",
  "title": "Habit tracker",
  "description": "Daily habits, streaks, simple charts.",
  "params": [
    { "key": "appName", "label": "App name", "default": "Streak", "required": true },
    { "key": "habitGoalType", "label": "Goal type", "options": ["count", "boolean", "duration"], "default": "boolean" },
    { "key": "primaryColor", "label": "Primary color", "type": "color", "default": "#FF6F61" }
  ]
}
```

When the user picks a template:

1. Board collects the param values via a small form.
2. `prd.md` and any other `.md` files are interpolated.
3. The interpolated PRD is written into the project as the PM's starting point.
4. From there, the pipeline runs as normal.

## Why templates aren't the same as knowledge packs

[Knowledge packs](/extending/knowledge-packs) are global — every agent sees them on every project. Templates are per-project — you pick one when you create a project, and only that project's PRD is shaped by it.

Knowledge packs are *style* ("how we write apps here"). Templates are *structure* ("the kind of app we're writing today").

## What's needed to ship this

- [ ] Read templates from `templates/` at startup; expose them through the API.
- [ ] Add a "From template" picker on the **New Project** page in the board.
- [ ] Param-form rendering for `manifest.json`. Validate required fields client-side.
- [ ] Write the interpolated PRD into `data/projects/<id>/instructions.md` (or wherever the PM reads its starting input from today).
- [ ] Three or four starter templates so the picker has content on day one.

None of this is hard, but the manifest format and the rendering should be discussed before someone writes the form code. **Open an issue** if you want to take this on.

## What's next

- [New agents](/extending/agents) — the most-used extension lane today
- [Knowledge packs](/extending/knowledge-packs) — the global-style cousin of templates
