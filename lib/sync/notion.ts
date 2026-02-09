import { db } from "@/lib/db";
import { taskProviders, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

export interface NotionTask {
  id: string;
  url: string;
  title: string;
  status?: string;
  dueDate?: Date;
  priority?: string;
  labels?: string[];
  description?: string;
}

/**
 * Sync tasks from Notion for a given provider
 */
export async function syncNotionTasks(providerId: string): Promise<void> {
  console.log(`[Notion] Starting sync for provider ${providerId}`);

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

    // Get the database ID from provider data
    const databaseId = provider.providerData?.databaseId as string | undefined;

    if (!databaseId) {
      console.warn("[Notion] No database ID configured for provider");
      // If no database is configured, we need to let the user select one
      // For now, we'll fetch all databases and use the first one
      const databases = await fetchNotionDatabases(accessToken);
      if (databases.length === 0) {
        throw new Error("No Notion databases found");
      }

      // Auto-select first database and update provider
      const firstDb = databases[0];
      await db
        .update(taskProviders)
        .set({
          providerData: {
            ...provider.providerData,
            databaseId: firstDb.id,
          },
        })
        .where(eq(taskProviders.id, providerId));

      // Use first database
      await syncNotionDatabase(providerId, accessToken, firstDb.id);
    } else {
      await syncNotionDatabase(providerId, accessToken, databaseId);
    }

    // Update last sync timestamp
    await db
      .update(taskProviders)
      .set({ lastSyncAt: new Date() })
      .where(eq(taskProviders.id, providerId));

    console.log(`[Notion] Sync completed for provider ${providerId}`);
  } catch (error) {
    console.error(`[Notion] Sync failed for provider ${providerId}:`, error);
    throw error;
  }
}

/**
 * Fetch all accessible Notion databases
 */
export async function fetchNotionDatabases(accessToken: string): Promise<Array<{ id: string; title: string }>> {
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: {
        property: "object",
        value: "database",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Notion databases: ${error}`);
  }

  const data = await response.json();

  return data.results.map((db: any) => ({
    id: db.id,
    title: db.title?.[0]?.plain_text || "Untitled Database",
  }));
}

/**
 * Sync tasks from a specific Notion database
 */
async function syncNotionDatabase(
  providerId: string,
  accessToken: string,
  databaseId: string
): Promise<void> {
  console.log(`[Notion] Fetching tasks from database ${databaseId}`);

  // Query the database for pages (tasks)
  const response = await fetch(
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
        // Optionally filter for incomplete tasks
        // filter: {
        //   property: "Status",
        //   status: {
        //     does_not_equal: "Done"
        //   }
        // }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to query Notion database: ${error}`);
  }

  const data = await response.json();
  const pages = data.results;

  console.log(`[Notion] Found ${pages.length} pages in database`);

  // Process each page as a task
  for (const page of pages) {
    try {
      // Log the first page to see structure
      if (pages.indexOf(page) === 0) {
        console.log("[Notion] First page structure:", JSON.stringify(page, null, 2));
      }
      const notionTask = parseNotionPage(page);
      await upsertTask(providerId, notionTask);
    } catch (error) {
      console.error(`[Notion] Failed to process page ${page.id}:`, error);
    }
  }
}

/**
 * Parse a Notion page into a task
 */
function parseNotionPage(page: any): NotionTask {
  const properties = page.properties;

  // Extract title - check both title type AND text properties
  let title = "Untitled Task";

  // Try common property names with title type
  const titleProp = properties.Name || properties.Title || properties.title || properties.name;
  if (titleProp?.title?.[0]?.plain_text) {
    title = titleProp.title[0].plain_text;
  } else {
    // Fallback 1: search for any property with type "title"
    for (const [key, prop] of Object.entries(properties)) {
      const property = prop as any;
      if (property?.type === "title" && property?.title?.[0]?.plain_text) {
        title = property.title[0].plain_text;
        break;
      }
    }
  }

  // Fallback 2: check for rich_text properties (like "Taaknaam")
  if (title === "Untitled Task") {
    const textProps = ["Taaknaam", "Name", "Title", "Naam", "Task", "Task Name"];
    for (const propName of textProps) {
      const prop = properties[propName] as any;
      if (prop?.rich_text?.[0]?.plain_text) {
        title = prop.rich_text[0].plain_text;
        break;
      }
    }
  }

  // If still no title, log for debugging
  if (title === "Untitled Task") {
    console.warn("[Notion] Could not find title property. Available properties:", Object.keys(properties));
    console.warn("[Notion] Full properties:", JSON.stringify(properties, null, 2));
  }

  // Extract status
  let status: string | undefined;
  const statusProp = properties.Status || properties.status;
  if (statusProp?.status?.name) {
    status = statusProp.status.name;
  } else if (statusProp?.select?.name) {
    status = statusProp.select.name;
  }

  // Extract due date
  let dueDate: Date | undefined;
  const dueDateProp = properties["Due Date"] || properties.Due || properties.due || properties["Due date"];
  if (dueDateProp?.date?.start) {
    dueDate = new Date(dueDateProp.date.start);
  }

  // Extract priority
  let priority: string | undefined;
  const priorityProp = properties.Priority || properties.priority;
  if (priorityProp?.select?.name) {
    priority = priorityProp.select.name;
  }

  // Extract labels/tags
  let labels: string[] = [];
  const labelsProp = properties.Tags || properties.tags || properties.Labels || properties.labels;
  if (labelsProp?.multi_select) {
    labels = labelsProp.multi_select.map((tag: any) => tag.name);
  }

  return {
    id: page.id,
    url: page.url,
    title,
    status,
    dueDate,
    priority,
    labels,
  };
}

/**
 * Upsert a task into the database
 */
async function upsertTask(providerId: string, notionTask: NotionTask): Promise<void> {
  await db
    .insert(tasks)
    .values({
      providerId,
      externalId: notionTask.id,
      externalUrl: notionTask.url,
      title: notionTask.title,
      description: notionTask.description,
      status: notionTask.status,
      priority: notionTask.priority,
      dueDate: notionTask.dueDate,
      labels: notionTask.labels,
    })
    .onConflictDoUpdate({
      target: [tasks.providerId, tasks.externalId],
      set: {
        title: notionTask.title,
        description: notionTask.description,
        status: notionTask.status,
        priority: notionTask.priority,
        dueDate: notionTask.dueDate,
        labels: notionTask.labels,
        updatedAt: new Date(),
      },
    });
}
