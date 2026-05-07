import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'agent-team',
  description: 'Six AI agents that design, build, review, and test Expo apps together.',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: 'localhostLinks',

  // For GitHub Pages at https://<user>.github.io/agent-team/. If you deploy
  // to a custom domain (CNAME) or to Cloudflare Pages, set base to '/'.
  base: '/agent-team/',

  head: [
    ['link', { rel: 'icon', href: '/agent-team/favicon.svg' }],
    ['meta', { property: 'og:title', content: 'agent-team' }],
    ['meta', { property: 'og:description', content: 'Six AI agents that design, build, review, and test Expo apps together.' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Docs', link: '/getting-started' },
      { text: 'Extending', link: '/extending/agents' },
      { text: 'GitHub', link: 'https://github.com/brsoyan/agent-team' },
    ],

    sidebar: [
      {
        text: 'Intro',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting started', link: '/getting-started' },
          { text: 'How it works', link: '/how-it-works' },
        ],
      },
      {
        text: 'Extending',
        items: [
          { text: 'New agents', link: '/extending/agents' },
          { text: 'Quality-gate checks', link: '/extending/gates' },
          { text: 'Knowledge packs', link: '/extending/knowledge-packs' },
          { text: 'Project templates', link: '/extending/templates' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Architecture', link: '/architecture' },
          { text: 'Contributing', link: '/contributing' },
          { text: 'FAQ', link: '/faq' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/brsoyan/agent-team' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/brsoyan/agent-team/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 agent-team contributors',
    },
  },
});
