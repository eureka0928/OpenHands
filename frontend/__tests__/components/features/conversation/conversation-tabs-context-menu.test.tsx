import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationTabsContextMenu } from "#/components/features/conversation/conversation-tabs/conversation-tabs-context-menu";

const REAL_CONVERSATION_ID = "conv-abc123";

let mockConversationId = REAL_CONVERSATION_ID;

vi.mock("#/hooks/use-conversation-id", () => ({
  useConversationId: () => ({ conversationId: mockConversationId }),
}));

let mockHasTaskList = false;
vi.mock("#/hooks/use-task-list", () => ({
  useTaskList: () => ({
    hasTaskList: mockHasTaskList,
    taskList: [],
  }),
}));

describe("ConversationTabsContextMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    mockConversationId = REAL_CONVERSATION_ID;
    mockHasTaskList = false;
  });

  it("should render nothing when isOpen is false", () => {
    const { container } = render(
      <ConversationTabsContextMenu isOpen={false} onClose={vi.fn()} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("should render all default tabs when open", () => {
    render(<ConversationTabsContextMenu isOpen={true} onClose={vi.fn()} />);

    const expectedTabs = [
      "COMMON$PLANNER",
      "COMMON$CHANGES",
      "COMMON$CODE",
      "COMMON$TERMINAL",
      "COMMON$APP",
      "COMMON$BROWSER",
    ];
    for (const tab of expectedTabs) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
  });

  it("should store unpinned tabs in localStorage", async () => {
    const user = userEvent.setup();

    render(<ConversationTabsContextMenu isOpen={true} onClose={vi.fn()} />);

    const terminalItem = screen.getByText("COMMON$TERMINAL");
    await user.click(terminalItem);

    const storedState = JSON.parse(
      localStorage.getItem(`conversation-state-${REAL_CONVERSATION_ID}`)!,
    );
    expect(storedState.unpinnedTabs).toContain("terminal");
  });

  it("should re-pin a tab when clicking an unpinned tab", async () => {
    const user = userEvent.setup();

    render(<ConversationTabsContextMenu isOpen={true} onClose={vi.fn()} />);

    const terminalItem = screen.getByText("COMMON$TERMINAL");

    // Unpin
    await user.click(terminalItem);
    let storedState = JSON.parse(
      localStorage.getItem(`conversation-state-${REAL_CONVERSATION_ID}`)!,
    );
    expect(storedState.unpinnedTabs).toContain("terminal");

    // Re-pin
    await user.click(terminalItem);
    storedState = JSON.parse(
      localStorage.getItem(`conversation-state-${REAL_CONVERSATION_ID}`)!,
    );
    expect(storedState.unpinnedTabs).not.toContain("terminal");
  });

  describe("with tasklist", () => {
    beforeEach(() => {
      mockHasTaskList = true;
    });

    it("should show tasklist in context menu when hasTaskList is true", () => {
      render(<ConversationTabsContextMenu isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText("COMMON$TASK_LIST")).toBeInTheDocument();
    });
  });
});
