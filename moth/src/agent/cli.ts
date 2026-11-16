#!/usr/bin/env node
/**
 * Moth CLI
 * 
 * Command-line interface for the Moth design agent.
 */

import { Command } from 'commander';
import { createMothAgent, MothConfig, BrandContext } from './index';
import { createVisualLearner, VisionProvider } from './learn';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// ASCII Art Banner
// ============================================================================

const BANNER = chalk.hex('#E8DCC4')(`
     .  .                           
    .\\||/.      ·  ·                
   (\\ __ /)    .\\||/.              
    .'  '.    (\\ __ /)              
   /  ()  \\    .'  '.               
  |   /\\   |  /  ()  \\    M O T H  
   \\_|  |_/  |   /\\   |             
    // || \\\\  \\_|  |_/              
   //  ||  \\\\  // || \\\\             
`);

const TAGLINE = chalk.gray('  Generative Brand Identity Agent\n');

// ============================================================================
// Configuration
// ============================================================================

interface CLIConfig {
  openaiApiKey: string;
  figmaAccessToken: string;
  figmaFileKey: string;
  brandConfig: BrandContext;
}

function loadConfig(): CLIConfig | null {
  // Try loading from moth.config.json
  const configPath = join(process.cwd(), 'moth.config.json');
  
  if (!existsSync(configPath)) {
    console.log(chalk.yellow('No moth.config.json found. Run `moth init` first.'));
    return null;
  }

  const configFile = JSON.parse(readFileSync(configPath, 'utf-8'));

  // Get API keys from environment or config
  const openaiApiKey = process.env.OPENAI_API_KEY ?? '';
  const figmaAccessToken = process.env.FIGMA_ACCESS_TOKEN ?? configFile.figma?.accessToken ?? '';
  const figmaFileKey = configFile.figma?.fileKey ?? '';

  if (!openaiApiKey) {
    console.log(chalk.red('OPENAI_API_KEY not set. Add it to your .env file.'));
    return null;
  }

  if (!figmaAccessToken) {
    console.log(chalk.red('FIGMA_ACCESS_TOKEN not set. Add it to your .env file.'));
    return null;
  }

  return {
    openaiApiKey,
    figmaAccessToken,
    figmaFileKey,
    brandConfig: configFile.brand,
  };
}

function createAgentFromConfig(config: CLIConfig) {
  const mothConfig: MothConfig = {
    openai: {
      apiKey: config.openaiApiKey,
      model: 'gpt-4-turbo-preview',
    },
    figma: {
      accessToken: config.figmaAccessToken,
      fileKey: config.figmaFileKey,
    },
    brand: config.brandConfig,
  };

  return createMothAgent(mothConfig);
}

// ============================================================================
// Commands
// ============================================================================

const program = new Command();

program
  .name('moth')
  .description('Moth - Generative Brand Identity Agent')
  .version('1.0.0');

// --------------------------------------------------------------------------
// Init Command
// --------------------------------------------------------------------------

