import React, { useEffect, useState } from "react";
import { Resource, resourceToJson, REPEATABLE_STRING_FIELDS, Distribution } from "../aardvark/model";
// GithubClient imports removed
import { getDuckDbContext, queryResources, queryResourceById, exportDbBlob, saveDb, upsertResource, queryDistributionsForResource, exportAardvarkJsonZip } from "../duckdb/duckdbClient";
import { TabularEditor } from "./TabularEditor";
import { TagInput } from "./TagInput";
import { ResourceList } from "./ResourceList";
import { ImportPage } from "./ImportPage";
import { ResourceEdit } from "./ResourceEdit";
import { DistributionsList } from "./DistributionsList";
import { Dashboard } from "./Dashboard";


export const App: React.FC = () => {
  // Local state only
  const [resourceCount, setResourceCount] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [editingDistributions, setEditingDistributions] = useState<Distribution[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isExportingDuckDb, setIsExportingDuckDb] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [view, setView] = useState<"dashboard" | "admin" | "edit" | "create" | "import" | "distributions">("dashboard");
  const [status, setStatus] = useState<string>("Local Mode");

  // Refresh resource count from DuckDB
  async function refreshResourceCount() {
    try {
      const resources = await queryResources();
      setResourceCount(resources.length);
    } catch (err) {
      console.error("Failed to refresh resource count from DuckDB", err);
      setResourceCount(0);
    }
  }

  // Initial load
  useEffect(() => {
    // Just refresh count, data loading is handled by DuckDB client internals
    refreshResourceCount();
  }, []);


  async function handleExportDuckDb() {
    setIsExportingDuckDb(true);
    try {
      const blob = await exportDbBlob();
      if (!blob) throw new Error("Failed to export DB blob");

      // Download blob as file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "records.duckdb";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Failed to export DuckDB", err);
      alert(`Failed to export DuckDB: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExportingDuckDb(false);
    }
  }

  async function handleExportJsonZip() {
    setIsExportingJson(true);
    try {
      const blob = await exportAardvarkJsonZip();
      if (!blob) throw new Error("Failed to export JSON Zip");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aardvark-json-export.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export JSON Zip", err);
      alert(`Failed to export: ${err}`);
    } finally {
      setIsExportingJson(false);
    }
  }

  async function handleSave(resource: Resource, distributions: Distribution[]) {
    setIsSaving(true);
    setSaveError(null);
    try {
      // Verify ID presence
      if (!resource.id) throw new Error("ID is required");

      await upsertResource(resource, distributions);
      await refreshResourceCount();

      setView("dashboard");
      setEditing(null);
      setEditingDistributions([]);

    } catch (e: any) {
      console.error("Save failed", e);
      setSaveError(e.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleEditResource = async (id: string) => {
    const r = await queryResourceById(id);
    if (r) {
      const d = await queryDistributionsForResource(id);
      setEditing(r);
      setEditingDistributions(d);
      setSelectedId(id);
      setView("edit");
      setSaveError(null);
    }
  };

  const handleCreate = () => {
    setSelectedId(null);
    setEditing({
      id: "",
      dct_title_s: "",
      dct_accessRights_s: "Public",
      gbl_resourceClass_sm: ["Datasets"],
      gbl_mdVersion_s: "Aardvark",
      schema_provider_s: "",
      dct_issued_s: "",
      dct_alternative_sm: [],
      dct_description_sm: [],
      dct_language_sm: [],
      gbl_displayNote_sm: [],
      dct_creator_sm: [],
      dct_publisher_sm: [],
      gbl_resourceType_sm: [],
      dct_subject_sm: [],
      dcat_theme_sm: [],
      dcat_keyword_sm: [],
      dct_temporal_sm: [],
      gbl_dateRange_drsim: [],
      gbl_indexYear_im: null,
      dct_spatial_sm: [],
      locn_geometry: "",
      dcat_bbox: "",
      dcat_centroid: "",
      gbl_georeferenced_b: null,
      dct_identifier_sm: [],
      gbl_wxsIdentifier_s: "",
      dct_rights_sm: [],
      dct_rightsHolder_sm: [],
      dct_license_sm: [],
      pcdm_memberOf_sm: [],
      dct_isPartOf_sm: [],
      dct_source_sm: [],
      dct_isVersionOf_sm: [],
      dct_replaces_sm: [],
      dct_isReplacedBy_sm: [],
      dct_relation_sm: [],
      extra: {},
    });
    setEditingDistributions([]);
    setView("create");
    setSaveError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-lg">
            A
          </span>
          <div>
            <h1 className="text-lg font-semibold">Aardvark Metadata Studio</h1>
            <p className="text-xs text-slate-400">
              Local DuckDB Edition
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="text-[11px] text-slate-400">{status}</p>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setView("dashboard")}
              className={`rounded-md border px-2 py-1 text-[10px] ${view === "dashboard" ? "bg-slate-700 border-slate-600 text-white" : "border-slate-700 text-slate-200 hover:bg-slate-800/70"}`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setView("admin")}
              className={`rounded-md border px-2 py-1 text-[10px] ${view === "admin" ? "bg-slate-700 border-slate-600 text-white" : "border-slate-700 text-slate-200 hover:bg-slate-800/70"}`}
            >
              Admin List
            </button>
            <button
              type="button"
              onClick={() => setView("distributions")}
              className={`rounded-md border px-2 py-1 text-[10px] ${view === "distributions" ? "bg-slate-700 border-slate-600 text-white" : "border-slate-700 text-slate-200 hover:bg-slate-800/70"}`}
            >
              Distributions
            </button>
            <div className="w-[1px] h-6 bg-slate-800 mx-1"></div>
            <button
              type="button"
              onClick={() => setView("import")}
              className={`rounded-md border px-2 py-1 text-[10px] ${view === "import" ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 text-slate-200 hover:bg-slate-800/70"}`}
            >
              Import / Export
            </button>
            <button
              type="button"
              onClick={handleExportJsonZip}
              className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-emerald-400 border-emerald-900 hover:bg-emerald-900/20"
            >
              {isExportingJson ? "Zipping..." : "Export OGM JSONs"}
            </button>
            <button
              type="button"
              onClick={handleExportDuckDb}
              className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800/70"
            >
              Download DB
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 w-full mx-auto flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0 space-y-6">

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
            {view === "dashboard" && (
              <div className="flex flex-col h-full -m-6">
                <Dashboard
                  project={null}
                  onEdit={handleEditResource}
                  onCreate={handleCreate}
                />
              </div>
            )}

            {view === "admin" && (
              <ResourceList
                project={null}
                resourceCount={resourceCount}
                onEdit={handleEditResource}
                onCreate={handleCreate}
                onRefreshProject={refreshResourceCount}
              />
            )}

            {view === "distributions" && (
              <div className="flex flex-col h-full">
                <DistributionsList onEditResource={handleEditResource} />
              </div>
            )}

            {(view === "edit" || view === "create") && editing && (
              <ResourceEdit
                initialResource={editing}
                initialDistributions={editingDistributions}
                onSave={handleSave}
                onCancel={() => {
                  setView("dashboard");
                  setEditing(null);
                  setEditingDistributions([]);
                }}
                isSaving={isSaving}
                saveError={saveError}
              />
            )}

            {view === "import" && (
              <div className="flex flex-col h-full">
                <button
                  onClick={() => {
                    setView("dashboard");
                  }}
                  className="mb-4 self-start flex items-center gap-2 text-xs text-slate-400 hover:text-white"
                >
                  ← Back to Dashboard
                </button>
                <ImportPage />
              </div>
            )}

          </section>
        </div>
      </main >
    </div>
  );
};
