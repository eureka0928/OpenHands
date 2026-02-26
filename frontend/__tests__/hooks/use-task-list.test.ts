import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskList } from "#/hooks/use-task-list";
import { useEventStore } from "#/stores/use-event-store";
import type { TaskTrackingObservation } from "#/types/core/observations";

function createTaskTrackingObservation(
  id: number,
  command: string,
  taskList: TaskTrackingObservation["extras"]["task_list"],
): TaskTrackingObservation {
  return {
    id,
    source: "agent",
    observation: "task_tracking",
    message: "Task tracking update",
    timestamp: `2025-07-01T00:00:0${id}Z`,
    cause: 0,
    content: "",
    extras: {
      command,
      task_list: taskList,
    },
  };
}

beforeEach(() => {
  useEventStore.setState({
    events: [],
    eventIds: new Set(),
    uiEvents: [],
  });
});

describe("useTaskList", () => {
  it("returns empty taskList and hasTaskList=false when no events exist", () => {
    const { result } = renderHook(() => useTaskList());

    expect(result.current.taskList).toEqual([]);
    expect(result.current.hasTaskList).toBe(false);
  });

  it("returns empty taskList when no task tracking observations exist", () => {
    useEventStore.setState({
      events: [
        {
          id: 1,
          source: "user",
          action: "message",
          args: { content: "Hello", image_urls: [], file_urls: [] },
          message: "Hello",
          timestamp: "2025-07-01T00:00:01Z",
        },
      ],
      eventIds: new Set([1]),
      uiEvents: [],
    });

    const { result } = renderHook(() => useTaskList());

    expect(result.current.taskList).toEqual([]);
    expect(result.current.hasTaskList).toBe(false);
  });

  it('returns the task list from a TaskTrackingObservation with command="plan"', () => {
    const tasks = [
      { id: "1", title: "First task", status: "todo" as const },
      { id: "2", title: "Second task", status: "in_progress" as const },
    ];
    const event = createTaskTrackingObservation(1, "plan", tasks);

    useEventStore.setState({
      events: [event],
      eventIds: new Set([1]),
      uiEvents: [event],
    });

    const { result } = renderHook(() => useTaskList());

    expect(result.current.taskList).toEqual(tasks);
    expect(result.current.hasTaskList).toBe(true);
  });

  it('ignores TaskTrackingObservation events with command !== "plan"', () => {
    const tasks = [{ id: "1", title: "First task", status: "todo" as const }];
    const event = createTaskTrackingObservation(1, "update", tasks);

    useEventStore.setState({
      events: [event],
      eventIds: new Set([1]),
      uiEvents: [event],
    });

    const { result } = renderHook(() => useTaskList());

    expect(result.current.taskList).toEqual([]);
    expect(result.current.hasTaskList).toBe(false);
  });

  it("returns the latest task list when multiple plan events exist", () => {
    const earlyTasks = [
      { id: "1", title: "First task", status: "todo" as const },
    ];
    const lateTasks = [
      { id: "1", title: "First task", status: "done" as const },
      { id: "2", title: "New task", status: "in_progress" as const },
    ];

    const event1 = createTaskTrackingObservation(1, "plan", earlyTasks);
    const event2 = createTaskTrackingObservation(2, "plan", lateTasks);

    useEventStore.setState({
      events: [event1, event2],
      eventIds: new Set([1, 2]),
      uiEvents: [event1, event2],
    });

    const { result } = renderHook(() => useTaskList());

    expect(result.current.taskList).toEqual(lateTasks);
    expect(result.current.hasTaskList).toBe(true);
  });

  it("updates when new events are added to the store", () => {
    const { result } = renderHook(() => useTaskList());

    expect(result.current.hasTaskList).toBe(false);

    const tasks = [{ id: "1", title: "New task", status: "todo" as const }];
    const event = createTaskTrackingObservation(1, "plan", tasks);

    act(() => {
      useEventStore.setState({
        events: [event],
        eventIds: new Set([1]),
        uiEvents: [event],
      });
    });

    expect(result.current.taskList).toEqual(tasks);
    expect(result.current.hasTaskList).toBe(true);
  });

  it("returns hasTaskList=false when the latest plan has an empty task list", () => {
    const event = createTaskTrackingObservation(1, "plan", []);

    useEventStore.setState({
      events: [event],
      eventIds: new Set([1]),
      uiEvents: [event],
    });

    const { result } = renderHook(() => useTaskList());

    expect(result.current.taskList).toEqual([]);
    expect(result.current.hasTaskList).toBe(false);
  });
});