program
  .command('init')
  .description('Initialize Moth with a new brand configuration')
  .option('--brand <name>', 'Brand name')
  .action(async (options) => {
    console.log(BANNER);
    console.log(TAGLINE);
    console.log(chalk.bold('Initialize Moth\n'));

    // Interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'brandName',
        message: 'Brand name:',
        default: options.brand ?? 'My Brand',
      },
      {
        type: 'input',
        name: 'figmaFileKey',
        message: 'Figma file key (from URL):',
        validate: (input: string) => input.length > 0 || 'File key is required',
      },
      {
        type: 'input',
        name: 'keywords',
        message: 'Brand keywords (comma-separated):',
        default: 'innovative, trustworthy, modern',
      },
    ]);

    // Personality axis sliders
    console.log(chalk.bold('\nBrand Personality (0.0 - 1.0):\n'));

    const personality = await inquirer.prompt([
      {
        type: 'number',
        name: 'formal_playful',
        message: 'Formal (0) ↔ Playful (1):',
        default: 0.5,
      },
      {
        type: 'number',
        name: 'traditional_modern',
        message: 'Traditional (0) ↔ Modern (1):',
        default: 0.5,
      },
      {
        type: 'number',
        name: 'serious_friendly',
        message: 'Serious (0) ↔ Friendly (1):',
        default: 0.5,
      },
      {
        type: 'number',
        name: 'luxury_accessible',
        message: 'Luxury (0) ↔ Accessible (1):',
        default: 0.5,
      },
      {
        type: 'number',
        name: 'corporate_rebellious',
        message: 'Corporate (0) ↔ Rebellious (1):',
        default: 0.5,
      },
    ]);

    // Create config
    const config = {
      version: '1.0.0',
      brand: {
        name: answers.brandName,
        personality: {
          axes: personality,
          keywords: answers.keywords.split(',').map((k: string) => k.trim()),
        },
      },
      figma: {
        fileKey: answers.figmaFileKey,
        accessToken: '${FIGMA_ACCESS_TOKEN}',
      },
      agent: {
        creativity: 0.7,
        adherence: 0.9,
        variationCount: {
          ideation: 6,
          refinement: 3,
        },
      },
    };

    // Write config
    const configPath = join(process.cwd(), 'moth.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Create .env template if it doesn't exist
    const envPath = join(process.cwd(), '.env');
    if (!existsSync(envPath)) {
      writeFileSync(envPath, `OPENAI_API_KEY=your-openai-key-here
FIGMA_ACCESS_TOKEN=your-figma-token-here
`);
      console.log(chalk.yellow('\n⚠️  Created .env file - please add your API keys.\n'));
    }

    console.log(chalk.green('\n✓ Moth initialized successfully!'));
    console.log(chalk.gray(`  Config saved to: ${configPath}\n`));
  });

// --------------------------------------------------------------------------
// Ideate Command
// --------------------------------------------------------------------------

program
  .command('ideate')
  .description('Generate design concepts for a brief')
  .option('-b, --brief <text>', 'Design brief')
  .option('-c, --count <number>', 'Number of variations', '6')
  .action(async (options) => {
    console.log(BANNER);
    console.log(TAGLINE);

    const config = loadConfig();
    if (!config) return;

    let brief = options.brief;

    if (!brief) {
      const answers = await inquirer.prompt([
        {
          type: 'editor',
          name: 'brief',
          message: 'Enter your design brief:',
        },
      ]);
      brief = answers.brief;
    }

    const spinner = ora('Generating concepts...').start();

    try {
      const agent = createAgentFromConfig(config);
      const result = await agent.ideate({
        brief,
        variationCount: parseInt(options.count),
      });

      spinner.succeed('Concepts generated!');

      console.log(chalk.bold('\n📐 Generated Concepts:\n'));

      for (const concept of result.concepts) {
        console.log(chalk.cyan(`  • ${concept.name}`));
        console.log(chalk.gray(`    ${concept.description}\n`));
      }

      if (result.recommendation) {
        console.log(chalk.bold('💡 Recommendation:'));
        console.log(chalk.white(`  ${result.recommendation}\n`));
      }

      if (result.questions.length > 0) {
        console.log(chalk.bold('❓ Questions for Discussion:'));
        for (const question of result.questions) {
          console.log(chalk.yellow(`  • ${question}`));
        }
      }
    } catch (error) {
      spinner.fail('Failed to generate concepts');
      console.error(chalk.red(String(error)));
    }
  });

// --------------------------------------------------------------------------
// Execute Command
// --------------------------------------------------------------------------

program
  .command('execute')
  .description('Execute a design concept into Figma')
  .option('-c, --concept <name>', 'Concept name to execute')
  .action(async (options) => {
    console.log(BANNER);
    console.log(TAGLINE);

    const config = loadConfig();
    if (!config) return;

    const spinner = ora('Preparing execution...').start();

    try {
      const agent = createAgentFromConfig(config);

      // For now, create a simple concept from the name
      const concept = {
        name: options.concept ?? 'Default Concept',
        description: 'Auto-generated from CLI',
        position: {},
        decisions: {
          typography: {},
          color: {},
          layout: '',
          spacing: {},
        },
        tokens: [],
        mood: [],
        rationale: '',
      };

      const result = await agent.execute({
        concept,
        target: 'section',
        responsive: true,
      });

      if (result.success) {
        spinner.succeed('Execution complete!');
        console.log(chalk.green(`\n✓ ${result.message}\n`));
      } else {
        spinner.fail('Execution failed');
        console.log(chalk.red(`\n✗ ${result.message}\n`));
      }
    } catch (error) {
      spinner.fail('Failed to execute');
      console.error(chalk.red(String(error)));
    }
  });

