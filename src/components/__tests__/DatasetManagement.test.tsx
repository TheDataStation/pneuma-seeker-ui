import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    listDatasets: jest.fn(),
    getUploadLimits: jest.fn(),
    uploadDatasetFile: jest.fn(),
    testDatasetSource: jest.fn(),
    addDatasetSource: jest.fn(),
    updateDatasetSource: jest.fn(),
    getDatasetSource: jest.fn(),
    removeDataset: jest.fn(),
    rebuildDatasetIndex: jest.fn(),
    getDatasetIndexStatus: jest.fn(),
    deleteDatasetTable: jest.fn(),
    listDatasetTables: jest.fn(),
    queryDatasetTable: jest.fn(),
    uploadMemoryMetadataCsv: jest.fn(),
    getDatasetDescription: jest.fn(),
    updateDatasetDescription: jest.fn(),
    listMemoryEntries: jest.fn(),
  };
});

import { AddDatasetModal } from "@/components/datasets/AddDatasetModal";
import { DatasetIndexControl } from "@/components/datasets/DatasetIndexControl";
import DatasetManagementPanel from "@/components/datasets/DatasetManagementPanel";
import { UploadFilesForm, formatBytes } from "@/components/datasets/UploadFiles";
import * as api from "@/lib/api";

const mocked = api as unknown as Record<string, jest.Mock>;
const csv = (name: string, size = 10) => new File(["x".repeat(size)], name, { type: "text/csv" });

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getUploadLimits.mockResolvedValue({ max_file_bytes: 1024, accepted: [".csv"] });
  mocked.listDatasetTables.mockResolvedValue({ tables: [] });
  mocked.getDatasetDescription.mockResolvedValue({ dataset_name: "x", description: "" });
  mocked.getDatasetIndexStatus.mockResolvedValue({
    dataset_name: "x", method: "m1", state: "missing", built_at: null, error: null, progress: null,
  });
});

