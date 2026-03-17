"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Check, X } from "lucide-react";

interface BaseProps {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  highlight?: boolean;
}

interface TextProps extends BaseProps {
  type: "text";
}

interface DateProps extends BaseProps {
  type: "date";
}

interface SelectProps extends BaseProps {
  type: "select";
  options: string[];
}

interface ToggleProps extends BaseProps {
  type: "toggle";
  options?: [string, string]; // [trueLabel, falseLabel]
}

type Props = TextProps | DateProps | SelectProps | ToggleProps;

export function InlineEditField(props: Props) {
  const { label, value, type, onSave, highlight } = props;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  // Sync editValue when value prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = useCallback(() => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setEditing(false);
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (!editing) {
    return (
      <div>
        <p className="text-xs text-muted-custom mb-0.5">{label}</p>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm ${
              highlight ? "text-critical font-semibold" : "text-foreground"
            }`}
          >
            {value}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-muted-custom hover:text-accent-red hover:scale-110 transition-all cursor-pointer"
            title={`${label} 수정`}
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Toggle type
  if (type === "toggle") {
    const trueLabel = (props as ToggleProps).options?.[0] ?? "예";
    const falseLabel = (props as ToggleProps).options?.[1] ?? "아니오";
    return (
      <div>
        <p className="text-xs text-muted-custom mb-0.5">{label}</p>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border border-border-custom overflow-hidden">
            <button
              className={`px-2.5 py-1 text-xs transition-colors ${
                editValue === trueLabel
                  ? "bg-accent-red text-white"
                  : "bg-white text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setEditValue(trueLabel)}
            >
              {trueLabel}
            </button>
            <button
              className={`px-2.5 py-1 text-xs transition-colors ${
                editValue === falseLabel
                  ? "bg-accent-red text-white"
                  : "bg-white text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setEditValue(falseLabel)}
            >
              {falseLabel}
            </button>
          </div>
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-700 transition-colors"
            title="저장"
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="취소"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Select type
  if (type === "select") {
    const options = (props as SelectProps).options;
    return (
      <div>
        <p className="text-xs text-muted-custom mb-0.5">{label}</p>
        <div className="flex items-center gap-1.5">
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-sm border border-border-custom rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-accent-red"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-700 transition-colors"
            title="저장"
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="취소"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Text or date type
  return (
    <div>
      <p className="text-xs text-muted-custom mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type === "date" ? "date" : "text"}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm border border-border-custom rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-accent-red w-full max-w-[180px]"
        />
        <button
          onClick={handleSave}
          className="text-green-600 hover:text-green-700 transition-colors"
          title="저장"
        >
          <Check size={14} />
        </button>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="취소"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