// --------------------------------------------------------------------------
// Critique Command
// --------------------------------------------------------------------------

program
  .command('critique')
  .description('Critique a Figma frame')
  .option('-f, --frame <id>', 'Figma frame ID')
  .option('--url <url>', 'Figma frame URL')
  .action(async (options) => {
    console.log(BANNER);
    console.log(TAGLINE);

    const config = loadConfig();
    if (!config) return;

    // Extract frame ID from URL if provided
    let frameId = options.frame;
    if (options.url) {
      const match = options.url.match(/node-id=([^&]+)/);
      if (match) {
        frameId = decodeURIComponent(match[1]);
      }
    }

    if (!frameId) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'frameId',
          message: 'Enter Figma frame ID (or paste URL):',
        },
      ]);

      // Check if URL was pasted
      if (answers.frameId.includes('figma.com')) {
        const match = answers.frameId.match(/node-id=([^&]+)/);
        frameId = match ? decodeURIComponent(match[1]) : answers.frameId;
      } else {
        frameId = answers.frameId;
      }
    }

    const spinner = ora('Analyzing frame...').start();

    try {
      const agent = createAgentFromConfig(config);
      const result = await agent.critique({ frameId });

      spinner.succeed('Critique complete!');

      console.log(chalk.bold('\n📋 Summary:'));
      console.log(chalk.white(`  ${result.summary}\n`));

      if (result.strengths.length > 0) {
        console.log(chalk.bold('✅ Strengths:'));
        for (const strength of result.strengths) {
          console.log(chalk.green(`  • ${strength}`));
        }
        console.log();
      }

      if (result.issues.length > 0) {
        console.log(chalk.bold('⚠️  Issues:'));
        for (const issue of result.issues) {
          const color = issue.severity === 'critical' ? chalk.red :
                       issue.severity === 'high' ? chalk.yellow :
                       chalk.gray;
          console.log(color(`  [${issue.severity.toUpperCase()}] ${issue.title}`));
          console.log(chalk.gray(`    ${issue.problem}`));
        }
        console.log();
      }

      if (result.recommendations.length > 0) {
        console.log(chalk.bold('💡 Recommendations:'));
        for (let i = 0; i < result.recommendations.length; i++) {
          console.log(chalk.cyan(`  ${i + 1}. ${result.recommendations[i]}`));
        }
      }
    } catch (error) {
      spinner.fail('Failed to critique');
      console.error(chalk.red(String(error)));
    }
  });

// --------------------------------------------------------------------------
// Sync Command
// --------------------------------------------------------------------------

program
  .command('sync')
  .description('Sync design tokens to Figma variables')
  .option('-t, --tokens <path>', 'Path to tokens file', './src/tokens/primitives.json')
  .action(async (options) => {
    console.log(BANNER);
    console.log(TAGLINE);

    const config = loadConfig();
    if (!config) return;

    const tokenPath = join(process.cwd(), options.tokens);

    if (!existsSync(tokenPath)) {
      console.log(chalk.red(`Token file not found: ${tokenPath}`));
      return;
    }

    const spinner = ora('Syncing tokens to Figma...').start();

    try {
      const agent = createAgentFromConfig(config);
      const result = await agent.syncTokens(tokenPath);

      spinner.succeed('Sync complete!');

      console.log(chalk.bold('\n📦 Sync Results:'));
      console.log(chalk.green(`  ✓ Created: ${result.created}`));
      console.log(chalk.yellow(`  ↻ Updated: ${result.updated}`));
      console.log(chalk.gray(`  = Unchanged: ${result.unchanged}`));
      console.log();
    } catch (error) {
      spinner.fail('Failed to sync');
      console.error(chalk.red(String(error)));
    }
  });

// --------------------------------------------------------------------------
// Status Command
// --------------------------------------------------------------------------

