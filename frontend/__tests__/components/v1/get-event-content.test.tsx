import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getEventContent } from "#/components/v1/chat";
import { ActionEvent, ObservationEvent, SecurityRisk } from "#/types/v1/core";

const terminalActionEvent: ActionEvent = {
  id: "action-1",
  timestamp: new Date().toISOString(),
  source: "agent",
  thought: [{ type: "text", text: "Checking repository status." }],
  thinking_blocks: [],
  action: {
    kind: "TerminalAction",
    command: "git status",
    is_input: false,
    timeout: null,
    reset: false,
  },
  tool_name: "terminal",
  tool_call_id: "tool-1",
  tool_call: {
    id: "tool-1",
    type: "function",
    function: {
      name: "terminal",
      arguments: '{"command":"git status"}',
    },
  },
  llm_response_id: "response-1",
  security_risk: SecurityRisk.LOW,
  summary: "Check repository status",
};

const terminalObservationEvent: ObservationEvent = {
  id: "obs-1",
  timestamp: new Date().toISOString(),
  source: "environment",
  tool_name: "terminal",
  tool_call_id: "tool-1",
  action_id: "action-1",
  observation: {
    kind: "TerminalObservation",
    content: [{ type: "text", text: "On branch main" }],
    command: "git status",
    exit_code: 0,
    is_error: false,
    timeout: false,
    metadata: {
      exit_code: 0,
      pid: 1,
      username: "openhands",
      hostname: "sandbox",
      prefix: "",
      suffix: "",
      working_dir: "/workspace/project/OpenHands",
      py_interpreter_path: null,
    },
  },
};

describe("getEventContent", () => {
  it("uses the action summary as the full action title", () => {
    const { title } = getEventContent(terminalActionEvent);

    render(<span>{title}</span>);

    expect(screen.getByText("Check repository status")).toBeInTheDocument();
    expect(screen.queryByText("$ git status")).not.toBeInTheDocument();
  });

  it("falls back to command-based title when summary is missing", () => {
    const actionWithoutSummary = { ...terminalActionEvent, summary: undefined };
    const { title } = getEventContent(actionWithoutSummary);

    render(<span>{title}</span>);

    // Without i18n loaded, the translation key renders as the raw key
    expect(screen.getByText("ACTION_MESSAGE$RUN")).toBeInTheDocument();
    expect(
      screen.queryByText("Check repository status"),
    ).not.toBeInTheDocument();
  });

  it("returns empty details for file view action instead of 'Unknown event'", () => {
    const fileViewAction: ActionEvent = {
      id: "action-2",
      timestamp: new Date().toISOString(),
      source: "agent",
      thought: [],
      thinking_blocks: [],
      action: {
        kind: "FileEditorAction",
        command: "view",
        path: "/workspace/README.md",
        file_text: null,
        old_str: null,
        new_str: null,
        insert_line: null,
        view_range: null,
      },
      tool_name: "file_editor",
      tool_call_id: "tool-2",
      tool_call: {
        id: "tool-2",
        type: "function",
        function: {
          name: "file_editor",
          arguments: '{"command":"view","path":"/workspace/README.md"}',
        },
      },
      llm_response_id: "response-2",
      security_risk: SecurityRisk.LOW,
    };

    const { title, details } = getEventContent(fileViewAction);

    render(<span>{title}</span>);
    expect(screen.getByText("ACTION_MESSAGE$READ")).toBeInTheDocument();
    expect(details).toBe("");
  });

  it("shows action kind for action-like events missing tool_name/tool_call_id", () => {
    // Simulate an event that has an action object but fails the strict isActionEvent() guard
    const malformedEvent = {
      id: "action-3",
      timestamp: new Date().toISOString(),
      source: "agent" as const,
      action: { kind: "FileEditorAction" },
    };

    const { title, details } = getEventContent(malformedEvent as any);

    expect(title).toBe("FILEEDITOR");
    expect(details).toBe("");
  });

  it("reuses the action summary as the full paired observation title", () => {
    const { title } = getEventContent(
      terminalObservationEvent,
      terminalActionEvent,
    );

    render(<span>{title}</span>);

    expect(screen.getByText("Check repository status")).toBeInTheDocument();
    expect(screen.queryByText("$ git status")).not.toBeInTheDocument();
  });

  describe("delegate events", () => {
    const delegateActionEvent: ActionEvent = {
      id: "action-delegate-1",
      timestamp: new Date().toISOString(),
      source: "agent",
      thought: [{ type: "text", text: "I need help browsing." }],
      thinking_blocks: [],
      action: {
        kind: "AgentDelegateAction",
        agent: "BrowsingAgent",
        inputs: { task: "Search for documentation" },
        thought: "I need help browsing.",
      },
      tool_name: "delegate",
      tool_call_id: "tool-delegate-1",
      tool_call: {
        id: "tool-delegate-1",
        type: "function",
        function: {
          name: "delegate",
          arguments: '{"agent":"BrowsingAgent"}',
        },
      },
      llm_response_id: "response-delegate-1",
      security_risk: SecurityRisk.LOW,
    };

    const delegateObservationEvent: ObservationEvent = {
      id: "obs-delegate-1",
      timestamp: new Date().toISOString(),
      source: "environment",
      tool_name: "delegate",
      tool_call_id: "tool-delegate-1",
      action_id: "action-delegate-1",
      observation: {
        kind: "AgentDelegateObservation",
        content: "Browsing completed.",
        outputs: { result: "Found the documentation page." },
      },
    };

    it("shows delegate action title with agent name", () => {
      const { title } = getEventContent(delegateActionEvent);

      render(<span>{title}</span>);
      expect(
        screen.getByText("ACTION_MESSAGE$DELEGATE"),
      ).toBeInTheDocument();
    });

    it("shows delegate action details with agent and task", () => {
      const { details } = getEventContent(delegateActionEvent);

      expect(details).toContain("**Agent:** BrowsingAgent");
      expect(details).toContain("**Task:** Search for documentation");
    });

    it("shows delegate observation title", () => {
      const { title } = getEventContent(delegateObservationEvent);

      render(<span>{title}</span>);
      expect(
        screen.getByText("OBSERVATION_MESSAGE$DELEGATE"),
      ).toBeInTheDocument();
    });

    it("shows delegate observation details with outputs", () => {
      const { details } = getEventContent(delegateObservationEvent);

      expect(details).toContain("**Result:**");
      expect(details).toContain("Found the documentation page.");
    });
  });
});
