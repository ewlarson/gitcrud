import React from "react";
import AsyncCreatableSelect from "react-select/async-creatable";
import { getDistinctValues } from "../duckdb/duckdbClient";

interface TagInputProps {
    value: string[];
    onChange: (newValue: string[]) => void;
    fieldName: string;
    placeholder?: string;
}

interface Option {
    label: string;
    value: string;
}

export const TagInput: React.FC<TagInputProps> = ({
    value,
    onChange,
    fieldName,
    placeholder,
}) => {
    const loadOptions = async (inputValue: string): Promise<Option[]> => {
        try {
            const values = await getDistinctValues(fieldName, inputValue);
            return values.map((v) => ({ label: v, value: v }));
        } catch (err) {
            console.warn("Failed to load options for", fieldName, err);
            return [];
        }
    };

    const handleChange = (
        newValue: readonly Option[] | null
    ) => {
        if (!newValue) {
            onChange([]);
            return;
        }
        onChange(newValue.map((o) => o.value));
    };

    const currentOptions: Option[] = value.map((v) => ({ label: v, value: v }));

    return (
        <AsyncCreatableSelect
            isMulti
            cacheOptions
            defaultOptions
            loadOptions={loadOptions}
            value={currentOptions}
            onChange={handleChange}
            placeholder={placeholder || "Select or type to create..."}
            classNames={{
                control: (state) =>
                    `!bg-white dark:!bg-slate-950 !border-gray-300 dark:!border-slate-700 !rounded-md !min-h-[38px] ${state.isFocused ? "!border-indigo-500 !ring-1 !ring-indigo-500" : ""
                    }`,
                menu: () => "!bg-white dark:!bg-slate-900 !border !border-gray-200 dark:!border-slate-700 !rounded-md !mt-1 !shadow-lg",
                option: (state) =>
                    `!cursor-pointer ${state.isFocused ? "!bg-gray-100 dark:!bg-slate-800" : "!bg-white dark:!bg-slate-900"
                    } !text-slate-900 dark:!text-slate-200`,
                multiValue: () => "!bg-indigo-50 dark:!bg-indigo-900/50 !rounded",
                multiValueLabel: () => "!text-indigo-700 dark:!text-indigo-200 !text-xs",
                multiValueRemove: () =>
                    "!text-indigo-500 dark:!text-indigo-300 hover:!bg-indigo-100 dark:hover:!bg-indigo-800 hover:!text-indigo-700 dark:hover:!text-white !rounded-r",
                input: () => "!text-slate-900 dark:!text-slate-100 !text-xs",
                placeholder: () => "!text-slate-400 dark:!text-slate-500 !text-xs",
            }}
            styles={{
                control: (base) => ({
                    ...base,
                    backgroundColor: 'transparent',
                    borderColor: 'inherit',
                    boxShadow: 'none',
                    '&:hover': {
                        borderColor: 'inherit'
                    }
                }),
                menu: (base) => ({
                    ...base,
                    zIndex: 50
                }),
                input: (base) => ({
                    ...base,
                    color: 'inherit'
                }),
                singleValue: (base) => ({
                    ...base,
                    color: 'inherit'
                })
            }}
            formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
        />
    );
};
