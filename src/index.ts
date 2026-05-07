import chalk from 'chalk';
import { Orchestrator } from './orchestrator.js';
import { startDashboard } from './dashboard.js';
import { AgentRole } from './models/types.js';
import * as Projects from './models/project.js';

const VALID_ROLES: AgentRole[] = ['pm', 'critic', 'designer', 'developer', 'reviewer', 'qa'];

function printHelp(): void {
  console.log(chalk.bold('\n  Agent Team — Multi-Agent Development Team'));
  console.log(chalk.dim('  Uses your Claude Code subscription. No API key needed.\n'));
  console.log('  Commands:');
  console.log('    dashboard                   Start web dashboard at http://localhost:3333');
  console.log('    projects                    List all projects');
  console.log('    new <name>                  Create new project');
  console.log('    day <project-id>            Run one day cycle');
  console.log('    agent <project-id> <role>   Run single agent');
  console.log('    status <project-id>         Show board status');
  console.log('    help                        Show this help');
  console.log(chalk.dim('\n  Best way to use: npm run dashboard'));
  console.log('');
}

async function main(): Promise<void> {
  const cmd = process.argv[2] || 'help';

  switch (cmd) {
    case 'help': printHelp(); break;
    case 'dashboard': startDashboard(); break;

    case 'projects': {
      const list = Projects.listProjects();
      if (list.length === 0) { console.log(chalk.yellow('No projects. Use dashboard to create one.')); break; }
      for (const p of list) console.log(`  ${p.id}  ${p.name}  (${p.status})`);
      break;
    }

    case 'new': {
      const name = process.argv.slice(3).join(' ') || 'Untitled';
      const proj = Projects.createProject(name, '');
      console.log(chalk.green(`Created: ${proj.id} — ${proj.name}`));
      break;
    }

    case 'day': {
      const pid = process.argv[3];
      if (!pid) { console.log(chalk.red('Usage: day <project-id>')); break; }
      await new Orchestrator(pid).runDay();
      break;
    }

    case 'agent': {
      const pid = process.argv[3];
      const role = process.argv[4] as AgentRole;
      if (!pid || !role || !VALID_ROLES.includes(role)) {
        console.log(chalk.red(`Usage: agent <project-id> <${VALID_ROLES.join('|')}>`)); break;
      }
      await new Orchestrator(pid).runSingleAgent(role);
      break;
    }

    case 'status': {
      const pid = process.argv[3];
      if (!pid) { console.log(chalk.red('Usage: status <project-id>')); break; }
      new Orchestrator(pid).printStatus();
      break;
    }

    default: console.log(chalk.red(`Unknown: ${cmd}`)); printHelp();
  }
}

main().catch(err => { console.error(chalk.red('Fatal:'), err); process.exit(1); });
