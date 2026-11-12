import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../lib/api", () => ({
  getDatasetDescription: jest.fn(),
  updateDatasetDescription: jest.fn(),
}));

import { DatasetDescription } from "@/components/datasets/DatasetDescription";
import { getDatasetDescription, updateDatasetDescription } from "@/lib/api";

const mockGet = getDatasetDescription as jest.Mock;
const mockUpdate = updateDatasetDescription as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("DatasetDescription", () => {
  it("shows the saved description", async () => {
    mockGet.mockResolvedValue({ dataset_name: "env", description: "Boston rainfall" });
    render(<DatasetDescription dataset="env" />);
    expect(await screen.findByText("Boston rainfall")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("env");
  });

  it("adds a description when there is none", async () => {
    mockGet.mockResolvedValue({ dataset_name: "env", description: "" });
    mockUpdate.mockResolvedValue({ dataset_name: "env", description: "Water quality data" });
    const user = userEvent.setup();
    render(<DatasetDescription dataset="env" />);

    await user.click(await screen.findByRole("button", { name: /add a description/i }));
    await user.type(screen.getByLabelText("Dataset description"), "  Water quality data ");
    await user.click(screen.getByRole("button", { name: /save description/i }));

    expect(mockUpdate).toHaveBeenCalledWith("env", "Water quality data");
    expect(await screen.findByText("Water quality data")).toBeInTheDocument();
  });

  it("edits and can clear an existing description", async () => {
    mockGet.mockResolvedValue({ dataset_name: "env", description: "Old" });
    mockUpdate.mockResolvedValue({ dataset_name: "env", description: "" });
    const user = userEvent.setup();
    render(<DatasetDescription dataset="env" />);

    await user.click(await screen.findByRole("button", { name: /edit description/i }));
    const box = screen.getByLabelText("Dataset description");
    expect(box).toHaveValue("Old");
    await user.clear(box);
    await user.click(screen.getByRole("button", { name: /save description/i }));

    expect(mockUpdate).toHaveBeenCalledWith("env", "");
    expect(await screen.findByRole("button", { name: /add a description/i })).toBeInTheDocument();
  });

  it("cancel discards the draft", async () => {
    mockGet.mockResolvedValue({ dataset_name: "env", description: "Kept" });
    const user = userEvent.setup();
    render(<DatasetDescription dataset="env" />);

    await user.click(await screen.findByRole("button", { name: /edit description/i }));
    await user.type(screen.getByLabelText("Dataset description"), " changed");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByText("Kept")).toBeInTheDocument();
  });

  it("shows an error when saving fails", async () => {
    mockGet.mockResolvedValue({ dataset_name: "env", description: "" });
    mockUpdate.mockRejectedValue(new Error("Access denied"));
    const user = userEvent.setup();
    render(<DatasetDescription dataset="env" />);

    await user.click(await screen.findByRole("button", { name: /add a description/i }));
    await user.type(screen.getByLabelText("Dataset description"), "x");
    await user.click(screen.getByRole("button", { name: /save description/i }));

    await waitFor(() => expect(screen.getByText("Access denied")).toBeInTheDocument());
  });
});
