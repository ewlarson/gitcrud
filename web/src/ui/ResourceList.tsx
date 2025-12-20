import React, { useEffect, useState, useCallback } from "react";
import { Resource } from "../aardvark/model";
import { searchResources, SearchResult } from "../duckdb/duckdbClient";
import { ProjectConfig } from "../github/client";

interface ResourceListProps {
    project: ProjectConfig | null;
    resourceCount: number;
    onEdit: (id: string) => void;
    onCreate: () => void;
    onRefreshProject: () => void;
}

export const ResourceList: React.FC<ResourceListProps> = ({
    project,
    resourceCount,
    onEdit,
    onCreate,
    onRefreshProject,
}) => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Search/Sort/Page State
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState("id");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search change
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // If no project, we might still have data in DuckDB (from parquet load)
            const res: SearchResult = await searchResources(
                page,
                pageSize,
                sortBy,
                sortOrder,
                debouncedSearch
            );
            setResources(res.resources);
            setTotal(res.total);
        } catch (err) {
            console.error("Failed to fetch resources", err);
            setResources([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, sortBy, sortOrder, debouncedSearch, project, resourceCount]); // re-fetch if count changes


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="flex h-full flex-col">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-slate-100">Resources</h2>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        {total} total
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search resources..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                        onClick={onCreate}
                        disabled={!project}
                        className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create New
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow">
                    <table className="min-w-full divide-y divide-slate-800">
                        <thead className="bg-slate-950">
                            <tr>
                                <SortHeader
                                    label="ID"
                                    column="id"
                                    currentSort={sortBy}
                                    sortOrder={sortOrder}
                                    onClick={handleSort}
                                />
                                <SortHeader
                                    label="Title"
                                    column="dct_title_s"
                                    currentSort={sortBy}
                                    sortOrder={sortOrder}
                                    onClick={handleSort}
                                />
                                <SortHeader
                                    label="Class"
                                    column="gbl_resourceClass_sm"
                                    currentSort={sortBy}
                                    sortOrder={sortOrder}
                                    onClick={handleSort}
                                />
                                <SortHeader
                                    label="Access"
                                    column="dct_accessRights_s"
                                    currentSort={sortBy}
                                    sortOrder={sortOrder}
                                    onClick={handleSort}
                                />
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : resources.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                                        No resources found.
                                    </td>
                                </tr>
                            ) : (
                                resources.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-800/50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-300">
                                            {r.id}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-100 font-medium">
                                            {r.dct_title_s || <span className="text-slate-600 italic">Untitled</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {r.gbl_resourceClass_sm.map(c => (
                                                <span key={c} className="mr-1 inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                                                    {c}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${r.dct_accessRights_s === "Public"
                                                ? "bg-emerald-900/30 text-emerald-400"
                                                : "bg-amber-900/30 text-amber-400"
                                                }`}>
                                                {r.dct_accessRights_s}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <button
                                                onClick={() => onEdit(r.id)}
                                                className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/50 px-4 py-3">
                <div className="text-sm text-slate-400">
                    Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(page * pageSize, total)}</span> of{" "}
                    <span className="font-medium">{total}</span> results
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

const SortHeader: React.FC<{
    label: string;
    column: string;
    currentSort: string;
    sortOrder: "asc" | "desc";
    onClick: (col: string) => void;
}> = ({ label, column, currentSort, sortOrder, onClick }) => {
    return (
        <th
            className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => onClick(column)}
        >
            <div className="flex items-center gap-1">
                {label}
                {currentSort === column && (
                    <span className="text-indigo-400">
                        {sortOrder === "asc" ? "▲" : "▼"}
                    </span>
                )}
            </div>
        </th>
    );
};
