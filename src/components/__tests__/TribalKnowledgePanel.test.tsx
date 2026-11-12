import { render, screen } from "@testing-library/react";

const entryListProps: unknown[] = [];
jest.mock("../memory/EntryListPanel", () => ({
  EntryListPanel: (props: unknown) => {
    entryListProps.push(props);
    return <div data-testid="entry-list" />;
  },
}));

import TribalKnowledgePanel from "@/components/memory/TribalKnowledgePanel";

describe("TribalKnowledgePanel", () => {
  it("lists tribal knowledge only — no preferences or agent learning", () => {
    render(<TribalKnowledgePanel />);
    expect(screen.getByTestId("entry-list")).toBeInTheDocument();
    expect(screen.queryByText(/preferences/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/agent learning/i)).not.toBeInTheDocument();
    expect(entryListProps).toEqual([
      { memoryType: "tribal_knowledge", canCreate: true, canEdit: true },
    ]);
  });
});