program
  .command('status')
  .description('Show current Moth configuration and file status')
  .action(async () => {
    console.log(BANNER);
    console.log(TAGLINE);

    const config = loadConfig();
    if (!config) return;

    console.log(chalk.bold('📋 Configuration:\n'));
    console.log(chalk.gray('  Brand:'), chalk.white(config.brandConfig.name));
    console.log(chalk.gray('  Figma File:'), chalk.white(config.figmaFileKey || 'Not set'));
    console.log(chalk.gray('  Keywords:'), chalk.white(config.brandConfig.personality.keywords.join(', ')));
    console.log();

    console.log(chalk.bold('🎨 Personality Axes:\n'));
    const axes = config.brandConfig.personality.axes;
    const axisLabels: Record<string, [string, string]> = {
      formal_playful: ['Formal', 'Playful'],
      traditional_modern: ['Traditional', 'Modern'],
      serious_friendly: ['Serious', 'Friendly'],
      luxury_accessible: ['Luxury', 'Accessible'],
      corporate_rebellious: ['Corporate', 'Rebellious'],
    };

    for (const [key, value] of Object.entries(axes)) {
      const [left, right] = axisLabels[key] ?? [key, key];
      const position = Math.round((value as number) * 10);
      const bar = '█'.repeat(position) + '░'.repeat(10 - position);
      console.log(chalk.gray(`  ${left.padEnd(12)} ${bar} ${right}`));
    }
    console.log();

    // Try to get file info
    if (config.figmaFileKey && config.figmaAccessToken) {
      const spinner = ora('Fetching Figma file info...').start();
      try {
        const agent = createAgentFromConfig(config);
        const fileInfo = await agent.getFileStructure();
        spinner.succeed('Connected to Figma');
        console.log(chalk.bold('\n📁 Figma File:\n'));
        console.log(chalk.gray('  Name:'), chalk.white((fileInfo as any).name));
        console.log(chalk.gray('  Last Modified:'), chalk.white((fileInfo as any).lastModified));
        console.log(chalk.gray('  Pages:'), chalk.white((fileInfo as any).pages?.length ?? 0));
      } catch {
        spinner.fail('Could not connect to Figma');
      }
    }
  });

// --------------------------------------------------------------------------
// Learn Command
// --------------------------------------------------------------------------

