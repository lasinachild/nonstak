const axios = require('axios');
const readline = require('readline');
const randomUseragent = require('random-useragent');

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`=============================================`);
    console.log(`      NOS Auto Bot - Airdrop Insiders       `);
    console.log(`=============================================${colors.reset}\n`);
  },
};

const BASE_URL = 'https://speedrun.enso.build/api';
const PAGES = [1, 2, 3, 4, 5, 6, 7];
const LIMIT = 10;
const DELAY_MS = 1000; 

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (query) =>
  new Promise((resolve) => rl.question(`${colors.cyan}[?] ${query}${colors.reset}`, resolve));

const isValidEthAddress = (address) =>
  /^0x[a-fA-F0-9]{40}$/.test(address);

const isValidUUID = (uuid) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

const getHeaders = () => ({
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.6',
  'content-type': 'application/json',
  'priority': 'u=1, i',
  'sec-ch-ua': randomUseragent.getRandom(), 
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'sec-gpc': '1',
  'Referer': 'https://speedrun.enso.build/apps',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const showLoading = (msg) => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`${colors.cyan}[${frames[i++ % frames.length]}] ${msg}\r${colors.reset}`);
  }, 100);
  return () => clearInterval(interval);
};

async function fetchCampaigns(page, userId, headers) {
  const stopLoading = showLoading(`Fetching campaigns for page ${page}...`);
  try {
    const response = await axios.get(`${BASE_URL}/get-campaigns`, {
      params: { page, limit: LIMIT, userId },
      headers,
    });
    stopLoading();
    logger.success(`Fetched campaigns for page ${page}`);
    return response.data;
  } catch (error) {
    stopLoading();
    logger.error(`Failed to fetch campaigns for page ${page}: ${error.message}`);
    return null;
  }
}

async function completeCampaign(campaignId, userId, zealyUserId, headers) {
  const stopLoading = showLoading(`Completing campaign ${campaignId}...`);
  try {
    const response = await axios.post(
      `${BASE_URL}/track-campaign`,
      { userId, campaignId, zealyUserId },
      { headers }
    );
    stopLoading();
    logger.success(`Campaign ${campaignId} completed`);
    return true;
  } catch (error) {
    stopLoading();
    logger.error(`Failed to complete campaign ${campaignId}: ${error.message}`);
    return false;
  }
}

async function main() {
  logger.banner();

  let userId = await prompt('Enter your User ID (Ethereum address): ');
  userId = userId.trim();
  if (!isValidEthAddress(userId)) {
    logger.error('Invalid Ethereum address. Exiting...');
    rl.close();
    return;
  }

  let zealyUserId = await prompt('Enter your Zealy User ID (UUID): ');
  zealyUserId = zealyUserId.trim();
  if (!isValidUUID(zealyUserId)) {
    logger.error('Invalid Zealy User ID format. Exiting...');
    rl.close();
    return;
  }

  logger.info(`Starting bot with User ID: ${userId}`);
  logger.info(`Zealy User ID: ${zealyUserId}\n`);

  const headers = getHeaders();
  logger.step(`Using User-Agent: ${headers['sec-ch-ua']}\n`);

  for (const page of PAGES) {
    logger.step(`Processing page ${page}...`);
    const data = await fetchCampaigns(page, userId, headers);

    if (!data || !data.campaigns) {
      logger.warn(`No campaigns found for page ${page}. Skipping...`);
      continue;
    }

    const campaigns = data.campaigns;

    for (const campaign of campaigns) {
      const { id, name, pointsAwarded } = campaign;

      if (pointsAwarded) {
        logger.info(`Campaign ${id} (${name}) already completed. Skipping...`);
        continue;
      }

      logger.step(`Attempting to complete campaign ${id} (${name})...`);
      const success = await completeCampaign(id, userId, zealyUserId, headers);

      if (!success) {
        logger.warn(`Failed to complete campaign ${id}. Continuing...`);
      }

      await delay(DELAY_MS);
    }

    await delay(DELAY_MS);
  }

  logger.success('All campaigns processed successfully.');
  rl.close();
}

main().catch((error) => {
  logger.error(`Bot encountered an error: ${error.message}`);
  rl.close();
});