describe("UploadFilesForm", () => {
  it("creates the dataset with the first file and adds the rest", async () => {
    mocked.uploadDatasetFile.mockImplementation(async (_ds: string, file: File) => ({
      dataset_name: "sales",
      created_dataset: true,
      tables: [{ name: file.name.replace(".csv", ""), rows: 3, columns: 2, replaced: false }],
    }));
    const onUploaded = jest.fn();
    const user = userEvent.setup();
    render(<UploadFilesForm onUploaded={onUploaded} onClose={jest.fn()} />);

    await user.type(screen.getByLabelText("Dataset name"), "sales");
    await user.upload(screen.getByLabelText("Choose files to upload"), [csv("a.csv"), csv("b.csv")]);
    await user.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith("sales"));
    const calls = mocked.uploadDatasetFile.mock.calls.map((c) => [c[1].name, c[2].create, c[2].replace]);
    expect(calls).toEqual([["a.csv", true, false], ["b.csv", false, false]]);
  });

  it("asks before replacing an existing table", async () => {
    mocked.uploadDatasetFile
      .mockRejectedValueOnce(new (api.ApiError as unknown as new (s: number, m: string) => Error)(409, "Table(s) t already exist"))
      .mockResolvedValueOnce({ dataset_name: "ds", created_dataset: false, tables: [{ name: "t", rows: 1, columns: 1, replaced: true }] });
    const onUploaded = jest.fn();
    const user = userEvent.setup();
    render(<UploadFilesForm datasetName="ds" onUploaded={onUploaded} onClose={jest.fn()} />);

    await user.upload(screen.getByLabelText("Choose files to upload"), csv("t.csv"));
    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText(/already exist/)).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Replace table" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith("ds"));
    expect(mocked.uploadDatasetFile.mock.calls[1][2].replace).toBe(true);
  });

  it("marks files over the limit and rejects bad dataset names", async () => {
    const user = userEvent.setup();
    render(<UploadFilesForm onUploaded={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => expect(mocked.getUploadLimits).toHaveBeenCalled());
    await screen.findByText(/up to 1\.0 KB each/);
    await user.upload(screen.getByLabelText("Choose files to upload"), csv("big.csv", 2048));
    expect(screen.getByText(/too large/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Dataset name"), "Bad Name");
    expect(screen.getByText(/lowercase letters/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 ** 3)).toBe("5.0 GB");
  });
});

describe("AddDatasetModal", () => {
  it("tests and adds a Postgres connection", async () => {
    mocked.testDatasetSource.mockResolvedValue({ ok: true, error: null, table_count: 4 });
    mocked.addDatasetSource.mockResolvedValue({ name: "crm" });
    const onSaved = jest.fn();
    const user = userEvent.setup();
    render(<AddDatasetModal onClose={jest.fn()} onSaved={onSaved} />);

    await user.click(screen.getByRole("tab", { name: "Connect a source" }));
    await user.type(screen.getByLabelText("Name"), "crm");
    await user.type(screen.getByLabelText("Host"), "db.internal");
    await user.type(screen.getByLabelText("Database"), "crm");
    await user.type(screen.getByLabelText("User"), "reader");
    await user.click(screen.getByRole("button", { name: "Test connection" }));
    expect(await screen.findByText("Connected: 4 tables.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add dataset" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("crm"));
    expect(mocked.addDatasetSource).toHaveBeenCalledWith({
      name: "crm",
      connector_type: "postgres",
      config: { host: "db.internal", dbname: "crm", user: "reader" },
    });
  });

  it("edits a connection keeping the stored password when left blank", async () => {
    mocked.updateDatasetSource.mockResolvedValue({ name: "files" });
    const onSaved = jest.fn();
    const user = userEvent.setup();
    render(
      <AddDatasetModal
        existing={{
          name: "files", connector_type: "csv_dir", connector_label: "CSV folder", is_local: false,
          config: { path: "/data/a", file_pattern: "*.csv" }, health: { ok: true, error: null, table_count: 1 },
        }}
        onClose={jest.fn()}
        onSaved={onSaved}
      />,
    );
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    const path = screen.getByLabelText(/Folder on the server/);
    await user.clear(path);
    await user.type(path, "/data/b");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("files"));
    expect(mocked.updateDatasetSource).toHaveBeenCalledWith("files", { path: "/data/b", file_pattern: "*.csv" });
  });
});

describe("DatasetManagementPanel", () => {
  const datasets = [
    { name: "env", connector_type: "parquet_dir", connector_label: "Parquet folder", is_local: true },
    { name: "crm", connector_type: "postgres", connector_label: "Postgres", is_local: false },
  ];

  it("offers management only to those who can manage", async () => {
    mocked.listDatasets.mockResolvedValue({ datasets, can_manage: false });
    render(<DatasetManagementPanel />);
    expect(await screen.findByRole("heading", { name: "env" })).toBeInTheDocument();
    expect(screen.queryByText("+ Add dataset")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove dataset" })).not.toBeInTheDocument();
  });

  it("shows upload for local datasets, edit for connected ones, and removes", async () => {
    mocked.listDatasets.mockResolvedValue({ datasets, can_manage: true });
    mocked.removeDataset.mockResolvedValue(undefined);
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<DatasetManagementPanel />);

    expect(await screen.findByRole("button", { name: "Upload tables" })).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /crm/ }));
    expect(screen.getByRole("button", { name: "Edit connection" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload tables" })).not.toBeInTheDocument();

    mocked.listDatasets.mockResolvedValue({ datasets: [datasets[0]], can_manage: true });
    await user.click(screen.getByRole("button", { name: "Remove dataset" }));
    await waitFor(() => expect(mocked.removeDataset).toHaveBeenCalledWith("crm"));
    expect(await screen.findByText("Removed crm.")).toBeInTheDocument();
    const list = screen.getAllByRole("button").filter((b) => within(b).queryByText("Postgres"));
    expect(list).toHaveLength(0);
  });
});


describe("DatasetIndexControl", () => {
  it("rebuilds the index and shows when it was built", async () => {
    mocked.getDatasetIndexStatus
      .mockResolvedValueOnce({ dataset_name: "crm", method: "m1", state: "missing", built_at: null, error: null, progress: null })
      .mockResolvedValueOnce({ dataset_name: "crm", method: "m1", state: "building", built_at: null, error: null, progress: { done: 120, total: 1438 } })
      .mockResolvedValue({ dataset_name: "crm", method: "m1", state: "built", built_at: "2026-11-13T22:00:00+00:00", error: null, progress: null });
    mocked.rebuildDatasetIndex.mockResolvedValue({ started: true });
    const user = userEvent.setup();
    render(<DatasetIndexControl datasetName="crm" />);

    expect(await screen.findByText(/Not indexed yet/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Build Data Discovery Index" }));
    expect(mocked.rebuildDatasetIndex).toHaveBeenCalledWith("crm");
    expect(await screen.findByText("Building the index: 120 / 1,438 tables read.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "120");
    expect(await screen.findByText(/^Indexed /, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("shows a failed build", async () => {
    mocked.getDatasetIndexStatus.mockResolvedValue({
      dataset_name: "crm", method: "m1", state: "failed", built_at: null, error: "server unreachable", progress: null,
    });
    render(<DatasetIndexControl datasetName="crm" />);
    expect(await screen.findByText("Indexing failed: server unreachable")).toBeInTheDocument();
  });
});
