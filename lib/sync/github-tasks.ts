import { db } from "@/lib/db";
import { taskProviders, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

export interface GitHubIssue {
  id: number;
  number: number;
  url: string;
  htmlUrl: string;
  title: string;
  body?: string;
  state: string;
  labels: string[];
  assignees: string[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  dueDate?: Date;
  repository: string;
}

/**
 * Sync issues from GitHub for a given provider
 */
export async function syncGitHubIssues(providerId: string): Promise<void> {
  console.log(`[GitHub] Starting sync for provider ${providerId}`);

  try {
    // Get provider with credentials
    const [provider] = await db
      .select()
      .from(taskProviders)
      .where(eq(taskProviders.id, providerId))
      .limit(1);

    if (!provider || !provider.accessToken) {
      throw new Error("Provider not found or no access token");
    }

    // Decrypt access token
    const accessToken = decrypt(provider.accessToken);

    // Get repositories from provider data
    const repositories = provider.providerData?.repositories as string[] | undefined;

    if (!repositories || repositories.length === 0) {
      console.warn("[GitHub] No repositories configured, syncing all assigned issues");
      // Sync all issues assigned to the authenticated user
      await syncUserIssues(providerId, accessToken);
    } else {
      // Sync issues from specific repositories
      for (const repo of repositories) {
        await syncRepositoryIssues(providerId, accessToken, repo);
      }
    }

    // Update last sync timestamp
    await db
      .update(taskProviders)
      .set({ lastSyncAt: new Date() })
      .where(eq(taskProviders.id, providerId));

    console.log(`[GitHub] Sync completed for provider ${providerId}`);
  } catch (error) {
    console.error(`[GitHub] Sync failed for provider ${providerId}:`, error);
    throw error;
  }
}

/**
 * Sync all issues assigned to the authenticated user
 */
async function syncUserIssues(providerId: string, accessToken: string): Promise<void> {
  console.log("[GitHub] Fetching issues assigned to user");

  const response = await fetch(
    "https://api.github.com/issues?filter=assigned&state=open&per_page=100",
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch GitHub issues: ${error}`);
  }

  const issues = await response.json();
  console.log(`[GitHub] Found ${issues.length} assigned issues`);

  for (const issue of issues) {
    try {
      const githubIssue = parseGitHubIssue(issue);
      await upsertTask(providerId, githubIssue);
    } catch (error) {
      console.error(`[GitHub] Failed to process issue ${issue.number}:`, error);
    }
  }
}

/**
 * Sync issues from a specific repository
 */
async function syncRepositoryIssues(
  providerId: string,
  accessToken: string,
  repository: string
): Promise<void> {
  console.log(`[GitHub] Fetching issues from repository ${repository}`);

  const response = await fetch(
    `https://api.github.com/repos/${repository}/issues?state=open&per_page=100`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch issues from ${repository}: ${error}`);
  }

  const issues = await response.json();
  console.log(`[GitHub] Found ${issues.length} issues in ${repository}`);

  for (const issue of issues) {
    try {
      // Skip pull requests (they appear in the issues API)
      if (issue.pull_request) {
        continue;
      }

      const githubIssue = parseGitHubIssue(issue);
      await upsertTask(providerId, githubIssue);
    } catch (error) {
      console.error(`[GitHub] Failed to process issue ${issue.number}:`, error);
    }
  }
}

/**
 * Parse a GitHub issue into a task
 */
function parseGitHubIssue(issue: any): GitHubIssue {
  const repository = issue.repository_url?.split("/repos/")[1] || "unknown";

  return {
    id: issue.id,
    number: issue.number,
    url: issue.url,
    htmlUrl: issue.html_url,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    labels: issue.labels?.map((label: any) => label.name) || [],
    assignees: issue.assignees?.map((assignee: any) => assignee.login) || [],
    createdAt: new Date(issue.created_at),
    updatedAt: new Date(issue.updated_at),
    closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
    dueDate: issue.milestone?.due_on ? new Date(issue.milestone.due_on) : undefined,
    repository,
  };
}

/**
 * Upsert a task into the database
 */
async function upsertTask(providerId: string, githubIssue: GitHubIssue): Promise<void> {
  await db
    .insert(tasks)
    .values({
      providerId,
      externalId: githubIssue.id.toString(),
      externalUrl: githubIssue.htmlUrl,
      title: `${githubIssue.repository}#${githubIssue.number}: ${githubIssue.title}`,
      description: githubIssue.body,
      status: githubIssue.state,
      dueDate: githubIssue.dueDate,
      labels: githubIssue.labels,
      assignees: githubIssue.assignees,
      completedAt: githubIssue.closedAt,
      providerData: {
        repository: githubIssue.repository,
        number: githubIssue.number,
        url: githubIssue.url,
      },
    })
    .onConflictDoUpdate({
      target: [tasks.providerId, tasks.externalId],
      set: {
        title: `${githubIssue.repository}#${githubIssue.number}: ${githubIssue.title}`,
        description: githubIssue.body,
        status: githubIssue.state,
        dueDate: githubIssue.dueDate,
        labels: githubIssue.labels,
        assignees: githubIssue.assignees,
        completedAt: githubIssue.closedAt,
        providerData: {
          repository: githubIssue.repository,
          number: githubIssue.number,
          url: githubIssue.url,
        },
        updatedAt: new Date(),
      },
    });
}

/**
 * Fetch user's repositories
 */
export async function fetchGitHubRepositories(
  accessToken: string
): Promise<Array<{ fullName: string; name: string; description?: string }>> {
  const response = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      console.error("[GitHub] Bad credentials, unauthorized");
      return []; // Return empty list instead of throwing to avoid 500
    }
    throw new Error(`Failed to fetch GitHub repositories: ${error}`);
  }

  const repos = await response.json();

  return repos.map((repo: any) => ({
    fullName: repo.full_name,
    name: repo.name,
    description: repo.description,
  }));
}
