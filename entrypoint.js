const { getCurrentBranch, getLastCommitAuthor, getLastCommitMessage } = require('./lib/git');
const { getLatestReleases, generateDraft, updateReleaseDescription } = require('./lib/github');
const {
  getCurrentVersion,
  incrementMinorVersion,
  getLastDraft,
  validateCommitMessage,
  formatMessageWithAuthor,
  generateNewReleaseDescription,
} = require('./lib/util');

const { releaseBranch, developmentBranch } = require('./lib/environment');

(async function entrypoint() {
  console.log('🖋 RELEASE NOTE SCRIBE 🖋');
  const currentBranch = await getCurrentBranch();
  if (![releaseBranch, developmentBranch].includes(currentBranch)) {
    console.log(
      `⏭ Skipping release note scribe because current branch ${currentBranch} not in the release branches: ${releaseBranch} or ${developmentBranch}`,
    );
    process.exit(78); // 78 is skip status on the checks API
  }

  if (currentBranch === developmentBranch) {
    // Edit / create draft release
    try {
      const versionBeingDrafted = incrementMinorVersion(await getCurrentVersion());
      let lastDraft = getLastDraft(await getLatestReleases());
      if (!lastDraft) {
        await generateDraft(versionBeingDrafted, currentBranch);
        lastDraft = getLastDraft(await getLatestReleases());
      }
      const message = formatMessageWithAuthor(
        await getLastCommitMessage(currentBranch),
        await getLastCommitAuthor(currentBranch),
      );
      validateCommitMessage(message, lastDraft.body);

      await updateReleaseDescription({
        version: versionBeingDrafted,
        releaseNotes: generateNewReleaseDescription(message, lastDraft.body),
        draftId: lastDraft.id,
        branch: currentBranch,
      });
    } catch (e) {
      console.log('🚨 Error on the release note scribe: ', e);
      process.exit(1);
    }
  }

  console.log('👌 Finished');
  process.exit(0);
}());
