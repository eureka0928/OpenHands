import { useMemo } from "react";
import { useEventStore } from "#/stores/use-event-store";
import { isTaskTrackingObservation } from "#/types/core/guards";
import type { OpenHandsParsedEvent } from "#/types/core";

export function useTaskList() {
  const events = useEventStore((state) => state.events);

  return useMemo(() => {
    // Iterate in reverse to find the latest TaskTrackingObservation with command="plan"
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const parsed = events[i] as OpenHandsParsedEvent;
      if (
        isTaskTrackingObservation(parsed) &&
        parsed.extras.command === "plan"
      ) {
        const { task_list: taskList } = parsed.extras;
        return { taskList, hasTaskList: taskList.length > 0 };
      }
    }

    return { taskList: [], hasTaskList: false };
  }, [events]);
}
