import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskProviders, events, calendars } from "@/lib/db/schema";
import { getUser } from "@/lib/auth/server";
import { eq, isNull, and, desc } from "drizzle-orm";

// GET /api/tasks - Fetch all tasks for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
          // Optionally filter out completed tasks
          isNull(tasks.completedAt)
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
    const user = await getUser();
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
      const [calendar] = await db
        .select()
        .from(calendars)
        .where(
          and(
            eq(calendars.isReadOnly, false),
            eq(calendars.isVisible, true)
          )
        )
        .limit(1);

      if (!calendar) {
        return NextResponse.json(
          { error: "No writable calendar found" },
          { status: 400 }
        );
      }

      // Create calendar event for the task
      const [event] = await db
        .insert(events)
        .values({
          calendarId: calendar.id,
          title: task.tasks.title,
          description: `${task.tasks.description || ""}\n\nSource: ${task.tasks.externalUrl}`,
          startTime: new Date(eventData.startTime),
          endTime: new Date(eventData.endTime),
          isAllDay: eventData.isAllDay || false,
          color: eventData.color || "#6366f1",
          status: "confirmed",
        })
        .returning();

      // Link task to event
      await db
        .update(tasks)
        .set({
          scheduledEventId: event.id,
          scheduledAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      return NextResponse.json({ success: true, event });
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

// PUT /api/tasks - Update a manual task
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    // Verify task ownership and is manual
    const [existing] = await db
      .select()
      .from(tasks)
      .innerJoin(taskProviders, eq(tasks.providerId, taskProviders.id))
      .where(
        and(
          eq(tasks.id, id),
          eq(taskProviders.userId, user.id),
          eq(taskProviders.provider, "manual")
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Task not found or not editable" },
        { status: 404 }
      );
    }

    // Update task
    const [updated] = await db
      .update(tasks)
      .set({
        title: title?.trim() || existing.tasks.title,
        description: description?.trim() || existing.tasks.description,
        status: status || existing.tasks.status,
        updatedAt: new Date(),
      })
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
    const user = await getUser();
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
    if (action === "delete" && task.taskProviders.provider === "manual") {
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
