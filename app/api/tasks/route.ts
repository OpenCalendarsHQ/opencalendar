import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskProviders, events, calendars, calendarAccounts } from "@/lib/db/schema";
import { verifyRequest } from "@/lib/auth/verify-request";
import { eq, isNull, and, desc } from "drizzle-orm";

// GET /api/tasks - Fetch all tasks for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get("includeCompleted") === "true";

    // Fetch tasks with provider information
    const userTasks = await db
      .select({
        id: tasks.id,
        providerId: tasks.providerId,
        providerName: taskProviders.name,
        providerType: taskProviders.provider,
        externalId: tasks.externalId,
        externalUrl: tasks.externalUrl,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        labels: tasks.labels,
        assignees: tasks.assignees,
        scheduledEventId: tasks.scheduledEventId,
        scheduledAt: tasks.scheduledAt,
        providerData: tasks.providerData,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .innerJoin(taskProviders, eq(tasks.providerId, taskProviders.id))
      .where(
        and(
          eq(taskProviders.userId, user.id),
          eq(taskProviders.isActive, true),
          // Filter out completed tasks unless explicitly requested
          includeCompleted ? undefined : isNull(tasks.completedAt)
        )
      )
      .orderBy(desc(tasks.dueDate), desc(tasks.createdAt));

    return NextResponse.json({ tasks: userTasks });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Schedule a task or create a new task
export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const body = await request.json();
    const { action, taskId, eventData } = body;

    if (action === "schedule") {
      // Schedule an existing task by creating a calendar event
      if (!taskId || !eventData) {
        return NextResponse.json(
          { error: "Task ID and event data required" },
          { status: 400 }
        );
      }

      // Get the task
      const [task] = await db
        .select()
        .from(tasks)
        .innerJoin(taskProviders, eq(tasks.providerId, taskProviders.id))
        .where(and(eq(tasks.id, taskId), eq(taskProviders.userId, user.id)))
        .limit(1);

      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Get default calendar for tasks or user's first writable calendar
      let targetCalendarId = eventData.calendarId;

      // Verify the calendar exists and belongs to the user
      if (targetCalendarId && targetCalendarId !== "local") {
        const [calVerify] = await db
          .select({ id: calendars.id })
          .from(calendars)
          .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
          .where(
            and(
              eq(calendars.id, targetCalendarId),
              eq(calendarAccounts.userId, user.id)
            )
          );
        
        if (!calVerify) {
          targetCalendarId = null; // Reset to trigger fallback
        }
      }

      if (!targetCalendarId || targetCalendarId === "local") {
        const [calendar] = await db
          .select({ id: calendars.id })
          .from(calendars)
          .innerJoin(calendarAccounts, eq(calendars.accountId, calendarAccounts.id))
          .where(
            and(
              eq(calendarAccounts.userId, user.id),
              eq(calendars.isReadOnly, false)
            )
          )
          .orderBy(desc(calendarAccounts.provider)) // 'local' is high in descending order
          .limit(1);
        
        if (calendar) {
          targetCalendarId = calendar.id;
        }
      }

      if (!targetCalendarId || targetCalendarId === "local") {
        return NextResponse.json(
          { error: "Geen schrijfdbare kalender gevonden" },
          { status: 400 }
        );
      }

      // Create calendar event for the task
      const [event] = await db
        .insert(events)
        .values({
          calendarId: targetCalendarId,
          title: task.tasks.title,
          description: task.tasks.description || "",
          startTime: new Date(eventData.startTime),
          endTime: new Date(eventData.endTime),
          isAllDay: eventData.isAllDay || false,
          color: eventData.color || "#6366f1",
          status: "confirmed",
        })
        .returning();

      // Source URL: externe taak (Notion/GitHub) of OpenCalendar-URL voor handmatige taken
      const baseUrl = new URL(request.url).origin;
      const sourceUrl = task.tasks.externalUrl ?? `${baseUrl}/dashboard?eventId=${event.id}`;
      const descriptionWithSource = `${task.tasks.description || ""}\n\nSource: ${sourceUrl}`;

      // Update event description met source URL
      await db
        .update(events)
        .set({ description: descriptionWithSource })
        .where(eq(events.id, event.id));

      // Link task to event + update externalUrl voor handmatige taken
      await db
        .update(tasks)
        .set({
          scheduledEventId: event.id,
          scheduledAt: new Date(),
          ...(task.tasks.externalUrl ? {} : { externalUrl: sourceUrl }),
        })
        .where(eq(tasks.id, taskId));

      return NextResponse.json({ success: true, event: { ...event, description: descriptionWithSource } });
    }

    if (action === "create") {
      // Create a new manual task
      const { title, description, dueDate } = body;

      if (!title || !title.trim()) {
        return NextResponse.json(
          { error: "Task title required" },
          { status: 400 }
        );
      }

      // Get or create manual provider for user
      let manualProvider = await db
        .select()
        .from(taskProviders)
        .where(
          and(
            eq(taskProviders.userId, user.id),
            eq(taskProviders.provider, "manual")
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!manualProvider) {
        // Auto-create manual provider
        [manualProvider] = await db
          .insert(taskProviders)
          .values({
            userId: user.id,
            provider: "manual",
            name: "Handmatige taken",
            isActive: true,
          })
          .returning();
      }

      // Create manual task
      const [task] = await db
        .insert(tasks)
        .values({
          providerId: manualProvider.id,
          title: title.trim(),
          description: description?.trim() || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: "todo",
        })
        .returning();

      return NextResponse.json({ success: true, task });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process task action:", error);
    return NextResponse.json(
      { error: "Failed to process task action" },
      { status: 500 }
    );
  }
}

// PUT /api/tasks - Update a task (manual, toggle completion, or Notion status)
export async function PUT(request: NextRequest) {
  try {
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const body = await request.json();
    const { id, title, description, status, completed } = body;

    if (!id) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    // Get task with provider info
    const [existing] = await db
      .select()
      .from(tasks)
      .innerJoin(taskProviders, eq(tasks.providerId, taskProviders.id))
      .where(
        and(
          eq(tasks.id, id),
          eq(taskProviders.userId, user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Handle completion toggle (all task types)
    if (completed !== undefined) {
      updateData.completedAt = completed ? new Date() : null;
      // Also update status string if it's a manual task
      if (existing.task_providers.provider === "manual") {
        updateData.status = completed ? "Done" : "Todo";
      }
    }

    // Handle status updates and sync back
    if (status !== undefined) {
      const statusStr = typeof status === "string" ? status : String(status ?? "");
      updateData.status = statusStr;
      const statusLower = statusStr.toLowerCase();
      const isDoneStatus = ["done", "completed", "closed", "gereed", "voltooid", "klaar", "finished"].includes(statusLower);
      
      // Sync completion state with status
      if (isDoneStatus && !existing.tasks.completedAt) {
        updateData.completedAt = new Date();
      } else if (!isDoneStatus && existing.tasks.completedAt) {
        updateData.completedAt = null;
      }
    }

    // Handle manual task updates
    if (existing.task_providers.provider === "manual") {
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = (description || "").trim();
    }

    // Handle Notion status updates
    if (existing.task_providers.provider === "notion" && status !== undefined) {
      const statusStr = typeof status === "string" ? status : String(status ?? "");
      // Update via Notion API
      try {
        const { decrypt } = await import("@/lib/encryption");
        const accessToken = decrypt(existing.task_providers.accessToken!);

        const response = await fetch(`https://api.notion.com/v1/pages/${existing.tasks.externalId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              Status: {
                status: {
                  name: statusStr,
                },
              },
            },
          }),
        });

        if (response.ok) {
          updateData.status = statusStr;
        } else {
          console.error("Failed to update Notion task:", await response.text());
          return NextResponse.json(
            { error: "Failed to update in Notion" },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error("Error updating Notion task:", error);
        return NextResponse.json(
          { error: "Failed to update in Notion" },
          { status: 500 }
        );
      }
    }

    // Update task in database
    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    return NextResponse.json({ success: true, task: updated });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/:id - Unschedule or delete a task
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await verifyRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");
    const action = searchParams.get("action") || "unschedule";

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID required" },
        { status: 400 }
      );
    }

    // Get the task
    const [task] = await db
      .select()
      .from(tasks)
      .innerJoin(taskProviders, eq(tasks.providerId, taskProviders.id))
      .where(and(eq(tasks.id, taskId), eq(taskProviders.userId, user.id)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // If action is delete and task is manual, permanently delete it
    if (action === "delete" && task.task_providers.provider === "manual") {

      // Delete linked calendar event if exists
      if (task.tasks.scheduledEventId) {
        await db.delete(events).where(eq(events.id, task.tasks.scheduledEventId));
      }

      // Delete the task itself
      await db.delete(tasks).where(eq(tasks.id, taskId));

      return NextResponse.json({ success: true, deleted: true });
    }

    // Default behavior: unschedule (for provider tasks or if action=unschedule)
    // If task has a scheduled event, delete it
    if (task.tasks.scheduledEventId) {
      await db.delete(events).where(eq(events.id, task.tasks.scheduledEventId));
    }

    // Unlink task from event
    await db
      .update(tasks)
      .set({
        scheduledEventId: null,
        scheduledAt: null,
      })
      .where(eq(tasks.id, taskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete/unschedule task:", error);
    return NextResponse.json(
      { error: "Failed to delete/unschedule task" },
      { status: 500 }
    );
  }
}
