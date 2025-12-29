import React from "react";

export interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onChange }) => {
    const totalPages = Math.ceil(total / pageSize);
    if (total === 0) return null;

    return (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 px-4 py-3">
            <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to{" "}
                <span className="font-medium text-slate-900 dark:text-white">{Math.min(page * pageSize, total)}</span> of{" "}
                <span className="font-medium text-slate-900 dark:text-white">{total}</span> results
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 shadow-sm"
                >
                    Previous
                </button>
                <button
                    onClick={() => onChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 shadow-sm"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export interface SortHeaderProps {
    label: string;
    column: string;
    currentSort: string;
    sortOrder: "asc" | "desc";
    onClick: (col: string) => void;
}

export const SortHeader: React.FC<SortHeaderProps> = ({ label, column, currentSort, sortOrder, onClick }) => {
    return (
        <th
            className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            onClick={() => onClick(column)}
        >
            <div className="flex items-center gap-1">
                {label}
                {currentSort === column && (
                    <span className="text-indigo-600 dark:text-indigo-400">
                        {sortOrder === "asc" ? "▲" : "▼"}
                    </span>
                )}
            </div>
        </th>
    );
};

export const TableContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex-1 overflow-auto p-4">
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                    {children}
                </table>
            </div>
        </div>
    );
};
