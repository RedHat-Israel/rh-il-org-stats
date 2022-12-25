const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const octokitGql = require('@octokit/graphql');

const readRelative = path =>
  readFileSync(join(__dirname, path), 'utf8');

// QUERIES
const fragment = readRelative('./members.fragment.graphql');
const initialQuery = [readRelative('./initial.query.graphql'), fragment].join('\n');
const followupQuery = [readRelative('./followup.query.graphql'), fragment].join('\n');

// VARIABLES
/** Fetch data for redhat israels github org */
const org = 'RedHat-Israel';
/** Max members per query for avoiding gh internal timeouts, multiple queries will be performed */
const maxMembers = 10;
/** @see https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql */
const headers = { authorization: `bearer ${process.env.ORG_GITHUB_TOKEN}` };
const graphql = octokitGql.graphql.defaults({ headers });

async function getStatsForOrgMembers(query, variables = {}, summary = {
  totalCommitContributions: 0,
  totalIssueContributions: 0,
  totalPullRequestContributions: 0,
  totalPullRequestReviewContributions: 0,
  totalRepositoryContributions: 0,
  totalGists: 0
}) {
  const result = await graphql({ query, org, maxMembers, ...variables });

  result?.organization?.membersWithRole?.edges
    ?.forEach(edge => {
      summary.totalCommitContributions +=
        edge.node.contributionsCollection.totalCommitContributions;
      summary.totalIssueContributions +=
        edge.node.contributionsCollection.totalIssueContributions;
      summary.totalPullRequestContributions +=
        edge.node.contributionsCollection.totalPullRequestContributions;
      summary.totalPullRequestReviewContributions +=
        edge.node.contributionsCollection.totalPullRequestReviewContributions;
      summary.totalRepositoryContributions +=
        edge.node.contributionsCollection.totalRepositoryContributions;
      summary.totalGists += edge.node.gists.totalCount;
    });

  if (!result?.organization?.membersWithRole?.pageInfo?.hasNextPage) {
    return summary;
  } else {
    const lastCursor = result.organization.membersWithRole.pageInfo.endCursor
    return getStatsForOrgMembers(followupQuery, { lastCursor }, summary);
  }
}

module.exports = function() {
  getStatsForOrgMembers(initialQuery)
    .then(r => writeFileSync("src/resources/contributions.json", JSON.stringify(r, null, 2)));
}