program
  .command('learn')
  .description('Learn design style from reference images')
  .option('-d, --directory <path>', 'Directory containing reference images')
  .option('-i, --images <paths...>', 'Individual image paths')
  .option('-n, --name <name>', 'Name for this style')
  .option('-m, --model <provider>', 'Vision model: claude (recommended), openai, gemini', 'claude')
  .option('--apply', 'Apply learned style to moth.config.json')
  .action(async (options) => {
    console.log(BANNER);
    console.log(TAGLINE);
    console.log(chalk.bold('🦋 Visual Learning Mode\n'));

    // Determine which API key to use based on model
    const provider = (options.model as VisionProvider) || 'claude';
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (provider === 'claude' && !anthropicKey) {
      console.log(chalk.red('ANTHROPIC_API_KEY not set. Add it to your .env file.'));
      console.log(chalk.gray('Or use --model=openai to use GPT-4o instead.'));
      return;
    }

    if (provider === 'openai' && !openaiKey) {
      console.log(chalk.red('OPENAI_API_KEY not set. Add it to your .env file.'));
      return;
    }

    console.log(chalk.gray(`Using ${provider === 'claude' ? 'Claude 3.5 Sonnet' : 'GPT-4o'} for analysis\n`));

    // Collect image paths
    let imagePaths: string[] = [];

    if (options.directory) {
      const dir = join(process.cwd(), options.directory);
      if (!existsSync(dir)) {
        console.log(chalk.red(`Directory not found: ${dir}`));
        return;
      }
      
      const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      imagePaths = readdirSync(dir)
        .filter(f => validExts.includes(extname(f).toLowerCase()))
        .map(f => join(dir, f));
    }

    if (options.images) {
      imagePaths.push(...options.images.map((p: string) => join(process.cwd(), p)));
    }

    if (imagePaths.length === 0) {
      // Interactive mode
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'directory',
          message: 'Path to folder with reference images:',
          validate: (input: string) => {
            const dir = join(process.cwd(), input);
            return existsSync(dir) || 'Directory not found';
          },
        },
      ]);

      const dir = join(process.cwd(), answers.directory);
      const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      imagePaths = readdirSync(dir)
        .filter(f => validExts.includes(extname(f).toLowerCase()))
        .map(f => join(dir, f));
    }

    if (imagePaths.length === 0) {
      console.log(chalk.yellow('No images found.'));
      return;
    }

    console.log(chalk.gray(`Found ${imagePaths.length} images to analyze\n`));

    // Get style name
    let styleName = options.name;
    if (!styleName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Name this style:',
          default: 'my-style',
        },
      ]);
      styleName = answers.name;
    }

    const spinner = ora('Analyzing images with vision AI...').start();

    try {
      const learner = createVisualLearner(
        {
          provider,
          openaiKey: openaiKey ?? undefined,
          anthropicKey: anthropicKey ?? undefined,
        },
        join(process.cwd(), 'learned-styles')
      );

      const style = await learner.learnFromImages(imagePaths, styleName);

      spinner.succeed('Learning complete!');

      // Display results
      console.log(chalk.bold('\n📚 Learned Style: ') + chalk.cyan(style.name));
      console.log(chalk.gray(`   From ${style.sourceImages.length} reference images\n`));

      console.log(chalk.bold('Summary:'));
      console.log(chalk.white(`   ${style.synthesis.summary}\n`));

      console.log(chalk.bold('Typography:'));
      console.log(chalk.gray(`   Display: ${style.synthesis.typography.displayFont}`));
      console.log(chalk.gray(`   Body: ${style.synthesis.typography.bodyFont}\n`));

      console.log(chalk.bold('Color:'));
      console.log(chalk.gray(`   Primary: ${style.synthesis.color.primary}`));
      console.log(chalk.gray(`   Accent: ${style.synthesis.color.accent}`));
      console.log(chalk.gray(`   Palette: ${style.synthesis.color.palette}\n`));

      console.log(chalk.bold('Layout:'));
      console.log(chalk.gray(`   Structure: ${style.synthesis.layout.structure}`));
      console.log(chalk.gray(`   Whitespace: ${style.synthesis.layout.whitespace}\n`));

      console.log(chalk.bold('Motion:'));
      console.log(chalk.gray(`   Energy: ${style.synthesis.motion.energy}`));
      console.log(chalk.gray(`   Style: ${style.synthesis.motion.style}\n`));

      console.log(chalk.bold('Personality:'));
      const axes = style.synthesis.personality;
      console.log(chalk.gray(`   Formal ↔ Playful: ${axes.formal_playful}`));
      console.log(chalk.gray(`   Traditional ↔ Modern: ${axes.traditional_modern}`));
      console.log(chalk.gray(`   Serious ↔ Friendly: ${axes.serious_friendly}\n`));

      console.log(chalk.bold('Keywords:'));
      console.log(chalk.cyan(`   ${style.synthesis.keywords.join(', ')}\n`));

      // Apply to config if requested
      if (options.apply) {
        const configPath = join(process.cwd(), 'moth.config.json');
        if (existsSync(configPath)) {
          learner.applyStyleToConfig(style, configPath);
          console.log(chalk.green('✓ Applied style to moth.config.json\n'));
        } else {
          console.log(chalk.yellow('moth.config.json not found. Run moth:init first.\n'));
        }
      } else {
        console.log(chalk.gray('Tip: Run with --apply to update your moth.config.json'));
        console.log(chalk.gray(`Style saved to: learned-styles/${styleName}.json\n`));
      }

    } catch (error) {
      spinner.fail('Learning failed');
      console.error(chalk.red(String(error)));
    }
  });

// --------------------------------------------------------------------------
// Styles Command
// --------------------------------------------------------------------------

program
  .command('styles')
  .description('List learned styles')
  .action(async () => {
    console.log(BANNER);
    console.log(TAGLINE);

    const openaiKey = process.env.OPENAI_API_KEY ?? '';
    const learner = createVisualLearner(
      openaiKey,
      join(process.cwd(), 'learned-styles')
    );

    const styles = learner.listStyles();

    if (styles.length === 0) {
      console.log(chalk.yellow('No learned styles yet.'));
      console.log(chalk.gray('Run `moth learn` to analyze reference images.\n'));
      return;
    }

    console.log(chalk.bold('📚 Learned Styles:\n'));

    for (const styleName of styles) {
      const style = learner.loadStyle(styleName);
      if (style) {
        console.log(chalk.cyan(`  • ${style.name}`));
        console.log(chalk.gray(`    ${style.sourceImages.length} images · ${style.synthesis.keywords.slice(0, 3).join(', ')}`));
        console.log();
      }
    }
  });

// ============================================================================
// Run CLI
// ============================================================================

program.parse();

